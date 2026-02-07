'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { useProctoring } from '@/hooks/useProctoring';
import { WebcamMonitor } from '@/components/proctoring/WebcamMonitor';
import { IntegrityScore } from '@/components/proctoring/IntegrityScore';
import { WarningModal } from '@/components/proctoring/WarningModal';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
} from 'lucide-react';

interface Question {
  _id: string;
  type: 'objective' | 'subjective' | 'coding';
  question: string;
  options?: string[];
  points: number;
  constraints?: string;
  testCases?: Array<{ input: string; points: number }>;
}

interface Assessment {
  _id: string;
  questions: Question[];
  duration: number;
}

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Auto-submit handler for proctoring
  const handleAutoSubmit = useCallback(() => {
    handleSubmit(true);
  }, []);

  // Proctoring hook
  const proctoring = useProctoring({
    attemptId: attempt?._id || '',
    jobId,
    onAutoSubmit: handleAutoSubmit,
    enabled: !!attempt && !submitting,
  });

  useEffect(() => {
    checkResumeAndLoadAssessment();
  }, [jobId]);

  useEffect(() => {
    if (attempt && assessment) {
      const endTime =
        new Date(attempt.startedAt).getTime() + assessment.duration * 60 * 1000;
      const interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.floor((endTime - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);
        if (remaining === 0) {
          handleSubmit(false);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [attempt, assessment]);

  const checkResumeAndLoadAssessment = async () => {
    try {
      // Step 1: Check resume status FIRST
      let resumeApproved = false;
      try {
        const resumeResponse = await api.get(`/resume/candidate/${jobId}`);
        const resume = resumeResponse.data.resume;
        if (resume?.screeningResult?.status === 'approved') {
          resumeApproved = true;
        } else if (resume?.screeningResult?.status === 'rejected') {
          alert(
            `Application Rejected: ${
              resume.screeningResult.rejectionReason ||
              'Your resume does not match the job requirements.'
            }`
          );
          router.push('/jobs');
          return;
        } else {
          alert('Your resume is still being screened. Please wait for approval.');
          router.push(`/jobs/${jobId}/resume`);
          return;
        }
      } catch (resumeError: any) {
        // No resume found — redirect to resume upload
        router.push(`/jobs/${jobId}/resume`);
        return;
      }

      if (!resumeApproved) {
        router.push(`/jobs/${jobId}/resume`);
        return;
      }

      // Step 2: Load assessment (only if resume is approved)
      const response = await api.get(`/assessment/${jobId}`);
      setAssessment(response.data.assessment);

      // Step 3: Start attempt
      const attemptResponse = await api.post('/attempt/start', {
        jobId,
        assessmentId: response.data.assessment._id,
      });
      setAttempt(attemptResponse.data.attempt);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to load assessment';
      if (error.response?.data?.requiresResume) {
        if (error.response?.data?.rejectionReason) {
          alert(`Application Rejected: ${error.response.data.rejectionReason}`);
          router.push('/jobs');
        } else {
          alert(errorMessage);
          router.push(`/jobs/${jobId}/resume`);
        }
      } else {
        alert(errorMessage);
        router.push('/jobs');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!attempt || submitting) return;

    setSubmitting(true);
    try {
      const answerArray = assessment!.questions.map((q) => ({
        questionId: q._id,
        answer: answers[q._id] || '',
      }));

      await api.post('/attempt/submit', {
        attemptId: attempt._id,
        answers: answerArray,
      });

      // End proctoring session
      try {
        await api.post('/proctoring/end', { attemptId: attempt._id });
      } catch (e) {
        // Proctoring end failed - continue
      }

      router.push(`/jobs/${jobId}/results`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#4a9eff]" />
          <span className="text-[#a3a3a3] text-sm">Loading assessment...</span>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <span className="text-[#a3a3a3]">Assessment not found</span>
      </div>
    );
  }

  const question = assessment.questions[currentQuestion];
  const isTimeWarning = timeRemaining > 0 && timeRemaining < 300;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a] border-b border-[#2a2a2a]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-[#e5e5e5]">
                Assessment
              </h1>
              <span className="text-xs text-[#a3a3a3]">
                Question {currentQuestion + 1} of {assessment.questions.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Integrity Score */}
            <IntegrityScore
              score={proctoring.state.integrityScore}
              strikeCount={proctoring.state.strikeCount}
            />

            {/* Timer */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded border ${
                isTimeWarning
                  ? 'border-[#ef4444] bg-[#ef4444]/10'
                  : 'border-[#2a2a2a] bg-[#121212]'
              }`}
            >
              <Clock
                className={`w-4 h-4 ${
                  isTimeWarning ? 'text-[#ef4444]' : 'text-[#a3a3a3]'
                }`}
              />
              <span
                className={`text-base font-mono font-semibold ${
                  isTimeWarning ? 'text-[#ef4444]' : 'text-[#e5e5e5]'
                }`}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Question Progress */}
        <div className="max-w-5xl mx-auto px-4 pb-2">
          <div className="flex gap-1">
            {assessment.questions.map((q, i) => (
              <button
                key={q._id}
                onClick={() => setCurrentQuestion(i)}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i === currentQuestion
                    ? 'bg-[#4a9eff]'
                    : answers[q._id]
                    ? 'bg-[#10b981]'
                    : 'bg-[#2a2a2a]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-32">
        {/* Proctoring status bar */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#121212] border border-[#2a2a2a] rounded-lg">
          <Shield className="w-3.5 h-3.5 text-[#4a9eff]" />
          <span className="text-xs text-[#a3a3a3]">
            Proctoring active
          </span>
          <div className={`w-1.5 h-1.5 rounded-full ${proctoring.state.webcamActive ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
          <span className="text-xs text-[#a3a3a3]">
            {proctoring.state.modelLoaded ? 'AI monitoring ready' : 'Loading AI model...'}
          </span>
        </div>

        {/* Question Card */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg">
          {/* Question Header */}
          <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#a3a3a3]">
                {question.type.toUpperCase()}
              </span>
              <span className="text-sm text-[#a3a3a3]">
                {question.points} pts
              </span>
            </div>
            <span className="text-xs text-[#a3a3a3]">
              Q{currentQuestion + 1}
            </span>
          </div>

          {/* Question Body */}
          <div className="px-6 py-6">
            <p className="text-base text-[#e5e5e5] leading-relaxed mb-6">
              {question.question}
            </p>

            {/* Objective */}
            {question.type === 'objective' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, optIndex) => (
                  <label
                    key={optIndex}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      answers[question._id] === option
                        ? 'border-[#4a9eff] bg-[#4a9eff]/10'
                        : 'border-[#2a2a2a] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={question._id}
                      value={option}
                      checked={answers[question._id] === option}
                      onChange={(e) =>
                        setAnswers({ ...answers, [question._id]: e.target.value })
                      }
                      className="w-4 h-4 accent-[#4a9eff]"
                    />
                    <span className="text-sm text-[#e5e5e5]">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Subjective */}
            {question.type === 'subjective' && (
              <div>
                <label className="text-xs text-[#a3a3a3] mb-2 block">
                  Your Answer
                </label>
                <textarea
                  value={answers[question._id] || ''}
                  onChange={(e) =>
                    setAnswers({ ...answers, [question._id]: e.target.value })
                  }
                  rows={6}
                  placeholder="Type your answer here..."
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-sm text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#4a9eff] resize-none"
                />
              </div>
            )}

            {/* Coding */}
            {question.type === 'coding' && (
              <div className="space-y-4">
                {question.constraints && (
                  <div className="px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
                    <span className="text-xs font-semibold text-[#a3a3a3] block mb-1">
                      Constraints
                    </span>
                    <p className="text-xs text-[#e5e5e5] font-mono">
                      {question.constraints}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs text-[#a3a3a3] mb-2 block">
                    Your Code
                  </label>
                  <textarea
                    value={answers[question._id] || ''}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        [question._id]: e.target.value,
                      })
                    }
                    rows={12}
                    placeholder="Write your code here..."
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-sm text-[#e5e5e5] placeholder-[#3a3a3a] font-mono focus:outline-none focus:border-[#4a9eff] resize-none"
                  />
                </div>
                {question.testCases && question.testCases.length > 0 && (
                  <div className="px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
                    <span className="text-xs font-semibold text-[#a3a3a3] block mb-2">
                      Test Cases
                    </span>
                    {question.testCases.map((tc, tcIndex) => (
                      <div
                        key={tcIndex}
                        className="flex items-center justify-between text-xs py-1 border-b border-[#1a1a1a] last:border-0"
                      >
                        <span className="text-[#e5e5e5] font-mono">
                          Input: {tc.input}
                        </span>
                        <span className="text-[#a3a3a3]">
                          {tc.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 border-t border-[#2a2a2a] flex items-center justify-between">
            <button
              onClick={() =>
                setCurrentQuestion(Math.max(0, currentQuestion - 1))
              }
              disabled={currentQuestion === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#a3a3a3] hover:text-[#e5e5e5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentQuestion === assessment.questions.length - 1 ? (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-[#4a9eff] text-white text-sm font-medium rounded-lg hover:bg-[#3b8de6] disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            ) : (
              <button
                onClick={() =>
                  setCurrentQuestion(
                    Math.min(
                      assessment.questions.length - 1,
                      currentQuestion + 1
                    )
                  )
                }
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#e5e5e5] hover:text-white transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Webcam Monitor */}
      <WebcamMonitor
        videoRef={proctoring.videoRef as React.RefObject<HTMLVideoElement>}
        canvasRef={proctoring.canvasRef as React.RefObject<HTMLCanvasElement>}
        active={proctoring.state.webcamActive}
        facesDetected={proctoring.state.facesDetected}
        phoneDetected={proctoring.state.phoneDetected}
        lookingAway={proctoring.state.lookingAway}
      />

      {/* Warning Modal */}
      <WarningModal
        open={proctoring.showWarning}
        onClose={proctoring.dismissWarning}
        message={proctoring.warningMessage}
        violationType={proctoring.warningType}
        strikeCount={proctoring.state.strikeCount}
        isAutoSubmit={proctoring.state.isAutoSubmitted}
      />
    </div>
  );
}
