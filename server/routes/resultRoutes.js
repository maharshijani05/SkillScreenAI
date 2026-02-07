import express from 'express';
import {
  getResults,
  getLeaderboardForJob,
  getCandidateReport,
} from '../controllers/resultController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/:jobId', getResults);
router.get('/leaderboard/:jobId', getLeaderboardForJob);
router.get('/report/:candidateId/:jobId', getCandidateReport);

export default router;
