'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  FileText,
  LogOut,
  Briefcase,
  Loader2,
  ArrowRight,
  Search,
  X,
  User,
  Filter,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experienceLevel: string;
  createdAt: string;
}

interface Recommendation {
  job: Job;
  score: number;
  matchedSkills: string[];
  missingSkills?: string[];
  skillMatchPercent: number;
  matchReasons?: string[];
}

export default function JobsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showRecs, setShowRecs] = useState(false);
  const [recsMessage, setRecsMessage] = useState('');

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

  const fetchJobs = useCallback(async (search?: string, experience?: string) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (experience) params.experience = experience;

      const response = await api.get('/jobs', { params });
      setJobs(response.data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    setShowRecs(true);
    setRecsMessage('');
    try {
      const res = await api.get('/jobs/recommendations');
      setRecommendations(res.data.recommendations || []);
      if (res.data.message) {
        setRecsMessage(res.data.message);
      }
    } catch (error: any) {
      console.error('Failed to fetch recommendations:', error);
      setRecsMessage('Failed to load recommendations. Complete your profile first.');
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleSearch = () => {
    fetchJobs(searchQuery, experienceFilter);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setExperienceFilter('');
    setShowFilters(false);
    fetchJobs();
  };

  const handleStartAssessment = (jobId: string) => {
    // Always go to resume page first — it handles all logic
    // (shows upload form, rejection details, or approved → assessment button)
    router.push(`/jobs/${jobId}/resume`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Nav */}
      <nav className="border-b border-[#2a2a2a] sticky top-0 z-20 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="w-4 h-4 text-[#4a9eff]" />
            <h1 className="text-sm font-semibold text-[#e5e5e5]">
              Available Jobs
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center gap-1 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              Profile
            </button>
            <span className="text-[10px] text-[#2a2a2a]">|</span>
            <span className="text-xs text-[#a3a3a3]">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Bar + Recommend Button */}
        <div className="mb-5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3a3a3a]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search jobs by title, skills, or description..."
                className="w-full pl-9 pr-3 py-2.5 bg-[#121212] border border-[#2a2a2a] rounded-lg text-sm text-[#e5e5e5] placeholder:text-[#3a3a3a] focus:border-[#4a9eff] focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg text-xs transition-colors ${
                showFilters || experienceFilter
                  ? 'bg-[#4a9eff]/10 border-[#4a9eff]/30 text-[#4a9eff]'
                  : 'bg-[#121212] border-[#2a2a2a] text-[#a3a3a3] hover:bg-[#1a1a1a]'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-[#4a9eff] text-white text-sm font-medium rounded-lg hover:bg-[#3b8de6] transition-colors"
            >
              Search
            </button>
            {(searchQuery || experienceFilter) && (
              <button
                onClick={handleClearSearch}
                className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-2 p-3 bg-[#121212] border border-[#2a2a2a] rounded-lg">
              <label className="text-xs text-[#a3a3a3] block mb-1">Experience Level</label>
              <div className="flex flex-wrap gap-2">
                {['', 'Fresher', 'Junior', 'Mid', 'Senior', 'Lead'].map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      setExperienceFilter(level);
                      fetchJobs(searchQuery, level);
                    }}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      experienceFilter === level
                        ? 'bg-[#4a9eff] text-white'
                        : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] hover:bg-[#2a2a2a]'
                    }`}
                  >
                    {level || 'All'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recommend Button */}
          <div className="mt-3">
            <button
              onClick={fetchRecommendations}
              disabled={loadingRecs}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showRecs
                  ? 'bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981]'
                  : 'bg-[#121212] border border-[#2a2a2a] text-[#e5e5e5] hover:bg-[#1a1a1a]'
              }`}
            >
              {loadingRecs ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loadingRecs ? 'Finding best matches...' : 'Recommend Jobs for Me'}
            </button>
          </div>
        </div>

        {/* Recommendations Section */}
        {showRecs && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#10b981]" />
                <h2 className="text-sm font-semibold text-[#e5e5e5]">
                  Recommended for You
                </h2>
              </div>
              <button
                onClick={() => setShowRecs(false)}
                className="text-xs text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
              >
                Hide
              </button>
            </div>

            {loadingRecs ? (
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-6 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#10b981] mx-auto mb-2" />
                <p className="text-xs text-[#a3a3a3]">Analyzing your profile against available jobs...</p>
              </div>
            ) : recsMessage ? (
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-6 text-center">
                <Sparkles className="w-6 h-6 text-[#3a3a3a] mx-auto mb-2" />
                <p className="text-xs text-[#a3a3a3]">{recsMessage}</p>
                <button
                  onClick={() => router.push('/profile')}
                  className="mt-3 text-xs text-[#4a9eff] hover:underline"
                >
                  Complete your profile
                </button>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-6 text-center">
                <p className="text-xs text-[#a3a3a3]">No matching jobs found based on your profile.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <div
                    key={rec.job._id}
                    className="bg-[#121212] border border-[#10b981]/20 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#10b981]/10 text-[#10b981]">
                            #{idx + 1}
                          </span>
                          <h3 className="text-sm font-semibold text-[#e5e5e5]">
                            {rec.job.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {rec.job.experienceLevel && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3]">
                              {rec.job.experienceLevel}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-[#10b981]">
                            {rec.skillMatchPercent}% skill match · score {rec.score}/100
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Matched Skills */}
                    {rec.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {rec.matchedSkills.map((skill, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#10b981]/10 border border-[#10b981]/20 rounded text-[10px] text-[#10b981]"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Missing Skills */}
                    {(rec.missingSkills || rec.job.skills.filter(s => !rec.matchedSkills.map(m => m.toLowerCase()).includes(s.toLowerCase()))).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(rec.missingSkills || rec.job.skills.filter(s => !rec.matchedSkills.map(m => m.toLowerCase()).includes(s.toLowerCase()))).map((skill, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[10px] text-[#a3a3a3]"
                            >
                              {skill}
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Match Reasons */}
                    {rec.matchReasons && rec.matchReasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {rec.matchReasons.map((reason, i) => (
                          <span
                            key={i}
                            className="text-[10px] text-[#4a9eff] bg-[#4a9eff]/10 border border-[#4a9eff]/20 rounded px-1.5 py-0.5"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-[#a3a3a3] line-clamp-1 mb-3">
                      {rec.job.description}
                    </p>

                    <button
                      onClick={() => handleStartAssessment(rec.job._id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#10b981] text-white text-xs font-medium rounded-lg hover:bg-[#0d9668] transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Apply Now
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-[#4a9eff]" />
            <span className="ml-2 text-[#a3a3a3] text-sm">Loading jobs...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Results count */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a3a3a3]">
                {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
                {searchQuery && (
                  <span className="text-[#4a9eff]"> for &quot;{searchQuery}&quot;</span>
                )}
              </span>
            </div>

            {jobs.length === 0 ? (
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-8 text-center">
                <Briefcase className="w-8 h-8 text-[#2a2a2a] mx-auto mb-2" />
                <p className="text-sm text-[#a3a3a3]">
                  {searchQuery
                    ? 'No jobs match your search criteria.'
                    : 'No jobs available at the moment.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="mt-3 text-xs text-[#4a9eff] hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-[#e5e5e5] mb-1">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        {job.experienceLevel && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3]">
                            {job.experienceLevel}
                          </span>
                        )}
                        {job.createdAt && (
                          <span className="text-[10px] text-[#3a3a3a]">
                            Posted {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
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

                  <p className="text-xs text-[#a3a3a3] line-clamp-2 mb-4">
                    {job.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartAssessment(job._id)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#4a9eff] text-white text-sm font-medium rounded-lg hover:bg-[#3b8de6] transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Apply & Take Assessment
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
