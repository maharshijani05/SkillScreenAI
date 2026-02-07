import express from 'express';
import {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
} from '../controllers/jobController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route for candidates to view jobs
router.get('/', authenticate, getJobs);
router.get('/:id', authenticate, getJob);

// Recruiter/admin only routes
router.use(authenticate);
router.use(authorize('recruiter', 'admin'));

router.post('/', createJob);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

export default router;
