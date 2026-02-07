'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { FileText, LogOut } from 'lucide-react';

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experienceLevel: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role === 'recruiter' || parsedUser.role === 'admin') {
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
    fetchJobs();
  }, [router]);

  const fetchJobs = async () => {
    try {
      // For candidates, we'll need a public jobs endpoint or modify the backend
      // For now, using the same endpoint
      const response = await api.get('/jobs');
      setJobs(response.data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async (jobId: string) => {
    // Check if resume is uploaded
    try {
      const resumeResponse = await api.get(`/resume/candidate/${jobId}`);
      const resume = resumeResponse.data.resume;
      
      if (resume.screeningResult.status === 'approved') {
        router.push(`/jobs/${jobId}/assessment`);
      } else if (resume.screeningResult.status === 'rejected') {
        alert(`Application Rejected: ${resume.screeningResult.rejectionReason || 'Resume does not match requirements'}`);
      } else {
        alert('Resume is still being screened. Please wait for approval.');
      }
    } catch (error: any) {
      // Resume not uploaded, redirect to upload page
      if (error.response?.status === 404) {
        router.push(`/jobs/${jobId}/resume`);
      } else {
        router.push(`/jobs/${jobId}/resume`);
      }
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
          <h1 className="text-2xl font-bold">Available Jobs</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-4">
          {jobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No jobs available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => (
              <Card key={job._id}>
                <CardHeader>
                  <CardTitle>{job.title}</CardTitle>
                  <CardDescription>
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
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{job.description}</p>
                  <Button onClick={() => handleStartAssessment(job._id)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Start Assessment
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
