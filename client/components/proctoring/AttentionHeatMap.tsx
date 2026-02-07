'use client';

import React, { useMemo } from 'react';
import {
  Info,
  Eye,
  EyeOff,
  MonitorX,
  ClipboardCopy,
  Users,
  Smartphone,
} from 'lucide-react';

interface AttentionData {
  totalLookingAway: number;
  tabSwitchCount: number;
  copyPasteCount: number;
  multipleFacesCount: number;
  phoneDetectedCount: number;
}

interface Violation {
  type: string;
  timestamp: string | Date;
  penalty?: number;
  details?: string;
  duration?: number;
}

interface AttentionHeatMapProps {
  attentionData: AttentionData;
  violations?: Violation[];
  totalDuration: number; // in seconds
  integrityScore: number;
}

const VIOLATION_SEVERITY: Record<string, number> = {
  multiple_faces: 3,
  phone_detected: 3,
  tab_switch: 2,
  copy_paste: 2,
  looking_away: 1,
  right_click: 1,
  screenshot_attempt: 3,
  mouse_leave: 1,
};

export function AttentionHeatMap({
  attentionData,
  violations = [],
  totalDuration,
  integrityScore,
}: AttentionHeatMapProps) {
  const attentiveTime = Math.max(
    0,
    totalDuration - attentionData.totalLookingAway
  );
  const attentionPercent =
    totalDuration > 0
      ? Math.round((attentiveTime / totalDuration) * 100)
      : 100;

  // Build time-based heat map from actual violation data
  // Divide the session into time slots (cells in the grid)
  const gridCols = 12;
  const gridRows = 5;
  const totalCells = gridCols * gridRows;

  const { cells, peakMinute, quietMinute } = useMemo(() => {
    if (totalDuration <= 0) {
      return {
        cells: Array.from({ length: totalCells }, () => ({
          severity: 0,
          count: 0,
        })),
        peakMinute: -1,
        quietMinute: -1,
      };
    }

    const slotDuration = totalDuration / totalCells; // seconds per cell
    const sessionStart = violations.length > 0
      ? new Date(
          violations.reduce((min, v) => {
            const t = new Date(v.timestamp).getTime();
            return t < min ? t : min;
          }, Infinity)
        ).getTime()
      : 0;

    // Calculate the severity per cell based on violations occurring in that time slot
    const cellData = Array.from({ length: totalCells }, () => ({
      severity: 0,
      count: 0,
    }));

    for (const v of violations) {
      const vTime = new Date(v.timestamp).getTime();
      let cellIdx: number;

      if (sessionStart > 0 && totalDuration > 0) {
        const elapsed = (vTime - sessionStart) / 1000; // seconds from start
        cellIdx = Math.min(
          totalCells - 1,
          Math.max(0, Math.floor((elapsed / totalDuration) * totalCells))
        );
      } else {
        cellIdx = 0;
      }

      const sev = VIOLATION_SEVERITY[v.type] || 1;
      cellData[cellIdx].severity += sev;
      cellData[cellIdx].count += 1;
    }

    // Find peak and quiet minute-slots
    let maxSev = 0,
      peakIdx = -1;
    for (let i = 0; i < totalCells; i++) {
      if (cellData[i].severity > maxSev) {
        maxSev = cellData[i].severity;
        peakIdx = i;
      }
    }

    let quietIdx = -1;
    for (let i = 0; i < totalCells; i++) {
      if (cellData[i].severity === 0) {
        quietIdx = i;
        break;
      }
    }

    return { cells: cellData, peakMinute: peakIdx, quietMinute: quietIdx };
  }, [violations, totalDuration, totalCells]);

  // Calculate max severity for normalization
  const maxSeverity = Math.max(1, ...cells.map((c) => c.severity));

  // Color function: green (safe) → yellow → red (many violations)
  const getCellColor = (severity: number): string => {
    if (severity === 0)
      return 'rgba(74, 158, 255, 0.15)'; // Calm blue = attentive
    const ratio = severity / maxSeverity;
    if (ratio < 0.33)
      return `rgba(245, 158, 11, ${0.3 + ratio * 0.7})`; // Yellow
    if (ratio < 0.66)
      return `rgba(239, 68, 68, ${0.4 + ratio * 0.4})`; // Orange-red
    return `rgba(239, 68, 68, ${0.6 + ratio * 0.4})`; // Red
  };

  // Violation type breakdown for the summary
  const violationBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of violations) {
      counts[v.type] = (counts[v.type] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type, count }));
  }, [violations]);

  const violationIcons: Record<string, React.ElementType> = {
    tab_switch: MonitorX,
    copy_paste: ClipboardCopy,
    multiple_faces: Users,
    phone_detected: Smartphone,
    looking_away: EyeOff,
  };

  const violationLabels: Record<string, string> = {
    tab_switch: 'Tab Switch',
    copy_paste: 'Copy/Paste',
    multiple_faces: 'Multiple Faces',
    phone_detected: 'Phone Detected',
    looking_away: 'Looking Away',
    right_click: 'Right Click',
    screenshot_attempt: 'Screenshot',
    mouse_leave: 'Mouse Left',
  };

  const formatTime = (cellIdx: number) => {
    if (totalDuration <= 0) return '–';
    const secondsIn = Math.round((cellIdx / totalCells) * totalDuration);
    const m = Math.floor(secondsIn / 60);
    const s = secondsIn % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
      {/* Header with explanation */}
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-semibold text-[#e5e5e5]">
          Attention Heat Map
        </h4>
        <div className="group relative">
          <Info className="w-3.5 h-3.5 text-[#a3a3a3] cursor-help" />
          <div className="absolute right-0 top-5 w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 text-[10px] text-[#a3a3a3] z-30 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg">
            <p className="font-semibold text-[#e5e5e5] mb-1">
              How to read this map
            </p>
            <p>
              Each cell represents a time segment of the assessment session.
              The color indicates the level of suspicious activity detected
              during that period:
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(74, 158, 255, 0.15)' }} />
                <span>Attentive — no violations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.5)' }} />
                <span>Minor — minor violations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.7)' }} />
                <span>Critical — major violations</span>
              </div>
            </div>
            <p className="mt-2">
              Reading order: left→right, top→bottom (like reading text).
              Top-left = session start, bottom-right = session end.
            </p>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-[#a3a3a3] mb-3">
        Visualization of candidate focus over the assessment timeline. Each cell
        = ~{totalDuration > 0 ? Math.round(totalDuration / totalCells) : 0}s
      </p>

      {/* Time axis labels */}
      <div className="flex justify-between text-[8px] text-[#3a3a3a] mb-1 font-mono px-0.5">
        <span>0:00</span>
        <span>{formatTime(Math.floor(totalCells / 4))}</span>
        <span>{formatTime(Math.floor(totalCells / 2))}</span>
        <span>{formatTime(Math.floor((3 * totalCells) / 4))}</span>
        <span>
          {Math.floor(totalDuration / 60)}:
          {(totalDuration % 60).toString().padStart(2, '0')}
        </span>
      </div>

      {/* Grid */}
      <div
        className="grid gap-[2px] mb-3"
        style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
      >
        {cells.map((cell, i) => (
          <div key={i} className="group/cell relative">
            <div
              className="aspect-square rounded-[3px] transition-transform hover:scale-110 cursor-crosshair"
              style={{ backgroundColor: getCellColor(cell.severity) }}
            />
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-28 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-[8px] z-20 opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-opacity text-center">
              <span className="text-[#e5e5e5] block font-mono">
                {formatTime(i)} – {formatTime(i + 1)}
              </span>
              {cell.count > 0 ? (
                <span className="text-[#ef4444]">
                  {cell.count} violation{cell.count !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-[#10b981]">Clean</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-[#a3a3a3] mb-4">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: 'rgba(74, 158, 255, 0.15)' }}
          />
          <span>Attentive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.5)' }}
          />
          <span>Minor issue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.7)' }}
          />
          <span>Major issue</span>
        </div>
        <span className="text-[8px] text-[#3a3a3a] ml-auto">
          ← start · end →
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="bg-[#1a1a1a] rounded p-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Eye className="w-3 h-3 text-[#4a9eff]" />
            <span className="text-[#a3a3a3]">Attention Rate</span>
          </div>
          <p className="text-[#e5e5e5] font-mono font-semibold text-lg">
            {attentionPercent}%
          </p>
          <p className="text-[8px] text-[#3a3a3a]">
            {Math.round(attentiveTime)}s attentive of {Math.round(totalDuration)}
            s total
          </p>
        </div>
        <div className="bg-[#1a1a1a] rounded p-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <EyeOff className="w-3 h-3 text-[#f59e0b]" />
            <span className="text-[#a3a3a3]">Distraction Time</span>
          </div>
          <p className="text-[#e5e5e5] font-mono font-semibold text-lg">
            {Math.round(attentionData.totalLookingAway)}s
          </p>
          <p className="text-[8px] text-[#3a3a3a]">
            Total time looking away from screen
          </p>
        </div>
      </div>

      {/* Violation type breakdown */}
      {violationBreakdown.length > 0 && (
        <div className="border-t border-[#2a2a2a] pt-3">
          <h5 className="text-[10px] text-[#a3a3a3] uppercase tracking-wide font-semibold mb-2">
            Violation Breakdown
          </h5>
          <div className="space-y-1.5">
            {violationBreakdown.map(({ type, count }) => {
              const Icon = violationIcons[type] || MonitorX;
              const label = violationLabels[type] || type.replace(/_/g, ' ');
              const pct =
                violations.length > 0
                  ? Math.round((count / violations.length) * 100)
                  : 0;
              return (
                <div key={type} className="flex items-center gap-2">
                  <Icon className="w-3 h-3 text-[#a3a3a3] flex-shrink-0" />
                  <span className="text-[10px] text-[#a3a3a3] w-24 truncate">
                    {label}
                  </span>
                  <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#ef4444]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#e5e5e5] w-6 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insight callout */}
      {peakMinute >= 0 && violations.length > 0 && (
        <div className="mt-3 px-3 py-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded text-[10px] text-[#f59e0b]">
          ⚠ Peak suspicious activity detected around{' '}
          <span className="font-mono font-semibold">
            {formatTime(peakMinute)}
          </span>{' '}
          into the session
          {quietMinute >= 0 && (
            <>
              {' '}
              · Candidate was attentive from{' '}
              <span className="font-mono font-semibold">
                {formatTime(quietMinute)}
              </span>
            </>
          )}
        </div>
      )}

      {violations.length === 0 && (
        <div className="mt-3 px-3 py-2 bg-[#10b981]/5 border border-[#10b981]/20 rounded text-[10px] text-[#10b981]">
          ✓ No violations detected — candidate was fully attentive throughout
          the session
        </div>
      )}
    </div>
  );
}
