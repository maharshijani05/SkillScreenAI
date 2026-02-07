'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import api from '@/lib/api';
import { getSocket, getConnectedSocket, disconnectSocket } from '@/lib/socket';

// Violation types and penalties
const VIOLATION_PENALTIES: Record<string, number> = {
  multiple_faces: 15,
  phone_detected: 20,
  tab_switch: 10,
  copy_paste: 15,
  looking_away: 5,
  right_click: 5,
  screenshot_attempt: 10,
  mouse_leave: 5,
};

interface Violation {
  type: string;
  timestamp: Date;
  details: string;
  penalty: number;
}

interface ProctoringState {
  integrityScore: number;
  strikeCount: number;
  violations: Violation[];
  webcamActive: boolean;
  modelLoaded: boolean;
  facesDetected: number;
  phoneDetected: boolean;
  lookingAway: boolean;
  isAutoSubmitted: boolean;
}

interface UseProctoringOptions {
  attemptId: string;
  jobId: string;
  onAutoSubmit: () => void;
  enabled?: boolean;
}

export function useProctoring({ attemptId, jobId, onAutoSubmit, enabled = true }: UseProctoringOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const snapshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lookAwayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lookAwayStartRef = useRef<number | null>(null);

  const [state, setState] = useState<ProctoringState>({
    integrityScore: 100,
    strikeCount: 0,
    violations: [],
    webcamActive: false,
    modelLoaded: false,
    facesDetected: 0,
    phoneDetected: false,
    lookingAway: false,
    isAutoSubmitted: false,
  });

  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningType, setWarningType] = useState('');

  // Initialize proctoring session on backend
  const initSession = useCallback(async () => {
    try {
      await api.post('/proctoring/init', {
        attemptId,
        webcamEnabled: true,
      });
    } catch (error) {
      console.error('Failed to init proctoring session:', error);
    }
  }, [attemptId]);

  // Report violation to backend
  const reportViolation = useCallback(async (type: string, details: string, duration?: number) => {
    const penalty = VIOLATION_PENALTIES[type] || 5;

    setState(prev => {
      const newScore = Math.max(0, prev.integrityScore - penalty);
      const strikeViolations = ['multiple_faces', 'phone_detected', 'tab_switch', 'copy_paste', 'screenshot_attempt'];
      const newStrikeCount = strikeViolations.includes(type)
        ? Math.min(3, prev.strikeCount + 1)
        : prev.strikeCount;

      const newViolation: Violation = {
        type,
        timestamp: new Date(),
        details,
        penalty,
      };

      // Show warning for strike-worthy violations
      if (strikeViolations.includes(type)) {
        setWarningMessage(details);
        setWarningType(type);
        setShowWarning(true);
      }

      // Auto-submit on 3 strikes
      if (newStrikeCount >= 3 && !prev.isAutoSubmitted) {
        setTimeout(() => onAutoSubmit(), 2000);
        return {
          ...prev,
          integrityScore: newScore,
          strikeCount: newStrikeCount,
          violations: [...prev.violations, newViolation],
          isAutoSubmitted: true,
        };
      }

      return {
        ...prev,
        integrityScore: newScore,
        strikeCount: newStrikeCount,
        violations: [...prev.violations, newViolation],
      };
    });

    // Report to backend
    try {
      await api.post('/proctoring/violation', {
        attemptId,
        type,
        details,
        duration,
      });
    } catch (error) {
      console.error('Failed to report violation:', error);
    }

    // Emit via socket for real-time monitoring
    try {
      const socket = getSocket();
      socket.emit('proctoring-violation', {
        attemptId,
        jobId,
        violation: { type, details, penalty },
        integrityScore: state.integrityScore - penalty,
        strikeCount: state.strikeCount,
      });
    } catch (e) {
      // Socket not available
    }
  }, [attemptId, jobId, onAutoSubmit, state.integrityScore, state.strikeCount]);

  // Start webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState(prev => ({ ...prev, webcamActive: true }));
    } catch (error) {
      console.error('Webcam access denied:', error);
      setState(prev => ({ ...prev, webcamActive: false }));
    }
  }, []);

  // Load COCO-SSD model
  const loadModel = useCallback(async () => {
    try {
      // Dynamic imports to avoid SSR issues
      const tf = await import('@tensorflow/tfjs');
      const cocoSsd = await import('@tensorflow-models/coco-ssd');

      await tf.ready();
      const model = await cocoSsd.load();
      modelRef.current = model;
      setState(prev => ({ ...prev, modelLoaded: true }));
      console.log('COCO-SSD model loaded');
    } catch (error) {
      console.error('Failed to load detection model:', error);
    }
  }, []);

  // Run object detection
  const runDetection = useCallback(async () => {
    if (!modelRef.current || !videoRef.current || !videoRef.current.readyState || videoRef.current.readyState < 2) {
      return;
    }

    try {
      const predictions = await modelRef.current.detect(videoRef.current);

      let faceCount = 0;
      let phoneFound = false;

      for (const prediction of predictions) {
        if (prediction.class === 'person' && prediction.score > 0.5) {
          faceCount++;
        }
        if (prediction.class === 'cell phone' && prediction.score > 0.4) {
          phoneFound = true;
        }
      }

      setState(prev => ({
        ...prev,
        facesDetected: faceCount,
        phoneDetected: phoneFound,
      }));

      // Multiple faces detected
      if (faceCount > 1) {
        reportViolation('multiple_faces', `${faceCount} people detected in frame`);
      }

      // No face detected (looking away)
      if (faceCount === 0) {
        if (!lookAwayStartRef.current) {
          lookAwayStartRef.current = Date.now();
        }
        const lookAwayDuration = (Date.now() - lookAwayStartRef.current) / 1000;
        if (lookAwayDuration > 5) {
          setState(prev => ({ ...prev, lookingAway: true }));
          reportViolation('looking_away', `Looking away for ${Math.round(lookAwayDuration)} seconds`, lookAwayDuration);
          lookAwayStartRef.current = Date.now(); // Reset timer after reporting
        }
      } else {
        lookAwayStartRef.current = null;
        setState(prev => ({ ...prev, lookingAway: false }));
      }

      // Phone detected
      if (phoneFound) {
        reportViolation('phone_detected', 'Mobile phone/device detected in frame');
      }
    } catch (error) {
      // Detection error - silently continue
    }
  }, [reportViolation]);

  // Capture snapshot for audit
  const captureSnapshot = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(videoRef.current, 0, 0, 160, 120);

    const image = canvas.toDataURL('image/jpeg', 0.3);

    try {
      await api.post('/proctoring/snapshot', { attemptId, image });
    } catch (error) {
      // Snapshot save failed - continue
    }

    // Send to recruiter via socket
    try {
      const socket = getSocket();
      socket.emit('frame-snapshot', { attemptId, jobId, frame: image });
    } catch (e) {
      // Socket not available
    }
  }, [attemptId, jobId]);

  // Tab/window monitoring
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('tab_switch', 'Switched to another tab or minimized window');
      }
    };

    const handleBlur = () => {
      reportViolation('tab_switch', 'Assessment window lost focus');
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('copy_paste', 'Copy attempt detected');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('copy_paste', 'Cut attempt detected');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('copy_paste', 'Paste attempt detected');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportViolation('right_click', 'Right-click/context menu attempt detected');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect PrintScreen
      if (e.key === 'PrintScreen') {
        reportViolation('screenshot_attempt', 'Screenshot attempt (PrintScreen) detected');
      }
      // Detect Ctrl+Shift+S, Cmd+Shift+S (screenshots)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        reportViolation('screenshot_attempt', 'Screenshot shortcut attempt detected');
      }
      // Detect Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        // Allow in textarea/input for coding questions
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') {
          e.preventDefault();
          reportViolation('copy_paste', `Keyboard shortcut Ctrl+${e.key.toUpperCase()} detected outside input`);
        }
      }
    };

    const handleMouseLeave = () => {
      reportViolation('mouse_leave', 'Mouse left the assessment window');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, reportViolation]);

  // Initialize webcam and model
  useEffect(() => {
    if (!enabled) return;

    initSession();
    startWebcam();
    loadModel();

    // Join socket room (async - wait for connection)
    getConnectedSocket()
      .then((socket) => {
        socket.emit('join-assessment', attemptId);
      })
      .catch((e) => {
        console.error('Socket not available for proctoring:', e);
      });

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
      }

      // End proctoring session
      api.post('/proctoring/end', { attemptId }).catch(() => {});
      disconnectSocket();
    };
  }, [enabled, attemptId]);

  // Start detection loop once model is loaded
  useEffect(() => {
    if (!state.modelLoaded || !state.webcamActive) return;

    // Run detection every 3 seconds
    detectionIntervalRef.current = setInterval(runDetection, 3000);

    // Capture snapshot every 30 seconds
    snapshotIntervalRef.current = setInterval(captureSnapshot, 30000);

    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
    };
  }, [state.modelLoaded, state.webcamActive, runDetection, captureSnapshot]);

  // Dismiss warning
  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return {
    videoRef,
    canvasRef,
    state,
    showWarning,
    warningMessage,
    warningType,
    dismissWarning,
  };
}
