'use client';

import React from 'react';

interface WebcamMonitorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  active: boolean;
  facesDetected: number;
  phoneDetected: boolean;
  lookingAway: boolean;
}

export function WebcamMonitor({
  videoRef,
  canvasRef,
  active,
  facesDetected,
  phoneDetected,
  lookingAway,
}: WebcamMonitorProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="relative w-[200px] h-[150px] rounded-lg border-2 border-[#2a2a2a] bg-[#0a0a0a] overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {/* Hidden canvas for snapshots */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Status indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              active ? 'bg-[#10b981]' : 'bg-[#ef4444]'
            }`}
          />
          <span className="text-[10px] text-[#a3a3a3] font-mono">
            {active ? 'PROCTORING' : 'OFFLINE'}
          </span>
        </div>

        {/* Detection status bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a]/80 px-2 py-1 flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#a3a3a3]">
            Faces: {facesDetected}
          </span>
          {phoneDetected && (
            <span className="text-[10px] font-mono text-[#ef4444]">PHONE</span>
          )}
          {lookingAway && (
            <span className="text-[10px] font-mono text-[#f59e0b]">AWAY</span>
          )}
        </div>

        {/* Warning overlay */}
        {(facesDetected > 1 || phoneDetected) && (
          <div className="absolute inset-0 border-2 border-[#ef4444] rounded-lg pointer-events-none" />
        )}
        {lookingAway && (
          <div className="absolute inset-0 border-2 border-[#f59e0b] rounded-lg pointer-events-none" />
        )}
      </div>
    </div>
  );
}
