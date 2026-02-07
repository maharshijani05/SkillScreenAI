import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['objective', 'subjective', 'coding'],
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    default: [],
  },
  correctAnswer: {
    type: String,
    default: '',
  },
  points: {
    type: Number,
    default: 1,
  },
  constraints: {
    type: String,
    default: '',
  },
  testCases: {
    type: [
      {
        input: String,
        expectedOutput: String,
        points: Number,
      },
    ],
    default: [],
  },
});

const assessmentSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  questions: [questionSchema],
  duration: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Assessment', assessmentSchema);
