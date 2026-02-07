import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'recruiter', 'candidate'],
    default: 'candidate',
  },
  // Candidate profile fields
  profile: {
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    bio: { type: String, default: '' },
    skills: [{ type: String }],
    experience: {
      type: String,
      enum: ['', 'Fresher', 'Junior', 'Mid', 'Senior', 'Lead'],
      default: '',
    },
    education: [{
      institution: { type: String },
      degree: { type: String },
      year: { type: String },
    }],
    workHistory: [{
      company: { type: String },
      role: { type: String },
      duration: { type: String },
      description: { type: String },
    }],
    links: {
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      portfolio: { type: String, default: '' },
    },
    // Stored resume data
    resume: {
      fileName: { type: String },
      filePath: { type: String },
      fileSize: { type: Number },
      uploadedAt: { type: Date },
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
    },
    profileComplete: { type: Boolean, default: false },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
