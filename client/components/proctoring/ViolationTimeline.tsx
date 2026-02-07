'use client';

import React from 'react';
import {
  Users,
  Smartphone,
  MonitorX,
  ClipboardCopy,
  EyeOff,
  Mouse,
  Camera,
  MousePointerClick,
} from 'lucide-react';

interface Violation {
  _id?: string;
  type: string;
  timestamp: string | Date;
  details?: string;
  penalty: number;
  duration?: number;
}

interface ViolationTimelineProps {
  violations: Violation[];
}

const VIOLATION_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  multiple_faces: { label: 'Multiple Faces', color: 'bg-[#ef4444]', icon: Users },
  phone_detected: { label: 'Phone Detected', color: 'bg-[#ef4444]', icon: Smartphone },
  tab_switch: { label: 'Tab Switch', color: 'bg-[#f59e0b]', icon: MonitorX },
  copy_paste: { label: 'Copy/Paste', color: 'bg-[#f59e0b]', icon: ClipboardCopy },
  looking_away: { label: 'Looking Away', color: 'bg-[#3b82f6]', icon: EyeOff },
  right_click: { label: 'Right Click', color: 'bg-[#a3a3a3]', icon: MousePointerClick },
  screenshot_attempt: { label: 'Screenshot', color: 'bg-[#ef4444]', icon: Camera },
  mouse_leave: { label: 'Mouse Left', color: 'bg-[#a3a3a3]', icon: Mouse },
};

export function ViolationTimeline({ violations }: ViolationTimelineProps) {
  if (violations.length === 0) {
    return (
      <div className="text-center py-8 text-[#a3a3a3] text-sm">
        No violations recorded
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[#2a2a2a]" />

      <div className="space-y-3">
        {violations.map((violation, index) => {
          const config = VIOLATION_CONFIG[violation.type] || {
            label: violation.type,
            color: 'bg-[#a3a3a3]',
            icon: MonitorX,
          };
          const Icon = config.icon;
          const time = new Date(violation.timestamp);

          return (
            <div key={index} className="relative flex items-start gap-3 pl-2">
              {/* Dot */}
              <div
                className={`relative z-10 w-5 h-5 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className="w-3 h-3 text-white" />
              </div>

              {/* Card */}
              <div className="flex-1 bg-[#121212] border border-[#2a2a2a] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-[#a3a3a3]">
                    {time.toLocaleTimeString()}
                  </span>
                  <span className="text-xs font-mono text-[#ef4444]">
                    -{violation.penalty} pts
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${config.color}`}
                  >
                    {config.label}
                  </span>
                </div>
                {violation.details && (
                  <p className="text-xs text-[#a3a3a3]">{violation.details}</p>
                )}
                {violation.duration && violation.duration > 0 && (
                  <p className="text-[10px] text-[#a3a3a3] mt-1">
                    Duration: {Math.round(violation.duration)}s
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
