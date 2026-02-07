'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Trophy, TrendingUp, Loader2 } from 'lucide-react';

export default function CandidateResultsPage() {
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
        (r: any) =>
          r.candidateId._id === user.id || r.candidateId === user.id
      );
      setResult(userResult);
    } catch (error) {
      console.error('Failed to fetch result:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#4a9eff]" />
        <span className="ml-2 text-sm text-[#a3a3a3]">Loading results...</span>
      </div>
    );
  }

  if (!result) {
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
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-8 text-center">
            <p className="text-sm text-[#a3a3a3]">
              Results are being processed. Please check back later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#10b981]';
    if (score >= 50) return 'text-[#f59e0b]';
    return 'text-[#ef4444]';
  };

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
          Your Results
        </h1>

        {/* Overall Score */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-[#f59e0b]" />
            <h2 className="text-sm font-semibold text-[#e5e5e5]">
              Overall Performance
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <span className="text-xs text-[#a3a3a3] block mb-1">Score</span>
              <span
                className={`text-2xl font-bold font-mono ${getScoreColor(
                  result.overallScore
                )}`}
              >
                {result.overallScore.toFixed(1)}%
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs text-[#a3a3a3] block mb-1">Rank</span>
              <span className="text-2xl font-bold font-mono text-[#e5e5e5]">
                #{result.rank}
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs text-[#a3a3a3] block mb-1">
                Percentile
              </span>
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4 text-[#4a9eff]" />
                <span className="text-2xl font-bold font-mono text-[#e5e5e5]">
                  {result.percentile.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Scores */}
        {result.skillBreakdown && (
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-6">
            <h2 className="text-sm font-semibold text-[#e5e5e5] mb-4">
              Section Scores
            </h2>
            <div className="space-y-3">
              {Object.entries(result.skillBreakdown).map(
                ([section, score]: [string, any]) => (
                  <div key={section}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#a3a3a3] capitalize">
                        {section}
                      </span>
                      <span
                        className={`text-sm font-mono font-semibold ${getScoreColor(
                          score
                        )}`}
                      >
                        {score.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${score}%`,
                          backgroundColor:
                            score >= 80
                              ? '#10b981'
                              : score >= 50
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
