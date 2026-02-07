'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Plus,
  Trash2,
  Eye,
  FileText,
  Radio,
  Shield,
  Loader2,
  LogOut,
  Briefcase,
  BarChart3,
  X,
  EyeOff,
  UserCheck,
  Users,
} from 'lucide-react';

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experienceLevel: string;
  anonymousHiring: boolean;
  identitiesRevealed: boolean;
  shortlistedCandidates: string[];
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAssessment, setGeneratingAssessment] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'jobs' | 'results'>('jobs');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    objectiveCount: 5,
    subjectiveCount: 3,
    codingCount: 2,
    duration: 60,
    anonymousHiring: false,
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
        anonymousHiring: formData.anonymousHiring,
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
        anonymousHiring: false,
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
      fetchJobs();
      setTimeout(() => setGeneratingAssessment(null), 2000);
    } catch (error: any) {
      if (error.response?.status === 429) {
        if (error.response?.data?.error === 'DAILY_QUOTA_EXCEEDED') {
          alert('Daily API quota exceeded. Try again tomorrow or upgrade.');
        } else {
          const retryAfter = error.response?.data?.retryAfter || 60;
          alert(`Rate limit exceeded. Retrying in ${retryAfter}s...`);
          setTimeout(() => setGeneratingAssessment(null), retryAfter * 1000);
          return;
        }
      } else {
        alert(error.response?.data?.message || 'Failed to generate assessment');
      }
      setGeneratingAssessment(null);
    }
  };

  const handleToggleAnonymous = async (jobId: string) => {
    try {
      const response = await api.post(`/jobs/${jobId}/anonymous-toggle`);
      setJobs(jobs.map(j => j._id === jobId ? response.data.job : j));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to toggle anonymous hiring');
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
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#4a9eff]" />
        <span className="ml-2 text-[#a3a3a3] text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Nav */}
      <nav className="border-b border-[#2a2a2a] bg-[#0a0a0a] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="w-4 h-4 text-[#4a9eff]" />
            <h1 className="text-sm font-semibold text-[#e5e5e5]">
              Recruiter Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#a3a3a3]">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-[#2a2a2a]">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'jobs'
                ? 'border-[#4a9eff] text-[#e5e5e5]'
                : 'border-transparent text-[#a3a3a3] hover:text-[#e5e5e5]'
            }`}
          >
            Jobs
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'results'
                ? 'border-[#4a9eff] text-[#e5e5e5]'
                : 'border-transparent text-[#a3a3a3] hover:text-[#e5e5e5]'
            }`}
          >
            Results
          </button>
        </div>

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#e5e5e5]">
                Job Postings
              </h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded-lg hover:bg-[#3b8de6] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Job
              </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-[#e5e5e5]">
                    Create New Job
                  </h3>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateJob} className="space-y-4">
                  <div>
                    <label className="text-xs text-[#a3a3a3] block mb-1">
                      Job Title
                    </label>
                    <input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      required
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#a3a3a3] block mb-1">
                      Job Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={5}
                      required
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#4a9eff] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Objective Qs', key: 'objectiveCount' },
                      { label: 'Subjective Qs', key: 'subjectiveCount' },
                      { label: 'Coding Qs', key: 'codingCount' },
                      { label: 'Duration (min)', key: 'duration' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label className="text-xs text-[#a3a3a3] block mb-1">
                          {label}
                        </label>
                        <input
                          type="number"
                          value={(formData as any)[key]}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [key]: parseInt(e.target.value),
                            })
                          }
                          min={1}
                          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#4a9eff]"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Anonymous Hiring Toggle */}
                  <div className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, anonymousHiring: !formData.anonymousHiring })
                      }
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        formData.anonymousHiring ? 'bg-[#4a9eff]' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          formData.anonymousHiring ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <div>
                      <p className="text-sm text-[#e5e5e5] flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5 text-[#4a9eff]" />
                        Anonymous Hiring Mode
                      </p>
                      <p className="text-[10px] text-[#a3a3a3]">
                        Hide candidate identity until shortlisting. Eliminates bias in evaluation.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#4a9eff] text-white text-sm rounded-lg hover:bg-[#3b8de6] transition-colors"
                    >
                      Create Job
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] text-sm rounded-lg hover:bg-[#2a2a2a] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Job Cards */}
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-8 text-center">
                  <Briefcase className="w-8 h-8 text-[#2a2a2a] mx-auto mb-2" />
                  <p className="text-sm text-[#a3a3a3]">
                    No jobs yet. Create your first job posting.
                  </p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job._id}
                    className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-[#e5e5e5]">
                            {job.title}
                          </h3>
                          {job.anonymousHiring && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#4a9eff]/10 border border-[#4a9eff]/30 rounded text-[10px] text-[#4a9eff]">
                              <EyeOff className="w-2.5 h-2.5" />
                              Anonymous
                            </span>
                          )}
                        </div>
                        {job.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {job.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-[#a3a3a3]"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-[#a3a3a3] line-clamp-2">
                          {job.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteJob(job._id)}
                        className="p-1.5 text-[#a3a3a3] hover:text-[#ef4444] transition-colors ml-2 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-[#1a1a1a]">
                      <button
                        onClick={() => handleGenerateAssessment(job._id)}
                        disabled={generatingAssessment === job._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors"
                      >
                        {generatingAssessment === job._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        {generatingAssessment === job._id
                          ? 'Generating...'
                          : 'Generate Assessment'}
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/dashboard/monitoring/${job._id}`)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] hover:bg-[#2a2a2a] transition-colors"
                      >
                        <Radio className="w-3 h-3 text-[#ef4444]" />
                        Live Monitor
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/dashboard/resumes/${job._id}`)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] hover:bg-[#2a2a2a] transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        Resumes
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/dashboard/results/${job._id}`)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] hover:bg-[#2a2a2a] transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Results
                      </button>
                      <button
                        onClick={() => handleToggleAnonymous(job._id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs transition-colors ${
                          job.anonymousHiring
                            ? 'bg-[#4a9eff]/10 border-[#4a9eff]/30 text-[#4a9eff] hover:bg-[#4a9eff]/20'
                            : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#a3a3a3] hover:bg-[#2a2a2a]'
                        }`}
                      >
                        <EyeOff className="w-3 h-3" />
                        {job.anonymousHiring ? 'Anonymous On' : 'Anonymous Off'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#e5e5e5]">
              Assessment Results
            </h2>
            {jobs.length === 0 ? (
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-8 text-center">
                <BarChart3 className="w-8 h-8 text-[#2a2a2a] mx-auto mb-2" />
                <p className="text-sm text-[#a3a3a3]">
                  No jobs to show results for.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => (
                  <button
                    key={job._id}
                    onClick={() =>
                      router.push(`/dashboard/results/${job._id}`)
                    }
                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg p-4 text-left hover:bg-[#1a1a1a] transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#e5e5e5]">
                          {job.title}
                        </h3>
                        {job.anonymousHiring && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#4a9eff]/10 border border-[#4a9eff]/30 rounded text-[10px] text-[#4a9eff]">
                            <EyeOff className="w-2.5 h-2.5" />
                            Anonymous
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#a3a3a3]">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-[#a3a3a3]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
