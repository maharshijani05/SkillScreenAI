'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { Upload, ArrowLeft, CheckCircle2, XCircle, FileText } from 'lucide-react';

export default function ResumeUploadPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [resumeStatus, setResumeStatus] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf' && selectedFile.type !== 'text/plain') {
        setError('Only PDF and text files are allowed');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobId', jobId);

      const response = await api.post('/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResumeStatus(response.data.resume.screeningResult);
      
      if (response.data.resume.screeningResult.status === 'approved') {
        setTimeout(() => {
          router.push(`/jobs/${jobId}/assessment`);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="max-w-2xl mx-auto">
          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Upload Resume
              </CardTitle>
              <CardDescription>
                Upload your resume for screening. Only approved candidates can proceed to the assessment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!resumeStatus ? (
                <form onSubmit={handleUpload} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="resume">Resume File (PDF or TXT)</Label>
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    {file && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={!file || uploading}>
                    {uploading ? (
                      <>
                        <Upload className="mr-2 h-4 w-4 animate-pulse" />
                        Uploading and Screening...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Resume
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  {resumeStatus.status === 'approved' ? (
                    <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <h3 className="text-lg font-semibold text-green-500">Resume Approved!</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your resume has been approved. Match Score: {resumeStatus.matchScore}%
                      </p>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Strengths:</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {resumeStatus.analysis?.strengths?.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        Redirecting to assessment...
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <XCircle className="h-6 w-6 text-destructive" />
                        <h3 className="text-lg font-semibold text-destructive">Application Rejected</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {resumeStatus.rejectionReason || 'Your resume does not match the job requirements.'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Match Score: {resumeStatus.matchScore}%
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
