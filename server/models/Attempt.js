import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
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
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  answers: [
    {
      questionId: mongoose.Schema.Types.ObjectId,
      answer: String,
      isCorrect: Boolean,
      score: Number,
      feedback: String,
    },
  ],
  startedAt: {
    type: Date,
    required: true,
  },
  submittedAt: {
    type: Date,
  },
  score: {
    type: Number,
    default: 0,
  },
  sectionScores: {
    objective: { type: Number, default: 0 },
    subjective: { type: Number, default: 0 },
    coding: { type: Number, default: 0 },
  },
  flags: {
    resumeMismatch: { type: Boolean, default: false },
    randomAttempts: { type: Boolean, default: false },
    botDetection: { type: Boolean, default: false },
    plagiarism: { type: Number, default: 0 },
    integrityViolation: { type: Boolean, default: false }, // Three-strike auto-submit
  },
  timeSpent: {
    type: Number, // in seconds
  },
  // Proctoring fields
  integrityScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
  proctoringEnabled: {
    type: Boolean,
    default: false,
  },
});

attemptSchema.index({ candidateId: 1, jobId: 1 });

export default mongoose.model('Attempt', attemptSchema);
