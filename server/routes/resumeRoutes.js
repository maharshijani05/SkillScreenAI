import express from 'express';
import {
  uploadResume,
  getResume,
  getResumesForJob,
  getCandidateResume,
} from '../controllers/resumeController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(authenticate);

// Candidate routes
router.post('/upload', authorize('candidate'), upload.single('resume'), uploadResume);
router.get('/candidate/:jobId', authorize('candidate'), getCandidateResume);

// Recruiter routes
router.get('/job/:jobId', authorize('recruiter', 'admin'), getResumesForJob);
router.get('/:resumeId', getResume);

export default router;
