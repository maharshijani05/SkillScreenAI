import Resume from '../models/Resume.js';
import { parseResumePDF, parseResumeText } from '../services/resumeParser.js';
import { screenResume } from '../services/resumeScreening.js';
import Job from '../models/Job.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../uploads/resumes');

// Ensure uploads directory exists
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { jobId } = req.body;
    const candidateId = req.user._id;

    if (!jobId) {
      // Delete uploaded file if jobId is missing
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: 'Job ID is required' });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if resume already exists for this candidate and job
    const existingResume = await Resume.findOne({ candidateId, jobId });
    if (existingResume) {
      // Delete old file
      await fs.unlink(existingResume.filePath).catch(() => {});
      // Delete old resume record
      await Resume.findByIdAndDelete(existingResume._id);
    }

    // Parse resume
    let parsedData;
    try {
      if (req.file.mimetype === 'application/pdf') {
        parsedData = await parseResumePDF(req.file.path);
      } else {
        // For text files, read and parse
        const text = await fs.readFile(req.file.path, 'utf-8');
        parsedData = await parseResumeText(text);
      }
    } catch (error) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: `Failed to parse resume: ${error.message}` });
    }

    // Screen resume against job
    let screeningResult;
    try {
      screeningResult = await screenResume(parsedData, job);
    } catch (error) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(500).json({ message: `Failed to screen resume: ${error.message}` });
    }

    // Create resume record
    const resume = await Resume.create({
      candidateId,
      jobId,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      parsedData,
      screeningResult,
    });

    res.status(201).json({
      message: 'Resume uploaded and screened successfully',
      resume: {
        _id: resume._id,
        screeningResult: resume.screeningResult,
      },
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ message: error.message });
  }
};

export const getResume = async (req, res) => {
  try {
    const { resumeId } = req.params;

    const resume = await Resume.findById(resumeId)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title');

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Only candidate or recruiter can view
    if (
      req.user.role === 'candidate' &&
      resume.candidateId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({ resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getResumesForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Only recruiter/admin can view all resumes for a job
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const resumes = await Resume.find({ jobId })
      .populate('candidateId', 'name email')
      .sort({ 'screeningResult.matchScore': -1, uploadedAt: -1 });

    res.json({ resumes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCandidateResume = async (req, res) => {
  try {
    const { jobId } = req.params;
    const candidateId = req.user._id;

    const resume = await Resume.findOne({ candidateId, jobId })
      .populate('jobId', 'title');

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json({ resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
