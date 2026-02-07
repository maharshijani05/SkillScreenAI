import Resume from '../models/Resume.js';
import User from '../models/User.js';
import { parseResumePDF, parseResumeText } from '../services/resumeParser.js';
import { screenResume } from '../services/resumeScreening.js';
import Job from '../models/Job.js';

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { jobId } = req.body;
    const candidateId = req.user._id;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if resume already exists for this candidate and job
    const existingResume = await Resume.findOne({ candidateId, jobId });
    if (existingResume) {
      await Resume.findByIdAndDelete(existingResume._id);
    }

    // Parse resume from buffer (memory storage)
    let parsedData;
    try {
      if (req.file.mimetype === 'application/pdf') {
        parsedData = await parseResumePDF(req.file.buffer);
      } else {
        const text = req.file.buffer.toString('utf-8');
        parsedData = await parseResumeText(text);
      }
    } catch (error) {
      return res.status(400).json({ message: `Failed to parse resume: ${error.message}` });
    }

    // Screen resume against job
    let screeningResult;
    try {
      screeningResult = await screenResume(parsedData, job);
    } catch (error) {
      // If screening fails (AI quota etc.), default to approved with basic score
      console.error('Resume screening failed, defaulting to approved:', error.message);
      screeningResult = {
        status: 'approved',
        matchScore: 50,
        analysis: {
          strengths: ['Resume submitted for review'],
          weaknesses: ['Automated screening unavailable'],
          missingSkills: [],
          matchingSkills: parsedData.skills || [],
          recommendation: 'AI screening was unavailable. Manual review recommended.',
        },
        rejectionReason: '',
      };
    }

    // Create resume record (no filePath since we use memory storage)
    const resume = await Resume.create({
      candidateId,
      jobId,
      fileName: req.file.originalname,
      filePath: '',
      fileSize: req.file.size,
      parsedData,
      screeningResult,
    });

    // Also update user profile with resume data if not already set
    try {
      const user = await User.findById(candidateId);
      if (!user.profile?.resume?.fileName) {
        await User.findByIdAndUpdate(candidateId, {
          $set: {
            'profile.resume': {
              fileName: req.file.originalname,
              filePath: '',
              fileSize: req.file.size,
              uploadedAt: new Date(),
              parsedData,
            },
          },
        });
      }
    } catch (e) {
      // Non-critical - profile update failed
    }

    res.status(201).json({
      message: 'Resume uploaded and screened successfully',
      resume: {
        _id: resume._id,
        screeningResult: resume.screeningResult,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Apply to job using profile resume (no file upload needed)
export const applyWithProfileResume = async (req, res) => {
  try {
    const { jobId } = req.body;
    const candidateId = req.user._id;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if already applied
    const existingResume = await Resume.findOne({ candidateId, jobId });
    if (existingResume) {
      return res.json({
        message: 'Already applied',
        resume: {
          _id: existingResume._id,
          screeningResult: existingResume.screeningResult,
        },
      });
    }

    // Get profile resume data
    const user = await User.findById(candidateId);
    if (!user.profile?.resume?.parsedData) {
      return res.status(400).json({
        message: 'No resume in profile. Please upload a resume first.',
      });
    }

    const parsedData = user.profile.resume.parsedData;

    // Screen against this job
    let screeningResult;
    try {
      screeningResult = await screenResume(parsedData, job);
    } catch (error) {
      console.error('Resume screening failed, defaulting to approved:', error.message);
      screeningResult = {
        status: 'approved',
        matchScore: 50,
        analysis: {
          strengths: ['Resume submitted for review'],
          weaknesses: ['Automated screening unavailable'],
          missingSkills: [],
          matchingSkills: parsedData.skills || [],
          recommendation: 'AI screening was unavailable. Manual review recommended.',
        },
        rejectionReason: '',
      };
    }

    const resume = await Resume.create({
      candidateId,
      jobId,
      fileName: user.profile.resume.fileName || 'profile-resume',
      filePath: '',
      fileSize: user.profile.resume.fileSize || 0,
      parsedData,
      screeningResult,
    });

    res.status(201).json({
      message: 'Applied with profile resume',
      resume: {
        _id: resume._id,
        screeningResult: resume.screeningResult,
      },
    });
  } catch (error) {
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
