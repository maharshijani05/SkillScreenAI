import express from 'express';
import {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  toggleAnonymousHiring,
  shortlistCandidates,
  revealIdentities,
  getRecommendedJobs,
} from '../controllers/jobController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route for candidates to view jobs
router.get('/', authenticate, getJobs);
router.get('/recommendations', authenticate, getRecommendedJobs);
router.get('/:id', authenticate, getJob);

// Recruiter/admin only routes
router.use(authenticate);
router.use(authorize('recruiter', 'admin'));

router.post('/', createJob);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

// Anonymous hiring routes
router.post('/:id/anonymous-toggle', toggleAnonymousHiring);
router.post('/:id/shortlist', shortlistCandidates);
router.post('/:id/reveal-identities', revealIdentities);

export default router;
