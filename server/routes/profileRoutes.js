import express from 'express';
import { authenticate } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  getProfile,
  updateProfile,
  uploadProfileResume,
  getProfileResume,
} from '../controllers/profileController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/resume', upload.single('resume'), uploadProfileResume);
router.get('/resume', getProfileResume);

export default router;
