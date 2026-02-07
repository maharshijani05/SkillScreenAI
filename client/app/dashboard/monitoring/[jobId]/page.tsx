'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { getConnectedSocket, disconnectSocket } from '@/lib/socket';
import { ViolationTimeline } from '@/components/proctoring/ViolationTimeline';
import { AttentionHeatMap } from '@/components/proctoring/AttentionHeatMap';
import {
  ArrowLeft,
  Users,
  Shield,
  AlertTriangle,
  Eye,
  Radio,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';

interface ActiveCandidate {
  _id: string;
  candidateId: {
    _id: string;
    name: string;
    email: string;
  };
  attemptId: {
    _id: string;
    startedAt: string;
    submittedAt?: string;
    score?: number;
  };
  integrityScore: number;
  strikeCount: number;
  violations: any[];
  attentionData: {
    totalLookingAway: number;
    tabSwitchCount: number;
    copyPasteCount: number;
    multipleFacesCount: number;
    phoneDetectedCount: number;
  };
  webcamEnabled: boolean;
  isActive: boolean;
  autoSubmitted: boolean;
  autoSubmitReason?: string;
  latestFrame?: string;
  sessionStart: string;
  sessionEnd?: string;
}

export default function MonitoringPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const [sessions, setSessions] = useState<ActiveCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(
    null
  );
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const fetchActiveSessions = useCallback(async () => {
    try {
      setError('');
      const response = await api.get(`/proctoring/active/${jobId}`);
      setSessions(response.data.sessions || []);
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchActiveSessions();

    // Auto-refresh every 15 seconds
    const refreshInterval = setInterval(fetchActiveSessions, 15000);

    // Setup socket for real-time updates
    let socketCleanup: (() => void) | null = null;

    const setupSocket = async () => {
      try {
        const socket = await getConnectedSocket();
        setSocketConnected(true);

        socket.emit('join-monitoring', jobId);

        const onViolation = (data: any) => {
          setLiveAlerts((prev) => [data, ...prev].slice(0, 50));
          setSessions((prev) =>
            prev.map((s) => {
              const attemptMatch =
                (s.attemptId?._id || s.attemptId) === data.attemptId;
              if (!attemptMatch) return s;
              return {
                ...s,
                integrityScore: data.integrityScore ?? s.integrityScore,
                strikeCount: data.strikeCount ?? s.strikeCount,
                violations: [
                  ...s.violations,
                  {
                    type: data.violation?.type,
                    details: data.violation?.details,
                    penalty: data.violation?.penalty,
                    timestamp: data.timestamp,
                  },
                ],
              };
            })
          );
        };

        const onIntegrityUpdate = (data: any) => {
          setSessions((prev) =>
            prev.map((s) => {
              const attemptMatch =
                (s.attemptId?._id || s.attemptId) === data.attemptId;
              if (!attemptMatch) return s;
              return {
                ...s,
                integrityScore: data.integrityScore ?? s.integrityScore,
                strikeCount: data.strikeCount ?? s.strikeCount,
                attentionData: data.attentionData || s.attentionData,
              };
            })
          );
        };

        const onSnapshot = (data: any) => {
          setSessions((prev) =>
            prev.map((s) => {
              const attemptMatch =
                (s.attemptId?._id || s.attemptId) === data.attemptId;
              if (!attemptMatch) return s;
              return { ...s, latestFrame: data.frame };
            })
          );
        };

        const onAutoSubmitted = (data: any) => {
          setLiveAlerts((prev) =>
            [
              {
                ...data,
                violation: {
                  type: 'auto_submit',
                  details: data.reason,
                  penalty: 0,
                },
              },
              ...prev,
            ].slice(0, 50)
          );
          setSessions((prev) =>
            prev.map((s) => {
              const attemptMatch =
                (s.attemptId?._id || s.attemptId) === data.attemptId;
              if (!attemptMatch) return s;
              return { ...s, isActive: false, autoSubmitted: true };
            })
          );
        };

        const onDisconnect = () => setSocketConnected(false);
        const onReconnect = () => {
          setSocketConnected(true);
          socket.emit('join-monitoring', jobId);
        };

        socket.on('candidate-violation', onViolation);
        socket.on('candidate-integrity-update', onIntegrityUpdate);
        socket.on('candidate-snapshot', onSnapshot);
        socket.on('candidate-auto-submitted', onAutoSubmitted);
        socket.on('disconnect', onDisconnect);
        socket.on('connect', onReconnect);

        socketCleanup = () => {
          socket.off('candidate-violation', onViolation);
          socket.off('candidate-integrity-update', onIntegrityUpdate);
          socket.off('candidate-snapshot', onSnapshot);
          socket.off('candidate-auto-submitted', onAutoSubmitted);
          socket.off('disconnect', onDisconnect);
          socket.off('connect', onReconnect);
        };
      } catch (e) {
        console.error('Socket connection failed:', e);
        setSocketConnected(false);
      }
    };

    setupSocket();

    return () => {
      clearInterval(refreshInterval);
      if (socketCleanup) socketCleanup();
      disconnectSocket();
    };
  }, [jobId, fetchActiveSessions]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#10b981]';
    if (score >= 50) return 'text-[#f59e0b]';
    return 'text-[#ef4444]';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-[#10b981]/10 border-[#10b981]/30';
    if (score >= 50) return 'bg-[#f59e0b]/10 border-[#f59e0b]/30';
    return 'bg-[#ef4444]/10 border-[#ef4444]/30';
  };

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'active') return s.isActive;
    if (filter === 'completed') return !s.isActive;
    return true;
  });

  const selected = sessions.find(
    (s) => s.candidateId?._id === selectedCandidate
  );

  const activeCnt = sessions.filter((s) => s.isActive).length;
  const completedCnt = sessions.filter((s) => !s.isActive).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#4a9eff]" />
        <span className="ml-2 text-[#a3a3a3] text-sm">
          Loading monitoring dashboard...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] bg-[#0a0a0a] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#ef4444]" />
              <h1 className="text-sm font-semibold text-[#e5e5e5]">
                Proctoring Monitor
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              {socketConnected ? (
                <div className="flex items-center gap-1 text-[#10b981]">
                  <Wifi className="w-3 h-3" />
                  <span>Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[#f59e0b]">
                  <WifiOff className="w-3 h-3" />
                  <span>Polling</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[#a3a3a3]">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                {activeCnt} active
              </span>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3a3a3a]" />
                {completedCnt} completed
              </span>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                fetchActiveSessions();
              }}
              className="p-1.5 text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {error && (
          <div className="mb-4 px-3 py-2 text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/30 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-4">
          {/* Left: Candidate list */}
          <div className="col-span-4">
            {/* Filter Tabs */}
            <div className="flex gap-1 mb-3">
              {(['all', 'active', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-[#4a9eff] text-white'
                      : 'bg-[#121212] border border-[#2a2a2a] text-[#a3a3a3] hover:bg-[#1a1a1a]'
                  }`}
                >
                  {f === 'all'
                    ? `All (${sessions.length})`
                    : f === 'active'
                    ? `Active (${activeCnt})`
                    : `Completed (${completedCnt})`}
                </button>
              ))}
            </div>

            <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg">
              <div className="px-4 py-3 border-b border-[#2a2a2a]">
                <h2 className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide">
                  Sessions
                </h2>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Users className="w-6 h-6 text-[#2a2a2a] mx-auto mb-2" />
                  <p className="text-sm text-[#a3a3a3]">
                    {filter === 'active'
                      ? 'No active sessions'
                      : filter === 'completed'
                      ? 'No completed sessions'
                      : 'No sessions found'}
                  </p>
                  <p className="text-[10px] text-[#3a3a3a] mt-1">
                    Sessions appear here when candidates take assessments
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#1a1a1a] max-h-[500px] overflow-y-auto">
                  {filteredSessions.map((session) => (
                    <button
                      key={session._id || session.candidateId?._id}
                      onClick={() =>
                        setSelectedCandidate(session.candidateId?._id)
                      }
                      className={`w-full px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors ${
                        selectedCandidate === session.candidateId?._id
                          ? 'bg-[#1a1a1a]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          {session.isActive ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                          ) : session.autoSubmitted ? (
                            <XCircle className="w-3 h-3 text-[#ef4444]" />
                          ) : (
                            <CheckCircle className="w-3 h-3 text-[#a3a3a3]" />
                          )}
                          <span className="text-sm text-[#e5e5e5] font-medium truncate">
                            {session.candidateId?.name || 'Unknown'}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-mono font-bold ${getScoreColor(
                            session.integrityScore
                          )}`}
                        >
                          {session.integrityScore}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#a3a3a3] truncate">
                          {session.isActive ? (
                            <span className="text-[#10b981]">In progress</span>
                          ) : session.autoSubmitted ? (
                            <span className="text-[#ef4444]">Auto-submitted</span>
                          ) : (
                            <span>Completed</span>
                          )}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < session.strikeCount
                                  ? 'bg-[#ef4444]'
                                  : 'bg-[#2a2a2a]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {session.violations?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-[#f59e0b]" />
                          <span className="text-[10px] text-[#f59e0b]">
                            {session.violations.length} violations
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Live Alerts */}
            <div className="mt-4 bg-[#121212] border border-[#2a2a2a] rounded-lg">
              <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />
                <h2 className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide">
                  Live Alerts
                </h2>
              </div>
              <div className="max-h-[250px] overflow-y-auto">
                {liveAlerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[#a3a3a3] text-xs">
                    No alerts yet
                  </div>
                ) : (
                  <div className="divide-y divide-[#1a1a1a]">
                    {liveAlerts.slice(0, 20).map((alert, i) => (
                      <div key={i} className="px-4 py-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-[#e5e5e5]">
                            {alert.candidateName ||
                              alert.candidateId?.substring?.(0, 8) ||
                              'Unknown'}
                          </span>
                          <span className="text-[10px] text-[#a3a3a3] font-mono">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#f59e0b]">
                          {alert.violation?.type?.replace(/_/g, ' ')} -
                          {alert.violation?.penalty}pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Selected candidate detail */}
          <div className="col-span-8">
            {!selected ? (
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg flex items-center justify-center h-[600px]">
                <div className="text-center">
                  <Eye className="w-8 h-8 text-[#2a2a2a] mx-auto mb-2" />
                  <p className="text-sm text-[#a3a3a3]">
                    Select a candidate to view proctoring details
                  </p>
                  <p className="text-[10px] text-[#3a3a3a] mt-1">
                    Click on a session from the left panel
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Candidate Header */}
                <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-semibold text-[#e5e5e5]">
                          {selected.candidateId?.name}
                        </h2>
                        {selected.isActive ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#10b981]/10 border border-[#10b981]/30 rounded text-[10px] text-[#10b981]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                            In Progress
                          </span>
                        ) : selected.autoSubmitted ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded text-[10px] text-[#ef4444]">
                            <XCircle className="w-2.5 h-2.5" />
                            Auto-Submitted
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#3a3a3a]/30 border border-[#3a3a3a] rounded text-[10px] text-[#a3a3a3]">
                            <CheckCircle className="w-2.5 h-2.5" />
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#a3a3a3]">
                        {selected.candidateId?.email}
                      </p>
                      {selected.sessionStart && (
                        <p className="text-[10px] text-[#3a3a3a] mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Started:{' '}
                          {new Date(selected.sessionStart).toLocaleString()}
                          {selected.sessionEnd && (
                            <>
                              {' '}
                              • Ended:{' '}
                              {new Date(selected.sessionEnd).toLocaleString()}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-3 py-1.5 rounded border ${getScoreBg(
                          selected.integrityScore
                        )}`}
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-[#4a9eff]" />
                          <span
                            className={`text-xl font-bold font-mono ${getScoreColor(
                              selected.integrityScore
                            )}`}
                          >
                            {selected.integrityScore}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full ${
                              i < selected.strikeCount
                                ? 'bg-[#ef4444]'
                                : 'bg-[#2a2a2a]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {selected.autoSubmitted && selected.autoSubmitReason && (
                    <div className="mt-3 px-3 py-2 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded text-xs text-[#ef4444] flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Auto-submitted: {selected.autoSubmitReason}
                    </div>
                  )}

                  {/* Quick stats */}
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    <div className="bg-[#1a1a1a] rounded p-2 text-center">
                      <span className="text-[10px] text-[#a3a3a3] block">
                        Violations
                      </span>
                      <span className="text-sm font-mono font-semibold text-[#e5e5e5]">
                        {selected.violations?.length || 0}
                      </span>
                    </div>
                    <div className="bg-[#1a1a1a] rounded p-2 text-center">
                      <span className="text-[10px] text-[#a3a3a3] block">
                        Faces
                      </span>
                      <span className="text-sm font-mono font-semibold text-[#e5e5e5]">
                        {selected.attentionData?.multipleFacesCount || 0}
                      </span>
                    </div>
                    <div className="bg-[#1a1a1a] rounded p-2 text-center">
                      <span className="text-[10px] text-[#a3a3a3] block">
                        Phones
                      </span>
                      <span className="text-sm font-mono font-semibold text-[#e5e5e5]">
                        {selected.attentionData?.phoneDetectedCount || 0}
                      </span>
                    </div>
                    <div className="bg-[#1a1a1a] rounded p-2 text-center">
                      <span className="text-[10px] text-[#a3a3a3] block">
                        Tab Switches
                      </span>
                      <span className="text-sm font-mono font-semibold text-[#e5e5e5]">
                        {selected.attentionData?.tabSwitchCount || 0}
                      </span>
                    </div>
                    <div className="bg-[#1a1a1a] rounded p-2 text-center">
                      <span className="text-[10px] text-[#a3a3a3] block">
                        Look Away
                      </span>
                      <span className="text-sm font-mono font-semibold text-[#e5e5e5]">
                        {Math.round(
                          selected.attentionData?.totalLookingAway || 0
                        )}
                        s
                      </span>
                    </div>
                  </div>

                  {/* View Full Report button for completed sessions */}
                  {!selected.isActive && selected.attemptId?._id && (
                    <button
                      onClick={() =>
                        router.push(
                          `/dashboard/proctoring/${selected.attemptId._id}`
                        )
                      }
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-[#4a9eff] text-white text-xs font-medium rounded-lg hover:bg-[#3b8de6] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Full Proctoring Report
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Webcam Preview */}
                  <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide mb-3">
                      Latest Frame
                    </h3>
                    {selected.latestFrame ? (
                      <img
                        src={selected.latestFrame}
                        alt="Candidate webcam"
                        className="w-full rounded border border-[#2a2a2a]"
                      />
                    ) : (
                      <div className="aspect-video bg-[#1a1a1a] rounded flex items-center justify-center">
                        <span className="text-xs text-[#a3a3a3]">
                          No frame available
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Attention Heat Map */}
                  <AttentionHeatMap
                    attentionData={
                      selected.attentionData || {
                        totalLookingAway: 0,
                        tabSwitchCount: 0,
                        copyPasteCount: 0,
                        multipleFacesCount: 0,
                        phoneDetectedCount: 0,
                      }
                    }
                    violations={selected.violations || []}
                    totalDuration={
                      selected.sessionEnd
                        ? Math.floor(
                            (new Date(selected.sessionEnd).getTime() -
                              new Date(selected.sessionStart).getTime()) /
                              1000
                          )
                        : selected.sessionStart
                        ? Math.floor(
                            (Date.now() -
                              new Date(selected.sessionStart).getTime()) /
                              1000
                          )
                        : 0
                    }
                    integrityScore={selected.integrityScore}
                  />
                </div>

                {/* Violation Timeline */}
                <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide mb-3">
                    Violation Timeline
                  </h3>
                  <div className="max-h-[400px] overflow-y-auto">
                    {selected.violations?.length > 0 ? (
                      <ViolationTimeline violations={selected.violations} />
                    ) : (
                      <p className="text-xs text-[#a3a3a3] text-center py-4">
                        No violations recorded
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
