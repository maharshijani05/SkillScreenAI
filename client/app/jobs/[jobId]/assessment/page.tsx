'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

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

  useEffect(() => {
    fetchAssessment();
  }, [jobId]);

  useEffect(() => {
    if (attempt && assessment) {
      const endTime = new Date(attempt.startedAt).getTime() + assessment.duration * 60 * 1000;
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setTimeRemaining(remaining);
        if (remaining === 0) {
          handleSubmit();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [attempt, assessment]);

  const fetchAssessment = async () => {
    try {
      const response = await api.get(`/assessment/${jobId}`);
      setAssessment(response.data.assessment);
      
      // Start attempt
      const attemptResponse = await api.post('/attempt/start', {
        jobId,
        assessmentId: response.data.assessment._id,
      });
      setAttempt(attemptResponse.data.attempt);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load assessment';
      
      // Check if resume is required
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

  const handleSubmit = async () => {
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

      router.push(`/jobs/${jobId}/results`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!assessment) {
    return <div className="min-h-screen flex items-center justify-center">Assessment not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="text-lg font-semibold">
            Time Remaining: {formatTime(timeRemaining)}
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-6">Assessment</h1>

        <div className="space-y-6">
          {assessment.questions.map((question, index) => (
            <Card key={question._id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {index + 1} ({question.type}) - {question.points} points
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{question.question}</p>

                {question.type === 'objective' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <label key={optIndex} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name={question._id}
                          value={option}
                          checked={answers[question._id] === option}
                          onChange={(e) => setAnswers({ ...answers, [question._id]: e.target.value })}
                          className="w-4 h-4"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'subjective' && (
                  <div className="space-y-2">
                    <Label>Your Answer</Label>
                    <Textarea
                      value={answers[question._id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [question._id]: e.target.value })}
                      rows={4}
                      placeholder="Type your answer here..."
                    />
                  </div>
                )}

                {question.type === 'coding' && (
                  <div className="space-y-2">
                    {question.constraints && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-semibold mb-1">Constraints:</p>
                        <p className="text-sm">{question.constraints}</p>
                      </div>
                    )}
                    <Label>Your Code</Label>
                    <Textarea
                      value={answers[question._id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [question._id]: e.target.value })}
                      rows={10}
                      placeholder="Write your code here..."
                      className="font-mono text-sm"
                    />
                    {question.testCases && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-semibold mb-2">Test Cases:</p>
                        {question.testCases.map((tc, tcIndex) => (
                          <div key={tcIndex} className="text-sm mb-1">
                            Test Case {tcIndex + 1}: Input = {tc.input} ({tc.points} points)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting} size="lg">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit Assessment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
