import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
  },
  skills: {
    type: [String],
    default: [],
  },
  experienceLevel: {
    type: String,
    enum: ['Fresher', 'Junior', 'Mid', 'Senior', 'Lead'],
    default: 'Fresher',
  },
  assessmentConfig: {
    objectiveCount: { type: Number, default: 5 },
    subjectiveCount: { type: Number, default: 3 },
    codingCount: { type: Number, default: 2 },
    duration: { type: Number, default: 60 }, // minutes
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Job', jobSchema);
