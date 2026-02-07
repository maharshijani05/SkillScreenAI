import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    default: '',
  },
  fileSize: {
    type: Number,
    required: true,
  },
  parsedData: {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    experience: String,
    education: [String],
    workExperience: [String],
    summary: String,
  },
  screeningResult: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    analysis: {
      strengths: [String],
      weaknesses: [String],
      missingSkills: [String],
      matchingSkills: [String],
      recommendation: String,
    },
    rejectionReason: String,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

resumeSchema.index({ candidateId: 1, jobId: 1 });

export default mongoose.model('Resume', resumeSchema);
