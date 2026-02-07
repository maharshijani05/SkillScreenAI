import express from 'express';
import {
  generateAssessmentForJob,
  getAssessment,
} from '../controllers/assessmentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/generate/:jobId', authorize('recruiter', 'admin'), generateAssessmentForJob);
router.get('/:jobId', getAssessment);

export default router;
