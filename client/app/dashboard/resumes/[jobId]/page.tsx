'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
} from 'lucide-react';

interface Resume {
  _id: string;
  candidateId: {
    _id: string;
    name: string;
    email: string;
  };
  parsedData: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience: string;
    education: string[];
    workExperience: string[];
    summary: string;
  };
  screeningResult: {
    matchScore: number;
    status: 'pending' | 'approved' | 'rejected';
    feedback: string;
    analysis: {
      matchingSkills: string[];
      missingSkills: string[];
      experienceMatch: string;
      overallRecommendation: string;
    };
  };
  uploadedAt: string;
}

export default function ResumesPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchResumes();
  }, [jobId]);

  const fetchResumes = async () => {
    try {
      const response = await api.get(`/resume/job/${jobId}`);
      setResumes(response.data.resumes);
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30';
    if (status === 'rejected') return 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30';
    return 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#4a9eff]" />
        <span className="ml-2 text-sm text-[#a3a3a3]">Loading resumes...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-4 h-4 text-[#4a9eff]" />
          <h1 className="text-xl font-semibold text-[#e5e5e5]">
            Submitted Resumes
          </h1>
          <span className="text-xs text-[#a3a3a3] ml-2">
            ({resumes.length})
          </span>
        </div>

        {resumes.length === 0 ? (
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-8 text-center">
            <p className="text-sm text-[#a3a3a3]">
              No resumes uploaded for this job yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map((resume) => (
              <div
                key={resume._id}
                className="bg-[#121212] border border-[#2a2a2a] rounded-lg"
              >
                <button
                  onClick={() =>
                    setExpanded(expanded === resume._id ? null : resume._id)
                  }
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#1a1a1a] transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#e5e5e5]">
                        {resume.candidateId.name}
                      </p>
                      <p className="text-[10px] text-[#a3a3a3]">
                        {resume.candidateId.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-[#e5e5e5]">
                      {resume.screeningResult.matchScore}%
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold ${getStatusColor(
                        resume.screeningResult.status
                      )}`}
                    >
                      {resume.screeningResult.status === 'approved' && (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      {resume.screeningResult.status === 'rejected' && (
                        <XCircle className="w-3 h-3" />
                      )}
                      {resume.screeningResult.status.toUpperCase()}
                    </span>
                  </div>
                </button>

                {expanded === resume._id && (
                  <div className="px-4 pb-4 pt-2 border-t border-[#1a1a1a]">
                    <p className="text-xs text-[#a3a3a3] mb-3">
                      {resume.screeningResult.feedback}
                    </p>

                    {resume.screeningResult.analysis && (
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3">
                          <span className="text-[10px] text-[#a3a3a3] block mb-1">
                            Matching Skills
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {resume.screeningResult.analysis.matchingSkills
                              .length > 0 ? (
                              resume.screeningResult.analysis.matchingSkills.map(
                                (s, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 bg-[#10b981]/10 border border-[#10b981]/30 rounded text-[10px] text-[#10b981]"
                                  >
                                    {s}
                                  </span>
                                )
                              )
                            ) : (
                              <span className="text-[10px] text-[#a3a3a3]">
                                None
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3">
                          <span className="text-[10px] text-[#a3a3a3] block mb-1">
                            Missing Skills
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {resume.screeningResult.analysis.missingSkills
                              .length > 0 ? (
                              resume.screeningResult.analysis.missingSkills.map(
                                (s, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded text-[10px] text-[#ef4444]"
                                  >
                                    {s}
                                  </span>
                                )
                              )
                            ) : (
                              <span className="text-[10px] text-[#a3a3a3]">
                                None
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3">
                          <span className="text-[10px] text-[#a3a3a3] block mb-1">
                            Experience Match
                          </span>
                          <span className="text-xs text-[#e5e5e5]">
                            {resume.screeningResult.analysis.experienceMatch}
                          </span>
                        </div>
                        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3">
                          <span className="text-[10px] text-[#a3a3a3] block mb-1">
                            Recommendation
                          </span>
                          <span className="text-xs text-[#e5e5e5]">
                            {
                              resume.screeningResult.analysis
                                .overallRecommendation
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Parsed Resume Data */}
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-3">
                      <span className="text-[10px] text-[#a3a3a3] block mb-2">
                        Parsed Resume Data
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[#a3a3a3]">Name: </span>
                          <span className="text-[#e5e5e5]">
                            {resume.parsedData?.name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#a3a3a3]">Experience: </span>
                          <span className="text-[#e5e5e5]">
                            {resume.parsedData?.experience || 'N/A'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[#a3a3a3]">Skills: </span>
                          <span className="text-[#e5e5e5]">
                            {resume.parsedData?.skills?.join(', ') || 'N/A'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[#a3a3a3]">Summary: </span>
                          <span className="text-[#e5e5e5]">
                            {resume.parsedData?.summary || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
