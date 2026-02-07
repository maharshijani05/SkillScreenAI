import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  initProctoring,
  logViolation,
  saveSnapshot,
  endProctoring,
  getProctoringReport,
  getActiveSessions,
  getJobProctoringLogs,
} from '../controllers/proctoringController.js';

const router = express.Router();

router.use(authenticate);

// Candidate endpoints
router.post('/init', authorize('candidate'), initProctoring);
router.post('/violation', authorize('candidate'), logViolation);
router.post('/snapshot', authorize('candidate'), saveSnapshot);
router.post('/end', authorize('candidate'), endProctoring);

// Recruiter endpoints
router.get('/report/:attemptId', authorize('recruiter', 'admin'), getProctoringReport);
router.get('/active/:jobId', authorize('recruiter', 'admin'), getActiveSessions);
router.get('/logs/:jobId', authorize('recruiter', 'admin'), getJobProctoringLogs);

export default router;
