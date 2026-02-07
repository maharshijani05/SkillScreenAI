'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import {
  ArrowLeft,
  Download,
  Trophy,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  BarChart3,
  CheckCircle,
  Lock,
  Unlock,
  Users,
} from 'lucide-react';

interface Result {
  _id: string;
  candidateId: {
    _id: string;
    name: string;
    email: string;
  };
  overallScore: number;
  rank: number;
  percentile: number;
  skillBreakdown: any;
  isShortlisted?: boolean;
}

interface BiasMetrics {
  totalCandidates: number;
  metricsAvailable: boolean;
  message?: string;
  averageScore?: number;
  medianScore?: number;
  standardDeviation?: number;
  fairnessIndex?: number;
  scoreDistribution?: {
    excellent: number;
    good: number;
    average: number;
    belowAverage: number;
  };
  biasIndicators?: {
    evaluationConsistency: string;
    scoreSpread: string;
    performanceGap: number;
  };
  anonymousHiringBenefits?: string[];
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const [results, setResults] = useState<Result[]>([]);
  const [leaderboard, setLeaderboard] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [identitiesRevealed, setIdentitiesRevealed] = useState(false);
  const [selectedForShortlist, setSelectedForShortlist] = useState<Set<string>>(new Set());
  const [shortlisting, setShortlisting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [showBiasMetrics, setShowBiasMetrics] = useState(false);
  const [biasMetrics, setBiasMetrics] = useState<BiasMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    fetchResults();
    fetchLeaderboard();
  }, [jobId]);

  const fetchResults = async () => {
    try {
      const response = await api.get(`/results/${jobId}`);
      setResults(response.data.results);
      setAnonymousMode(response.data.anonymousMode || false);
      setIdentitiesRevealed(response.data.identitiesRevealed || false);
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

  const fetchBiasMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const response = await api.get(`/results/bias-metrics/${jobId}`);
      setBiasMetrics(response.data.metrics);
      setShowBiasMetrics(true);
    } catch (error) {
      console.error('Failed to fetch bias metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleViewReport = async (candidateId: string) => {
    try {
      const response = await api.get(`/results/report/${candidateId}/${jobId}`);
      const report = response.data.report;

      if (report.anonymousMode) {
        // Show neutral summary for anonymous mode
        const reportText = `
Anonymous Candidate Assessment Report
======================================

Summary:
${report.summary}

Strengths:
${report.strengths?.map((s: string) => `- ${s}`).join('\n') || '- N/A'}

Areas for Improvement:
${report.areasForImprovement?.map((a: string) => `- ${a}`).join('\n') || '- N/A'}

Recommendation: ${report.recommendation?.replace(/_/g, ' ').toUpperCase()}

Metrics:
- Overall Score: ${report.metrics?.overallScore?.toFixed(1)}%
- Rank: #${report.metrics?.rank}
- Percentile: ${report.metrics?.percentile?.toFixed(0)}%

Note: Identity hidden under Anonymous Hiring Mode.
        `;

        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anonymous-report-rank-${report.metrics?.rank}.txt`;
        a.click();
        return;
      }

      const reportText = `
Candidate Assessment Report
===========================

Executive Summary:
${report.executiveSummary}

Strengths:
${report.strengths?.map((s: string) => `- ${s}`).join('\n')}

Weaknesses:
${report.weaknesses?.map((w: string) => `- ${w}`).join('\n')}

Skill Gap Analysis:
${report.skillGapAnalysis?.recommendations || 'N/A'}

Overall Rating: ${report.overallRating}

Metrics:
- Overall Score: ${report.metrics?.overallScore}%
- Rank: ${report.metrics?.rank}
- Percentile: ${report.metrics?.percentile}%
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

  const toggleShortlist = (candidateId: string) => {
    setSelectedForShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const handleShortlist = async () => {
    if (selectedForShortlist.size === 0) {
      alert('Please select at least one candidate to shortlist');
      return;
    }
    setShortlisting(true);
    try {
      await api.post(`/jobs/${jobId}/shortlist`, {
        candidateIds: Array.from(selectedForShortlist),
      });
      alert(`${selectedForShortlist.size} candidate(s) shortlisted successfully!`);
      fetchResults();
      fetchLeaderboard();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to shortlist');
    } finally {
      setShortlisting(false);
    }
  };

  const handleRevealIdentities = async () => {
    if (!confirm('Are you sure you want to reveal candidate identities? This action cannot be undone.')) return;
    setRevealing(true);
    try {
      await api.post(`/jobs/${jobId}/reveal-identities`);
      setIdentitiesRevealed(true);
      fetchResults();
      fetchLeaderboard();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reveal identities');
    } finally {
      setRevealing(false);
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

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          {anonymousMode && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2 py-1 bg-[#4a9eff]/10 border border-[#4a9eff]/30 rounded text-xs text-[#4a9eff]">
                <EyeOff className="w-3 h-3" />
                Anonymous Hiring Mode
              </span>
              {identitiesRevealed && (
                <span className="flex items-center gap-1 px-2 py-1 bg-[#10b981]/10 border border-[#10b981]/30 rounded text-xs text-[#10b981]">
                  <Unlock className="w-3 h-3" />
                  Identities Revealed
                </span>
              )}
            </div>
          )}
        </div>

        <h1 className="text-xl font-semibold text-[#e5e5e5] mb-6">
          Assessment Results
        </h1>

        {/* Anonymous Mode Actions */}
        {anonymousMode && (
          <div className="bg-[#121212] border border-[#4a9eff]/20 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-[#4a9eff]" />
                <div>
                  <p className="text-sm text-[#e5e5e5] font-medium">
                    Anonymous Hiring Active
                  </p>
                  <p className="text-[10px] text-[#a3a3a3]">
                    Candidate identities are hidden. Evaluate purely on performance.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchBiasMetrics}
                  disabled={loadingMetrics}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-[#e5e5e5] hover:bg-[#2a2a2a] transition-colors"
                >
                  {loadingMetrics ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <BarChart3 className="w-3 h-3" />
                  )}
                  Bias Metrics
                </button>
                {!identitiesRevealed && (
                  <>
                    <button
                      onClick={handleShortlist}
                      disabled={shortlisting || selectedForShortlist.size === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981]/10 border border-[#10b981]/30 rounded text-xs text-[#10b981] hover:bg-[#10b981]/20 disabled:opacity-50 transition-colors"
                    >
                      {shortlisting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserCheck className="w-3 h-3" />
                      )}
                      Shortlist ({selectedForShortlist.size})
                    </button>
                    <button
                      onClick={handleRevealIdentities}
                      disabled={revealing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded text-xs text-[#f59e0b] hover:bg-[#f59e0b]/20 disabled:opacity-50 transition-colors"
                    >
                      {revealing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                      Reveal Identities
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bias Metrics Panel */}
        {showBiasMetrics && biasMetrics && (
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#4a9eff]" />
                <h2 className="text-sm font-semibold text-[#e5e5e5]">
                  Bias Reduction Metrics
                </h2>
              </div>
              <button
                onClick={() => setShowBiasMetrics(false)}
                className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
              >
                <span className="text-xs">Close</span>
              </button>
            </div>

            {biasMetrics.metricsAvailable ? (
              <div className="space-y-4">
                {/* Key Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3 text-center">
                    <span className="text-[10px] text-[#a3a3a3] block mb-1">
                      Candidates
                    </span>
                    <span className="text-lg font-mono font-bold text-[#e5e5e5]">
                      {biasMetrics.totalCandidates}
                    </span>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3 text-center">
                    <span className="text-[10px] text-[#a3a3a3] block mb-1">
                      Fairness Index
                    </span>
                    <span className={`text-lg font-mono font-bold ${
                      (biasMetrics.fairnessIndex || 0) >= 70
                        ? 'text-[#10b981]'
                        : (biasMetrics.fairnessIndex || 0) >= 40
                        ? 'text-[#f59e0b]'
                        : 'text-[#ef4444]'
                    }`}>
                      {biasMetrics.fairnessIndex}%
                    </span>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3 text-center">
                    <span className="text-[10px] text-[#a3a3a3] block mb-1">
                      Avg Score
                    </span>
                    <span className="text-lg font-mono font-bold text-[#e5e5e5]">
                      {biasMetrics.averageScore}%
                    </span>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3 text-center">
                    <span className="text-[10px] text-[#a3a3a3] block mb-1">
                      Consistency
                    </span>
                    <span className={`text-lg font-mono font-bold ${
                      biasMetrics.biasIndicators?.evaluationConsistency === 'High'
                        ? 'text-[#10b981]'
                        : biasMetrics.biasIndicators?.evaluationConsistency === 'Moderate'
                        ? 'text-[#f59e0b]'
                        : 'text-[#ef4444]'
                    }`}>
                      {biasMetrics.biasIndicators?.evaluationConsistency}
                    </span>
                  </div>
                </div>

                {/* Score Distribution */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3">
                    <h3 className="text-xs font-semibold text-[#a3a3a3] mb-2">
                      Score Distribution
                    </h3>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Excellent (80-100%)', count: biasMetrics.scoreDistribution?.excellent, color: '#10b981' },
                        { label: 'Good (60-79%)', count: biasMetrics.scoreDistribution?.good, color: '#4a9eff' },
                        { label: 'Average (40-59%)', count: biasMetrics.scoreDistribution?.average, color: '#f59e0b' },
                        { label: 'Below Avg (<40%)', count: biasMetrics.scoreDistribution?.belowAverage, color: '#ef4444' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-[10px] text-[#a3a3a3]">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  backgroundColor: item.color,
                                  width: `${biasMetrics.totalCandidates > 0 ? ((item.count || 0) / biasMetrics.totalCandidates) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-[#e5e5e5] w-4 text-right">
                              {item.count || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3">
                    <h3 className="text-xs font-semibold text-[#a3a3a3] mb-2">
                      Bias Elimination Benefits
                    </h3>
                    <div className="space-y-1.5">
                      {biasMetrics.anonymousHiringBenefits?.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <CheckCircle className="w-3 h-3 text-[#10b981] mt-0.5 flex-shrink-0" />
                          <span className="text-[10px] text-[#a3a3a3]">{benefit}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#a3a3a3]">Score Range</span>
                        <span className="font-mono text-[#e5e5e5]">
                          {biasMetrics.biasIndicators?.scoreSpread}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] mt-1">
                        <span className="text-[#a3a3a3]">Std Deviation</span>
                        <span className="font-mono text-[#e5e5e5]">
                          {biasMetrics.standardDeviation}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#a3a3a3]">{biasMetrics.message || 'No data available'}</p>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg mb-4">
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#f59e0b]" />
            <h2 className="text-sm font-semibold text-[#e5e5e5]">
              Leaderboard
            </h2>
            {anonymousMode && !identitiesRevealed && (
              <Lock className="w-3 h-3 text-[#4a9eff] ml-1" />
            )}
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {leaderboard.length === 0 ? (
              <div className="px-4 py-6 text-center text-[#a3a3a3] text-xs">
                No results yet
              </div>
            ) : (
              leaderboard.map((result) => {
                const candidateId =
                  typeof result.candidateId === 'object'
                    ? result.candidateId._id
                    : result.candidateId;

                const isAnonymized =
                  anonymousMode &&
                  !identitiesRevealed &&
                  result.candidateId?.email?.includes('@anonymous');

                return (
                  <div
                    key={result._id}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {/* Shortlist checkbox in anonymous mode */}
                      {anonymousMode && !identitiesRevealed && (
                        <button
                          onClick={() => toggleShortlist(candidateId)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            selectedForShortlist.has(candidateId)
                              ? 'bg-[#10b981] border-[#10b981]'
                              : 'border-[#3a3a3a] hover:border-[#4a9eff]'
                          }`}
                        >
                          {selectedForShortlist.has(candidateId) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </button>
                      )}

                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                          result.rank === 1
                            ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                            : result.rank === 2
                            ? 'bg-[#a3a3a3]/20 text-[#a3a3a3]'
                            : result.rank === 3
                            ? 'bg-[#cd7f32]/20 text-[#cd7f32]'
                            : 'bg-[#1a1a1a] text-[#a3a3a3]'
                        }`}
                      >
                        {result.rank}
                      </div>
                      <div>
                        <p className="text-sm text-[#e5e5e5] flex items-center gap-1.5">
                          {isAnonymized && <EyeOff className="w-3 h-3 text-[#4a9eff]" />}
                          {result.candidateId?.name || 'Unknown'}
                        </p>
                        {!isAnonymized && (
                          <p className="text-[10px] text-[#a3a3a3]">
                            {result.candidateId?.email}
                          </p>
                        )}
                        {result.isShortlisted && (
                          <span className="flex items-center gap-1 text-[10px] text-[#10b981]">
                            <UserCheck className="w-2.5 h-2.5" />
                            Shortlisted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold text-[#e5e5e5]">
                          {result.overallScore?.toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-[#a3a3a3]">
                          P{result.percentile?.toFixed(0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewReport(candidateId)}
                          className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
                          title="Download Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/dashboard/proctoring/${result._id}`)
                          }
                          className="p-1.5 text-[#a3a3a3] hover:text-[#4a9eff] transition-colors"
                          title="View Proctoring Report"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* All Results */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg">
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#e5e5e5]">
              All Results
            </h2>
            <span className="text-[10px] text-[#a3a3a3]">
              {results.length} candidate{results.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-[#a3a3a3] text-xs">
                No results yet
              </div>
            ) : (
              results.map((result) => {
                const candidateId =
                  typeof result.candidateId === 'object'
                    ? result.candidateId._id
                    : result.candidateId;

                const isAnonymized =
                  anonymousMode &&
                  !identitiesRevealed &&
                  result.candidateId?.email?.includes('@anonymous');

                return (
                  <div
                    key={result._id}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {/* Shortlist checkbox in anonymous mode */}
                      {anonymousMode && !identitiesRevealed && (
                        <button
                          onClick={() => toggleShortlist(candidateId)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            selectedForShortlist.has(candidateId)
                              ? 'bg-[#10b981] border-[#10b981]'
                              : 'border-[#3a3a3a] hover:border-[#4a9eff]'
                          }`}
                        >
                          {selectedForShortlist.has(candidateId) && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </button>
                      )}

                      <div>
                        <p className="text-sm text-[#e5e5e5] flex items-center gap-1.5">
                          {isAnonymized && <EyeOff className="w-3 h-3 text-[#4a9eff]" />}
                          {result.candidateId?.name || 'Unknown'}
                        </p>
                        {!isAnonymized && (
                          <p className="text-[10px] text-[#a3a3a3]">
                            {result.candidateId?.email}
                          </p>
                        )}
                        {result.isShortlisted && (
                          <span className="flex items-center gap-1 text-[10px] text-[#10b981]">
                            <UserCheck className="w-2.5 h-2.5" />
                            Shortlisted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold text-[#e5e5e5]">
                          {result.overallScore?.toFixed(1)}%
                        </p>
                        <p className="text-[10px] text-[#a3a3a3]">
                          Rank #{result.rank}
                        </p>
                      </div>
                      <button
                        onClick={() => handleViewReport(candidateId)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Report
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
