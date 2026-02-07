'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { ViolationTimeline } from '@/components/proctoring/ViolationTimeline';
import { AttentionHeatMap } from '@/components/proctoring/AttentionHeatMap';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Camera,
  Clock,
  Loader2,
  User,
  Webcam,
  CheckCircle,
  XCircle,
  FileText,
  Activity,
  Info,
} from 'lucide-react';

interface ProctoringReport {
  _id: string;
  candidateId: { _id: string; name: string; email: string };
  jobId: { _id: string; title: string };
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
  autoSubmitted: boolean;
  autoSubmitReason: string;
  webcamEnabled: boolean;
  isActive: boolean;
  frameSnapshots: { timestamp: string; image: string }[];
  sessionStart: string;
  sessionEnd: string;
}

export default function ProctoringReportPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;
  const [report, setReport] = useState<ProctoringReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<number | null>(null);

  useEffect(() => {
    fetchReport();
  }, [attemptId]);

  const fetchReport = async () => {
    try {
      const response = await api.get(`/proctoring/report/${attemptId}`);
      setReport(response.data.proctoringLog);
    } catch (error) {
      console.error('Failed to fetch proctoring report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#4a9eff]" />
        <span className="ml-2 text-[#a3a3a3] text-sm">Loading report...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <span className="text-[#a3a3a3]">Proctoring report not found</span>
      </div>
    );
  }

  const sessionDuration = report.sessionEnd
    ? Math.floor(
        (new Date(report.sessionEnd).getTime() -
          new Date(report.sessionStart).getTime()) /
          1000
      )
    : 0;

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

  const getVerdict = () => {
    if (report.autoSubmitted) return { label: 'Auto-Submitted', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10 border-[#ef4444]/30' };
    if (report.integrityScore >= 80) return { label: 'Trustworthy', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10 border-[#10b981]/30' };
    if (report.integrityScore >= 50) return { label: 'Needs Review', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10 border-[#f59e0b]/30' };
    return { label: 'Suspicious', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10 border-[#ef4444]/30' };
  };

  const verdict = getVerdict();
  const totalPenalty = report.violations.reduce((sum, v) => sum + (v.penalty || 0), 0);
  const attentiveTime = Math.max(0, sessionDuration - report.attentionData.totalLookingAway);
  const attentionPercent = sessionDuration > 0 ? Math.round((attentiveTime / sessionDuration) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] sticky top-0 z-20 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#4a9eff]" />
              <h1 className="text-sm font-semibold text-[#e5e5e5]">
                Proctoring Report
              </h1>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded border text-xs font-medium ${verdict.bg} ${verdict.color}`}>
            {verdict.label}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Candidate Info Card */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                <User className="w-5 h-5 text-[#a3a3a3]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#e5e5e5]">
                  {report.candidateId.name}
                </h2>
                <p className="text-xs text-[#a3a3a3]">
                  {report.candidateId.email}
                </p>
                <p className="text-xs text-[#a3a3a3] mt-0.5">
                  Job: {report.jobId.title}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getScoreBg(report.integrityScore)}`}>
                <Shield className="w-5 h-5 text-[#4a9eff]" />
                <span
                  className={`text-3xl font-bold font-mono ${getScoreColor(
                    report.integrityScore
                  )}`}
                >
                  {report.integrityScore}
                </span>
                <span className="text-xs text-[#a3a3a3]">/100</span>
              </div>
              <p className="text-[10px] text-[#a3a3a3] mt-1">Integrity Score</p>
              <div className="flex items-center gap-1 mt-1 justify-end">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full ${
                      i < report.strikeCount ? 'bg-[#ef4444]' : 'bg-[#2a2a2a]'
                    }`}
                  />
                ))}
                <span className="text-[10px] text-[#a3a3a3] ml-1">
                  {report.strikeCount}/3 strikes
                </span>
              </div>
            </div>
          </div>

          {report.autoSubmitted && (
            <div className="mt-4 px-3 py-2 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
              <div>
                <span className="text-sm text-[#ef4444] font-medium">
                  Assessment auto-submitted due to integrity violations
                </span>
                <p className="text-xs text-[#ef4444]/70 mt-0.5">
                  Reason: {report.autoSubmitReason || 'Exceeded maximum warnings (3 strikes)'}
                </p>
              </div>
            </div>
          )}

          {/* Session Info */}
          <div className="mt-4 flex items-center gap-4 text-xs text-[#a3a3a3]">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(report.sessionStart).toLocaleString()}
                {report.sessionEnd && (
                  <> → {new Date(report.sessionEnd).toLocaleTimeString()}</>
                )}
              </span>
            </div>
            <span className="text-[#3a3a3a]">|</span>
            <span className="font-mono">
              Duration: {Math.floor(sessionDuration / 60)}m {sessionDuration % 60}s
            </span>
            <span className="text-[#3a3a3a]">|</span>
            <div className="flex items-center gap-1">
              <Webcam className="w-3 h-3" />
              <span>
                Webcam: {report.webcamEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-7 gap-2">
          {[
            {
              label: 'Duration',
              value: `${Math.floor(sessionDuration / 60)}m ${sessionDuration % 60}s`,
              desc: 'Total session time',
              color: 'text-[#e5e5e5]',
            },
            {
              label: 'Violations',
              value: report.violations.length,
              desc: 'Total incidents',
              color: report.violations.length > 0 ? 'text-[#ef4444]' : 'text-[#10b981]',
            },
            {
              label: 'Penalty',
              value: `-${totalPenalty}`,
              desc: 'Points deducted',
              color: 'text-[#ef4444]',
            },
            {
              label: 'Attention',
              value: `${attentionPercent}%`,
              desc: `${Math.round(attentiveTime)}s of ${sessionDuration}s`,
              color: attentionPercent >= 80 ? 'text-[#10b981]' : 'text-[#f59e0b]',
            },
            {
              label: 'Faces',
              value: report.attentionData.multipleFacesCount,
              desc: 'Multiple faces detected',
              color: 'text-[#e5e5e5]',
            },
            {
              label: 'Phones',
              value: report.attentionData.phoneDetectedCount,
              desc: 'Phone/device detected',
              color: 'text-[#e5e5e5]',
            },
            {
              label: 'Tab Switches',
              value: report.attentionData.tabSwitchCount,
              desc: 'Left assessment window',
              color: 'text-[#e5e5e5]',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-3 text-center"
            >
              <span className="text-[10px] text-[#a3a3a3] block mb-1">
                {stat.label}
              </span>
              <span className={`text-sm font-mono font-semibold block ${stat.color}`}>
                {stat.value}
              </span>
              <span className="text-[8px] text-[#3a3a3a] block mt-0.5">
                {stat.desc}
              </span>
            </div>
          ))}
        </div>

        {/* Proctoring Summary */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-[#4a9eff]" />
            <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide">
              Proctoring Summary
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#a3a3a3]">Webcam monitoring</span>
                {report.webcamEnabled ? (
                  <span className="flex items-center gap-1 text-[#10b981]">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[#ef4444]">
                    <XCircle className="w-3 h-3" /> Disabled
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a3a3a3]">Face detection</span>
                <span className="text-[#e5e5e5] font-mono">
                  {report.attentionData.multipleFacesCount} incidents
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a3a3a3]">Phone detection</span>
                <span className="text-[#e5e5e5] font-mono">
                  {report.attentionData.phoneDetectedCount} incidents
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#a3a3a3]">Tab switches</span>
                <span className="text-[#e5e5e5] font-mono">
                  {report.attentionData.tabSwitchCount} times
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a3a3a3]">Copy/paste attempts</span>
                <span className="text-[#e5e5e5] font-mono">
                  {report.attentionData.copyPasteCount} times
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#a3a3a3]">Looking away</span>
                <span className="text-[#e5e5e5] font-mono">
                  {Math.round(report.attentionData.totalLookingAway)}s total
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <span className="text-[#a3a3a3]">Final verdict:</span>
              <span className={`font-semibold ${verdict.color}`}>
                {verdict.label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#a3a3a3]">Completion:</span>
              <span className="text-[#e5e5e5] font-mono">
                {report.autoSubmitted ? 'Auto-submitted (integrity violation)' : report.isActive ? 'In progress' : 'Normal submission'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Attention Heat Map */}
          <AttentionHeatMap
            attentionData={report.attentionData}
            violations={report.violations}
            totalDuration={sessionDuration}
            integrityScore={report.integrityScore}
          />

          {/* Frame Snapshots */}
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Camera className="w-3.5 h-3.5 text-[#a3a3a3]" />
              <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide">
                Audit Snapshots ({report.frameSnapshots.length})
              </h3>
            </div>
            <p className="text-[10px] text-[#3a3a3a] mb-3">
              Periodic webcam captures taken every 30s for audit review. Click to enlarge.
            </p>
            {report.frameSnapshots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 max-h-[260px] overflow-y-auto">
                {report.frameSnapshots.map((snap, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setSelectedSnapshot(selectedSnapshot === i ? null : i)
                    }
                    className={`relative rounded border overflow-hidden transition-all ${
                      selectedSnapshot === i
                        ? 'border-[#4a9eff] ring-1 ring-[#4a9eff]/30'
                        : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                    }`}
                  >
                    <img
                      src={snap.image}
                      alt={`Snapshot ${i + 1}`}
                      className="w-full aspect-video object-cover"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-[#a3a3a3] text-center py-0.5 font-mono">
                      {new Date(snap.timestamp).toLocaleTimeString()}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-[#a3a3a3] text-xs">
                <div className="text-center">
                  <Camera className="w-6 h-6 text-[#2a2a2a] mx-auto mb-2" />
                  <p>No snapshots captured</p>
                  <p className="text-[10px] text-[#3a3a3a] mt-1">
                    Snapshots are taken when webcam is enabled
                  </p>
                </div>
              </div>
            )}

            {selectedSnapshot !== null &&
              report.frameSnapshots[selectedSnapshot] && (
                <div className="mt-3 border border-[#2a2a2a] rounded-lg overflow-hidden">
                  <img
                    src={report.frameSnapshots[selectedSnapshot].image}
                    alt="Selected snapshot"
                    className="w-full"
                  />
                  <div className="px-3 py-2 bg-[#1a1a1a] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-[#a3a3a3]" />
                      <span className="text-xs text-[#a3a3a3] font-mono">
                        {new Date(
                          report.frameSnapshots[selectedSnapshot].timestamp
                        ).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#3a3a3a]">
                      Frame {selectedSnapshot + 1} of{' '}
                      {report.frameSnapshots.length}
                    </span>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Violation Timeline */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />
              <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide">
                Complete Violation Timeline ({report.violations.length})
              </h3>
            </div>
            {report.violations.length > 0 && (
              <span className="text-[10px] text-[#ef4444] font-mono">
                Total penalty: -{totalPenalty} pts
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#3a3a3a] mb-3">
            Chronological record of every detected suspicious activity with timestamps, types, and penalty points.
          </p>
          <div className="max-h-[500px] overflow-y-auto">
            <ViolationTimeline violations={report.violations} />
          </div>
        </div>

        {/* Explanation Section */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-3.5 h-3.5 text-[#4a9eff]" />
            <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide">
              Understanding This Report
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs text-[#a3a3a3]">
            <div>
              <h4 className="text-[#e5e5e5] font-semibold mb-1.5">Integrity Score (0–100)</h4>
              <p className="text-[10px] leading-relaxed">
                Starts at 100 and is reduced by penalties for each violation.
                <span className="text-[#10b981]"> 80–100</span> = trustworthy,
                <span className="text-[#f59e0b]"> 50–79</span> = needs review,
                <span className="text-[#ef4444]"> 0–49</span> = suspicious.
              </p>
            </div>
            <div>
              <h4 className="text-[#e5e5e5] font-semibold mb-1.5">Three-Strike System</h4>
              <p className="text-[10px] leading-relaxed">
                Major violations (multiple faces, phone, tab switches) trigger strikes.
                After 3 strikes, the assessment is automatically submitted with an
                &quot;Integrity Violation&quot; flag.
              </p>
            </div>
            <div>
              <h4 className="text-[#e5e5e5] font-semibold mb-1.5">Penalty Weights</h4>
              <div className="text-[10px] space-y-0.5 font-mono">
                <p>Multiple faces: <span className="text-[#ef4444]">-15 pts</span></p>
                <p>Phone detected: <span className="text-[#ef4444]">-20 pts</span></p>
                <p>Tab switch: <span className="text-[#f59e0b]">-10 pts</span></p>
                <p>Copy/paste: <span className="text-[#f59e0b]">-15 pts</span></p>
                <p>Looking away (&gt;5s): <span className="text-[#4a9eff]">-5 pts</span></p>
              </div>
            </div>
            <div>
              <h4 className="text-[#e5e5e5] font-semibold mb-1.5">Attention Heat Map</h4>
              <p className="text-[10px] leading-relaxed">
                The heat map divides the session into time segments and color-codes
                each based on violation activity.
                <span style={{ color: 'rgba(74, 158, 255, 0.8)' }}> Blue</span> = attentive (no violations),
                <span className="text-[#f59e0b]"> Yellow</span> = minor issues,
                <span className="text-[#ef4444]"> Red</span> = major violations.
                Hover over cells for details. Reading order: left→right, top→bottom.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
