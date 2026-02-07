import Job from '../models/Job.js';
import parseJobDescription from '../services/jdParser.js';

export const createJob = async (req, res) => {
  try {
    const { title, description, assessmentConfig } = req.body;

    // Parse JD if description is provided (optional - continue even if it fails)
    let parsedData = {};
    if (description) {
      try {
        parsedData = await parseJobDescription(description);
      } catch (error) {
        console.error('JD parsing error:', error);
        // If it's a quota error, inform user but continue
        if (error.message?.includes('quota') || error.message?.includes('Daily')) {
          console.warn('JD parsing skipped due to API quota. Job will be created with manual skills.');
        }
        // Continue with manual data if parsing fails
      }
    }

    const job = await Job.create({
      title,
      description,
      skills: parsedData.skills || [],
      experienceLevel: parsedData.experience || 'Fresher',
      assessmentConfig: assessmentConfig || {
        objectiveCount: 5,
        subjectiveCount: 3,
        codingCount: 2,
        duration: 60,
      },
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: 'Job created successfully',
      job,
      parsedData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJobs = async (req, res) => {
  try {
    // If recruiter/admin, show only their jobs. If candidate, show all jobs.
    const query = req.user.role === 'candidate' 
      ? {} 
      : { createdBy: req.user._id };
    
    const jobs = await Job.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('createdBy', 'name email');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({ message: 'Job updated successfully', job: updatedJob });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Job.findByIdAndDelete(req.params.id);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
