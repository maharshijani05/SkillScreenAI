'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { ArrowLeft, CheckCircle2, XCircle, FileText, Download } from 'lucide-react';

interface Resume {
  _id: string;
  candidateId: {
    name: string;
    email: string;
  };
  screeningResult: {
    status: string;
    matchScore: number;
    analysis: {
      strengths: string[];
      weaknesses: string[];
      missingSkills: string[];
      matchingSkills: string[];
      recommendation: string;
    };
    rejectionReason?: string;
  };
  parsedData: {
    name: string;
    email: string;
    skills: string[];
    experience: string;
    summary: string;
  };
  uploadedAt: string;
}

export default function ResumesPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);

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

  const approvedResumes = resumes.filter(r => r.screeningResult.status === 'approved');
  const rejectedResumes = resumes.filter(r => r.screeningResult.status === 'rejected');
  const pendingResumes = resumes.filter(r => r.screeningResult.status === 'pending');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-6">Resume Applications</h1>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({resumes.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedResumes.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedResumes.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingResumes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ResumeList resumes={resumes} onSelect={setSelectedResume} />
          </TabsContent>
          <TabsContent value="approved">
            <ResumeList resumes={approvedResumes} onSelect={setSelectedResume} />
          </TabsContent>
          <TabsContent value="rejected">
            <ResumeList resumes={rejectedResumes} onSelect={setSelectedResume} />
          </TabsContent>
          <TabsContent value="pending">
            <ResumeList resumes={pendingResumes} onSelect={setSelectedResume} />
          </TabsContent>
        </Tabs>

        {selectedResume && (
          <ResumeDetailModal resume={selectedResume} onClose={() => setSelectedResume(null)} />
        )}
      </div>
    </div>
  );
}

function ResumeList({ resumes, onSelect }: { resumes: Resume[]; onSelect: (r: Resume) => void }) {
  if (resumes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No resumes found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {resumes.map((resume) => (
        <Card
          key={resume._id}
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => onSelect(resume)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{resume.candidateId.name}</h3>
                <p className="text-sm text-muted-foreground">{resume.candidateId.email}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm">
                    Match Score: <strong>{resume.screeningResult.matchScore}%</strong>
                  </span>
                  <span className="text-sm">
                    Experience: {resume.parsedData.experience || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {resume.screeningResult.status === 'approved' && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {resume.screeningResult.status === 'rejected' && (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {resume.screeningResult.status === 'pending' && (
                  <div className="h-5 w-5 rounded-full border-2 border-primary animate-pulse" />
                )}
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ResumeDetailModal({ resume, onClose }: { resume: Resume; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{resume.candidateId.name}</CardTitle>
              <CardDescription>{resume.candidateId.email}</CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Screening Status</h3>
            <div className="flex items-center gap-2">
              {resume.screeningResult.status === 'approved' && (
                <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm">
                  Approved
                </span>
              )}
              {resume.screeningResult.status === 'rejected' && (
                <span className="px-3 py-1 bg-destructive/20 text-destructive rounded-full text-sm">
                  Rejected
                </span>
              )}
              {resume.screeningResult.status === 'pending' && (
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-sm">
                  Pending
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                Match Score: {resume.screeningResult.matchScore}%
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Resume Information</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Experience Level:</strong> {resume.parsedData.experience || 'N/A'}</p>
              <p><strong>Skills:</strong> {resume.parsedData.skills?.join(', ') || 'N/A'}</p>
              {resume.parsedData.summary && (
                <div>
                  <strong>Summary:</strong>
                  <p className="text-muted-foreground mt-1">{resume.parsedData.summary}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Analysis</h3>
            <div className="space-y-4">
              {resume.screeningResult.analysis.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-500 mb-1">Strengths</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {resume.screeningResult.analysis.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {resume.screeningResult.analysis.weaknesses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-yellow-500 mb-1">Weaknesses</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {resume.screeningResult.analysis.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {resume.screeningResult.analysis.matchingSkills.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Matching Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {resume.screeningResult.analysis.matchingSkills.map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-primary/20 text-primary rounded text-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {resume.screeningResult.analysis.missingSkills.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Missing Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {resume.screeningResult.analysis.missingSkills.map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-destructive/20 text-destructive rounded text-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {resume.screeningResult.analysis.recommendation && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Recommendation</h4>
                  <p className="text-sm text-muted-foreground">
                    {resume.screeningResult.analysis.recommendation}
                  </p>
                </div>
              )}

              {resume.screeningResult.rejectionReason && (
                <div>
                  <h4 className="text-sm font-semibold text-destructive mb-1">Rejection Reason</h4>
                  <p className="text-sm text-destructive">
                    {resume.screeningResult.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
