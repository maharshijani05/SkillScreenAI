'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface WarningModalProps {
  open: boolean;
  onClose: () => void;
  message: string;
  violationType: string;
  strikeCount: number;
  isAutoSubmit?: boolean;
}

const VIOLATION_LABELS: Record<string, string> = {
  multiple_faces: 'Multiple Faces Detected',
  phone_detected: 'Phone/Device Detected',
  tab_switch: 'Tab Switch Detected',
  copy_paste: 'Copy/Paste Attempt',
  looking_away: 'Looking Away',
  right_click: 'Right-Click Detected',
  screenshot_attempt: 'Screenshot Attempt',
  mouse_leave: 'Mouse Left Window',
};

export function WarningModal({
  open,
  onClose,
  message,
  violationType,
  strikeCount,
  isAutoSubmit = false,
}: WarningModalProps) {
  if (!open) return null;

  const isFinal = strikeCount >= 3 || isAutoSubmit;
  const borderColor = isFinal ? 'border-[#ef4444]' : 'border-[#f59e0b]';
  const iconColor = isFinal ? 'text-[#ef4444]' : 'text-[#f59e0b]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        className={`w-full max-w-md bg-[#121212] border ${borderColor} rounded-lg p-6 mx-4`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${iconColor}`} />
            <h3 className="text-lg font-semibold text-[#e5e5e5]">
              {isFinal ? 'Assessment Terminated' : 'Integrity Warning'}
            </h3>
          </div>
          {!isFinal && (
            <button
              onClick={onClose}
              className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mb-4">
          <div className="inline-block bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-0.5 mb-3">
            <span className="text-xs font-mono text-[#a3a3a3]">
              {VIOLATION_LABELS[violationType] || violationType}
            </span>
          </div>
          <p className="text-sm text-[#a3a3a3]">{message}</p>
        </div>

        {!isFinal && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
            <span className="text-sm text-[#a3a3a3]">Warning</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < strikeCount ? 'bg-[#ef4444]' : 'bg-[#2a2a2a]'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-mono text-[#e5e5e5]">
              {strikeCount} of 3
            </span>
          </div>
        )}

        {isFinal ? (
          <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded">
            <p className="text-sm text-[#ef4444]">
              Your assessment has been auto-submitted due to repeated integrity
              violations. This has been flagged for review.
            </p>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded text-sm text-[#e5e5e5] hover:bg-[#2a2a2a] transition-colors"
          >
            I Understand
          </button>
        )}
      </div>
    </div>
  );
}
