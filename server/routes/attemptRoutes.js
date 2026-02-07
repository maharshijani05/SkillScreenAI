import express from 'express';
import {
  startAttempt,
  submitAttempt,
  getAttempts,
} from '../controllers/attemptController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/start', startAttempt);
router.post('/submit', submitAttempt);
router.get('/', getAttempts);

export default router;
