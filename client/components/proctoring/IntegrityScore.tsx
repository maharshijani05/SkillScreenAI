'use client';

import React from 'react';
import { Shield } from 'lucide-react';

interface IntegrityScoreProps {
  score: number;
  strikeCount: number;
}

export function IntegrityScore({ score, strikeCount }: IntegrityScoreProps) {
  const getColor = () => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getTextColor = () => {
    if (score >= 80) return 'text-[#10b981]';
    if (score >= 50) return 'text-[#f59e0b]';
    return 'text-[#ef4444]';
  };

  const color = getColor();
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      {/* Circular progress */}
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="38"
            fill="none"
            stroke="#2a2a2a"
            strokeWidth="4"
          />
          <circle
            cx="40"
            cy="40"
            r="38"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold font-mono ${getTextColor()}`}>
            {score}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-[#4a9eff]" />
          <span className="text-xs text-[#a3a3a3]">Integrity</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < strikeCount ? 'bg-[#ef4444]' : 'bg-[#2a2a2a]'
              }`}
            />
          ))}
          <span className="text-[10px] text-[#a3a3a3] ml-1">
            {strikeCount}/3
          </span>
        </div>
      </div>
    </div>
  );
}
