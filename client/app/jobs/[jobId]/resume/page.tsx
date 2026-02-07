'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import {
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  FileText,
  User,
} from 'lucide-react';

export default function ResumeUploadPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [applyingWithProfile, setApplyingWithProfile] = useState(false);
  const [resumeStatus, setResumeStatus] = useState<
    'not_uploaded' | 'pending' | 'approved' | 'rejected'
  >('not_uploaded');
  const [screeningFeedback, setScreeningFeedback] = useState('');
  const [matchScore, setMatchScore] = useState(0);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [hasProfileResume, setHasProfileResume] = useState(false);
  const [profileResumeName, setProfileResumeName] = useState('');

  useEffect(() => {
    checkResumeStatus();
    checkProfileResume();
  }, [jobId]);

  const checkResumeStatus = async () => {
    try {
      const response = await api.get(`/resume/candidate/${jobId}`);
      const resume = response.data.resume;
      if (resume?.screeningResult) {
        setResumeStatus(resume.screeningResult.status || 'not_uploaded');
        setScreeningFeedback(
          resume.screeningResult.rejectionReason ||
          resume.screeningResult.analysis?.recommendation ||
          ''
        );
        setMatchScore(resume.screeningResult.matchScore || 0);
        setAnalysis(resume.screeningResult.analysis || null);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setResumeStatus('not_uploaded');
      }
    } finally {
      setLoadingInitial(false);
    }
  };

  const checkProfileResume = async () => {
    try {
      const res = await api.get('/profile/resume');
      if (res.data.resume?.fileName) {
        setHasProfileResume(true);
        setProfileResumeName(res.data.resume.fileName);
      }
    } catch {
      setHasProfileResume(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResumeStatus('pending');
    setScreeningFeedback('Uploading and screening your resume...');

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobId', jobId);

    try {
      const response = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data.resume?.screeningResult;
      if (result) {
        setResumeStatus(result.status || 'pending');
        setScreeningFeedback(
          result.rejectionReason || result.analysis?.recommendation || ''
        );
        setMatchScore(result.matchScore || 0);
        setAnalysis(result.analysis || null);
      }
    } catch (error: any) {
      setResumeStatus('not_uploaded');
      setScreeningFeedback('');
      alert(error.response?.data?.message || 'Failed to upload resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyWithProfile = async () => {
    setApplyingWithProfile(true);
    setResumeStatus('pending');
    setScreeningFeedback('Screening your profile resume against this job...');

    try {
      const response = await api.post('/resume/apply-with-profile', { jobId });
      const result = response.data.resume?.screeningResult;
      if (result) {
        setResumeStatus(result.status || 'pending');
        setScreeningFeedback(
          result.rejectionReason || result.analysis?.recommendation || ''
        );
        setMatchScore(result.matchScore || 0);
        setAnalysis(result.analysis || null);
      }
    } catch (error: any) {
      setResumeStatus('not_uploaded');
      setScreeningFeedback('');
      alert(error.response?.data?.message || 'Failed to apply with profile resume.');
    } finally {
      setApplyingWithProfile(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#4a9eff]" />
        <span className="ml-2 text-sm text-[#a3a3a3]">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/jobs')}
          className="flex items-center gap-1 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Jobs
        </button>

        <h1 className="text-xl font-semibold text-[#e5e5e5] mb-6">
          Resume Screening
        </h1>

        {/* Approved */}
        {resumeStatus === 'approved' && (
          <div className="bg-[#121212] border border-[#10b981]/30 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
              <h3 className="text-base font-semibold text-[#10b981]">
                Resume Approved
              </h3>
            </div>
            <p className="text-xs text-[#a3a3a3] mb-3">
              Your resume matches the job requirements. You can now take the
              assessment.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-[#a3a3a3]">Match Score:</span>
              <span className="text-sm font-mono font-bold text-[#10b981]">
                {matchScore}%
              </span>
            </div>
            {analysis && (
              <div className="space-y-2 mb-4">
                {analysis.matchingSkills?.length > 0 && (
                  <div className="px-3 py-2 bg-[#1a1a1a] rounded">
                    <span className="text-[10px] text-[#a3a3a3] block mb-1">Matching Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {analysis.matchingSkills.map((s: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 bg-[#10b981]/10 border border-[#10b981]/30 rounded text-[10px] text-[#10b981]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.recommendation && (
                  <p className="text-xs text-[#a3a3a3] px-3 py-2 bg-[#1a1a1a] rounded">
                    {analysis.recommendation}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => router.push(`/jobs/${jobId}/assessment`)}
              className="px-4 py-2 bg-[#4a9eff] text-white text-sm font-medium rounded-lg hover:bg-[#3b8de6] transition-colors"
            >
              Start Assessment
            </button>
          </div>
        )}

        {/* Rejected */}
        {resumeStatus === 'rejected' && (
          <div className="bg-[#121212] border border-[#ef4444]/30 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-[#ef4444]" />
              <h3 className="text-base font-semibold text-[#ef4444]">
                Application Rejected
              </h3>
            </div>
            <p className="text-xs text-[#a3a3a3] mb-3">
              Your resume did not meet the minimum requirements for this job.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-[#a3a3a3]">Match Score:</span>
              <span className="text-sm font-mono font-bold text-[#ef4444]">
                {matchScore}%
              </span>
            </div>
            {screeningFeedback && (
              <p className="text-xs text-[#a3a3a3] mb-4 px-3 py-2 bg-[#1a1a1a] rounded">
                {screeningFeedback}
              </p>
            )}
            {analysis?.missingSkills?.length > 0 && (
              <div className="mb-4 px-3 py-2 bg-[#1a1a1a] rounded">
                <span className="text-[10px] text-[#a3a3a3] block mb-1">Missing Skills</span>
                <div className="flex flex-wrap gap-1">
                  {analysis.missingSkills.map((s: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded text-[10px] text-[#ef4444]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => router.push('/jobs')}
              className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3] text-sm rounded-lg hover:bg-[#2a2a2a] transition-colors"
            >
              Back to Jobs
            </button>
          </div>
        )}

        {/* Pending */}
        {resumeStatus === 'pending' && (
          <div className="bg-[#121212] border border-[#f59e0b]/30 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#f59e0b]" />
              <h3 className="text-base font-semibold text-[#f59e0b]">
                Screening in Progress
              </h3>
            </div>
            <p className="text-xs text-[#a3a3a3]">{screeningFeedback || 'Analyzing your resume...'}</p>
          </div>
        )}

        {/* Not uploaded */}
        {resumeStatus === 'not_uploaded' && (
          <div className="space-y-4">
            {/* Apply with Profile Resume */}
            {hasProfileResume && (
              <div className="bg-[#121212] border border-[#4a9eff]/30 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-[#4a9eff]" />
                  <h3 className="text-sm font-semibold text-[#e5e5e5]">
                    Apply with Profile Resume
                  </h3>
                </div>
                <p className="text-xs text-[#a3a3a3] mb-3">
                  Use your saved resume <span className="text-[#e5e5e5] font-mono text-[10px]">({profileResumeName})</span> to apply for this job instantly.
                </p>
                <button
                  onClick={handleApplyWithProfile}
                  disabled={applyingWithProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-[#4a9eff] text-white text-sm font-medium rounded-lg hover:bg-[#3b8de6] disabled:opacity-50 transition-colors"
                >
                  {applyingWithProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {applyingWithProfile ? 'Screening...' : 'Apply with Profile Resume'}
                </button>
              </div>
            )}

            {/* Divider */}
            {hasProfileResume && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#2a2a2a]" />
                <span className="text-[10px] text-[#3a3a3a] uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-[#2a2a2a]" />
              </div>
            )}

            {/* Upload new resume */}
            <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-4 h-4 text-[#4a9eff]" />
                <h3 className="text-sm font-semibold text-[#e5e5e5]">
                  Upload New Resume
                </h3>
              </div>
              <p className="text-xs text-[#a3a3a3] mb-4">
                Upload a different resume (PDF or TXT, max 5MB) specific to this job.
              </p>

              <div className="mb-4">
                <label className="text-xs text-[#a3a3a3] block mb-2">
                  Resume File
                </label>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileChange}
                  className="w-full text-xs text-[#a3a3a3] file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-[#2a2a2a] file:bg-[#1a1a1a] file:text-[#e5e5e5] file:text-xs hover:file:bg-[#2a2a2a] file:cursor-pointer file:transition-colors"
                />
                {file && (
                  <p className="text-[10px] text-[#a3a3a3] mt-1">
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex items-center gap-2 px-4 py-2 bg-[#4a9eff] text-white text-sm font-medium rounded-lg hover:bg-[#3b8de6] disabled:opacity-50 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Uploading & Screening...' : 'Upload & Screen'}
              </button>
            </div>

            {/* No profile resume hint */}
            {!hasProfileResume && (
              <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-lg">
                <p className="text-[10px] text-[#a3a3a3]">
                  Tip: Save a resume in your{' '}
                  <button
                    onClick={() => router.push('/profile')}
                    className="text-[#4a9eff] hover:underline"
                  >
                    profile
                  </button>{' '}
                  to quickly apply to multiple jobs without re-uploading.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
