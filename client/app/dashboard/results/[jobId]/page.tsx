'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { ArrowLeft, Download } from 'lucide-react';

interface Result {
  _id: string;
  candidateId: {
    name: string;
    email: string;
  };
  overallScore: number;
  rank: number;
  percentile: number;
  skillBreakdown: any;
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const [results, setResults] = useState<Result[]>([]);
  const [leaderboard, setLeaderboard] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
    fetchLeaderboard();
  }, [jobId]);

  const fetchResults = async () => {
    try {
      const response = await api.get(`/results/${jobId}`);
      setResults(response.data.results);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get(`/results/leaderboard/${jobId}`);
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const handleViewReport = async (candidateId: string) => {
    try {
      const response = await api.get(`/results/report/${candidateId}/${jobId}`);
      const report = response.data.report;
      
      // Create a downloadable report
      const reportText = `
Candidate Assessment Report
===========================

Executive Summary:
${report.executiveSummary}

Strengths:
${report.strengths.map((s: string) => `- ${s}`).join('\n')}

Weaknesses:
${report.weaknesses.map((w: string) => `- ${w}`).join('\n')}

Skill Gap Analysis:
${report.skillGapAnalysis?.recommendations || 'N/A'}

Overall Rating: ${report.overallRating}

Metrics:
- Overall Score: ${report.metrics.overallScore}%
- Rank: ${report.metrics.rank}
- Percentile: ${report.metrics.percentile}%
      `;

      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${candidateId}.txt`;
      a.click();
    } catch (error) {
      alert('Failed to generate report');
    }
  };

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

        <h1 className="text-3xl font-bold mb-6">Assessment Results</h1>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((result, index) => (
                  <div
                    key={result._id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                        {result.rank}
                      </div>
                      <div>
                        <p className="font-semibold">{result.candidateId.name}</p>
                        <p className="text-sm text-muted-foreground">{result.candidateId.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{result.overallScore.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">Percentile: {result.percentile.toFixed(1)}%</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const id = typeof result.candidateId === 'object' 
                            ? result.candidateId._id 
                            : result.candidateId;
                          handleViewReport(id);
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result._id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{result.candidateId.name}</p>
                      <p className="text-sm text-muted-foreground">{result.candidateId.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">Score: {result.overallScore.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">Rank: {result.rank}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const id = typeof result.candidateId === 'object' 
                            ? result.candidateId._id 
                            : result.candidateId;
                          handleViewReport(id);
                        }}
                      >
                        View Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
