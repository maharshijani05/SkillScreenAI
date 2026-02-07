import express from 'express';
import {
  getResults,
  getLeaderboardForJob,
  getCandidateReport,
  getBiasMetrics,
} from '../controllers/resultController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// More specific routes MUST come before /:jobId
router.get('/leaderboard/:jobId', getLeaderboardForJob);
router.get('/report/:candidateId/:jobId', getCandidateReport);
router.get('/bias-metrics/:jobId', authorize('recruiter', 'admin'), getBiasMetrics);
router.get('/:jobId', getResults);

export default router;
