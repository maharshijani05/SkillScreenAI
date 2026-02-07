'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { Plus, Trash2, Edit, Eye, FileText } from 'lucide-react';

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experienceLevel: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAssessment, setGeneratingAssessment] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    objectiveCount: 5,
    subjectiveCount: 3,
    codingCount: 2,
    duration: 60,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'recruiter' && parsedUser.role !== 'admin') {
      router.push('/jobs');
      return;
    }

    setUser(parsedUser);
    fetchJobs();
  }, [router]);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs');
      setJobs(response.data.jobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/jobs', {
        title: formData.title,
        description: formData.description,
        assessmentConfig: {
          objectiveCount: formData.objectiveCount,
          subjectiveCount: formData.subjectiveCount,
          codingCount: formData.codingCount,
          duration: formData.duration,
        },
      });
      setJobs([...jobs, response.data.job]);
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        objectiveCount: 5,
        subjectiveCount: 3,
        codingCount: 2,
        duration: 60,
      });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create job');
    }
  };

  const handleGenerateAssessment = async (jobId: string) => {
    setGeneratingAssessment(jobId);
    try {
      await api.post(`/assessment/generate/${jobId}`);
      alert('Assessment generated successfully!');
      fetchJobs(); // Refresh to show updated status
    } catch (error: any) {
      if (error.response?.status === 429) {
        if (error.response?.data?.error === 'DAILY_QUOTA_EXCEEDED') {
          alert(`Daily API quota exceeded (20 requests/day on free tier).\n\nPlease try again tomorrow or upgrade your Gemini API plan.\n\nYou can still create jobs manually without AI parsing.`);
          setGeneratingAssessment(null);
        } else {
          const retryAfter = error.response?.data?.retryAfter || 60;
          alert(`Rate limit exceeded. The system is queuing your request and will retry automatically. This may take ${retryAfter} seconds. Please wait...`);
          // Don't clear generating state - let user know it's still processing
          setTimeout(() => setGeneratingAssessment(null), retryAfter * 1000);
        }
      } else {
        alert(error.response?.data?.message || 'Failed to generate assessment');
        setGeneratingAssessment(null);
      }
    } finally {
      // Clear after a delay to show it completed (only if not daily quota)
      if (error?.response?.data?.error !== 'DAILY_QUOTA_EXCEEDED') {
        setTimeout(() => setGeneratingAssessment(null), 2000);
      }
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      setJobs(jobs.filter((job) => job._id !== jobId));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete job');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Recruiter Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Job Postings</h2>
              <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            </div>

            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Job</CardTitle>
                  <CardDescription>Add a new job posting and generate assessments</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateJob} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Job Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Job Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={6}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="objectiveCount">Objective Questions</Label>
                        <Input
                          id="objectiveCount"
                          type="number"
                          value={formData.objectiveCount}
                          onChange={(e) => setFormData({ ...formData, objectiveCount: parseInt(e.target.value) })}
                          min={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subjectiveCount">Subjective Questions</Label>
                        <Input
                          id="subjectiveCount"
                          type="number"
                          value={formData.subjectiveCount}
                          onChange={(e) => setFormData({ ...formData, subjectiveCount: parseInt(e.target.value) })}
                          min={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="codingCount">Coding Questions</Label>
                        <Input
                          id="codingCount"
                          type="number"
                          value={formData.codingCount}
                          onChange={(e) => setFormData({ ...formData, codingCount: parseInt(e.target.value) })}
                          min={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                          min={1}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Create Job</Button>
                      <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {jobs.map((job) => (
                <Card key={job._id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {job.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {job.skills.map((skill, idx) => (
                                <span key={idx} className="px-2 py-1 bg-secondary rounded text-sm">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateAssessment(job._id)}
                          disabled={generatingAssessment === job._id}
                        >
                          <FileText className={`mr-2 h-4 w-4 ${generatingAssessment === job._id ? 'animate-spin' : ''}`} />
                          {generatingAssessment === job._id ? 'Generating...' : 'Generate Assessment'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/resumes/${job._id}`)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Resumes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/results/${job._id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Results
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteJob(job._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="results">
            <h2 className="text-2xl font-semibold mb-4">Assessment Results</h2>
            <p className="text-muted-foreground">Select a job to view results</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
