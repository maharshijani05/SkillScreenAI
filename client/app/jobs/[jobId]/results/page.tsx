'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { ArrowLeft, Trophy, TrendingUp } from 'lucide-react';

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [jobId]);

  const fetchResult = async () => {
    try {
      const results = await api.get(`/results/${jobId}`);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userResult = results.data.results.find(
        (r: any) => r.candidateId._id === user.id || r.candidateId === user.id
      );
      setResult(userResult);
    } catch (error) {
      console.error('Failed to fetch result:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => router.push('/jobs')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No results found for this assessment.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.push('/jobs')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Button>

        <h1 className="text-3xl font-bold mb-6">Your Results</h1>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Overall Score</span>
                <span className="text-2xl font-bold">{result.overallScore.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rank</span>
                <span className="text-xl font-semibold">#{result.rank}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Percentile</span>
                <span className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {result.percentile.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {result.skillBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle>Section Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(result.skillBreakdown).map(([section, score]: [string, any]) => (
                  <div key={section} className="flex items-center justify-between">
                    <span className="capitalize text-muted-foreground">{section}</span>
                    <span className="text-lg font-semibold">{score.toFixed(1)}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
