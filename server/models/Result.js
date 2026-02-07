import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attempt',
    required: true,
  },
  overallScore: {
    type: Number,
    required: true,
  },
  rank: {
    type: Number,
    required: true,
  },
  skillBreakdown: {
    type: Map,
    of: Number,
    default: {},
  },
  percentile: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

resultSchema.index({ jobId: 1, overallScore: -1 });
resultSchema.index({ jobId: 1, rank: 1 });

export default mongoose.model('Result', resultSchema);
