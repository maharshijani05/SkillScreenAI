import mongoose from 'mongoose';

const violationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'multiple_faces',
      'phone_detected',
      'tab_switch',
      'copy_paste',
      'looking_away',
      'right_click',
      'screenshot_attempt',
      'mouse_leave',
    ],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  duration: {
    type: Number, // in seconds, for continuous violations
    default: 0,
  },
  details: {
    type: String,
  },
  penalty: {
    type: Number,
    default: 0,
  },
  frameSnapshot: {
    type: String, // base64 image data (optional)
  },
});

const proctoringLogSchema = new mongoose.Schema({
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attempt',
    required: true,
  },
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
  violations: [violationSchema],
  integrityScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
  strikeCount: {
    type: Number,
    default: 0,
    max: 3,
  },
  autoSubmitted: {
    type: Boolean,
    default: false,
  },
  autoSubmitReason: {
    type: String,
  },
  webcamEnabled: {
    type: Boolean,
    default: false,
  },
  frameSnapshots: [
    {
      timestamp: { type: Date, default: Date.now },
      image: { type: String }, // base64 thumbnail
    },
  ],
  attentionData: {
    totalLookingAway: { type: Number, default: 0 }, // total seconds
    tabSwitchCount: { type: Number, default: 0 },
    copyPasteCount: { type: Number, default: 0 },
    multipleFacesCount: { type: Number, default: 0 },
    phoneDetectedCount: { type: Number, default: 0 },
  },
  sessionStart: {
    type: Date,
    default: Date.now,
  },
  sessionEnd: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

proctoringLogSchema.index({ attemptId: 1 }, { unique: true });
proctoringLogSchema.index({ candidateId: 1, jobId: 1 });
proctoringLogSchema.index({ isActive: 1 });

export default mongoose.model('ProctoringLog', proctoringLogSchema);
