import ProctoringLog from '../models/ProctoringLog.js';
import Attempt from '../models/Attempt.js';

// Penalty weights for violations
const VIOLATION_PENALTIES = {
  multiple_faces: 15,
  phone_detected: 20,
  tab_switch: 10,
  copy_paste: 15,
  looking_away: 5,
  right_click: 5,
  screenshot_attempt: 10,
  mouse_leave: 5,
};

// Initialize proctoring session
export const initProctoring = async (req, res) => {
  try {
    const { attemptId, webcamEnabled } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.candidateId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if proctoring log already exists
    let proctoringLog = await ProctoringLog.findOne({ attemptId });
    if (proctoringLog) {
      return res.json({ proctoringLog });
    }

    proctoringLog = await ProctoringLog.create({
      attemptId,
      candidateId: req.user._id,
      jobId: attempt.jobId,
      webcamEnabled,
      sessionStart: new Date(),
    });

    // Mark attempt as proctoring enabled
    await Attempt.findByIdAndUpdate(attemptId, { proctoringEnabled: true });

    res.status(201).json({ proctoringLog });
  } catch (error) {
    console.error('Init proctoring error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Log a violation
export const logViolation = async (req, res) => {
  try {
    const { attemptId, type, details, duration, frameSnapshot } = req.body;

    const proctoringLog = await ProctoringLog.findOne({ attemptId });
    if (!proctoringLog) {
      return res.status(404).json({ message: 'Proctoring session not found' });
    }

    if (proctoringLog.candidateId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const penalty = VIOLATION_PENALTIES[type] || 5;
    const newIntegrityScore = Math.max(0, proctoringLog.integrityScore - penalty);

    // Add violation
    proctoringLog.violations.push({
      type,
      details,
      duration: duration || 0,
      penalty,
      frameSnapshot: frameSnapshot || undefined,
      timestamp: new Date(),
    });

    // Update integrity score
    proctoringLog.integrityScore = newIntegrityScore;

    // Update attention data
    const attData = proctoringLog.attentionData;
    if (type === 'multiple_faces') attData.multipleFacesCount++;
    if (type === 'phone_detected') attData.phoneDetectedCount++;
    if (type === 'tab_switch') attData.tabSwitchCount++;
    if (type === 'copy_paste') attData.copyPasteCount++;
    if (type === 'looking_away') attData.totalLookingAway += (duration || 5);

    // Determine if this is a strike-worthy violation
    const strikeViolations = ['multiple_faces', 'phone_detected', 'tab_switch', 'copy_paste', 'screenshot_attempt'];
    if (strikeViolations.includes(type)) {
      proctoringLog.strikeCount = Math.min(3, proctoringLog.strikeCount + 1);
    }

    await proctoringLog.save();

    // Update attempt integrity score
    await Attempt.findByIdAndUpdate(attemptId, {
      integrityScore: newIntegrityScore,
    });

    const response = {
      integrityScore: newIntegrityScore,
      strikeCount: proctoringLog.strikeCount,
      autoSubmit: proctoringLog.strikeCount >= 3,
      penalty,
    };

    // If 3 strikes, mark for auto-submit
    if (proctoringLog.strikeCount >= 3) {
      proctoringLog.autoSubmitted = true;
      proctoringLog.autoSubmitReason = 'Three integrity violations detected';
      await proctoringLog.save();

      await Attempt.findByIdAndUpdate(attemptId, {
        'flags.integrityViolation': true,
      });
    }

    res.json(response);
  } catch (error) {
    console.error('Log violation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Save frame snapshot (periodic)
export const saveSnapshot = async (req, res) => {
  try {
    const { attemptId, image } = req.body;

    const proctoringLog = await ProctoringLog.findOne({ attemptId });
    if (!proctoringLog) {
      return res.status(404).json({ message: 'Proctoring session not found' });
    }

    // Keep max 60 snapshots (every 30s for 30min)
    if (proctoringLog.frameSnapshots.length >= 60) {
      proctoringLog.frameSnapshots.shift();
    }

    proctoringLog.frameSnapshots.push({
      timestamp: new Date(),
      image,
    });

    await proctoringLog.save();
    res.json({ message: 'Snapshot saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// End proctoring session
export const endProctoring = async (req, res) => {
  try {
    const { attemptId } = req.body;

    const proctoringLog = await ProctoringLog.findOne({ attemptId });
    if (!proctoringLog) {
      return res.status(404).json({ message: 'Proctoring session not found' });
    }

    proctoringLog.sessionEnd = new Date();
    proctoringLog.isActive = false;
    await proctoringLog.save();

    res.json({ message: 'Proctoring session ended', proctoringLog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Recruiter: Get proctoring report for an attempt
export const getProctoringReport = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const proctoringLog = await ProctoringLog.findOne({ attemptId })
      .populate('candidateId', 'name email')
      .populate('jobId', 'title');

    if (!proctoringLog) {
      return res.status(404).json({ message: 'Proctoring report not found' });
    }

    res.json({ proctoringLog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Recruiter: Get all proctoring sessions for a job (both active and completed)
export const getActiveSessions = async (req, res) => {
  try {
    const { jobId } = req.params;

    const allSessions = await ProctoringLog.find({ jobId })
      .populate('candidateId', 'name email')
      .populate('attemptId', 'startedAt submittedAt score')
      .sort({ isActive: -1, sessionStart: -1 }); // Active first, then by start time

    res.json({ sessions: allSessions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Recruiter: Get all proctoring logs for a job
export const getJobProctoringLogs = async (req, res) => {
  try {
    const { jobId } = req.params;

    const logs = await ProctoringLog.find({ jobId })
      .populate('candidateId', 'name email')
      .populate('attemptId', 'startedAt submittedAt score')
      .sort({ sessionStart: -1 });

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
