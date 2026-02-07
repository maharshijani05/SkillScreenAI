import User from '../models/User.js';
import { parseResumePDF, parseResumeText } from '../services/resumeParser.js';

// Get current user's profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ profile: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update profile details
export const updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      location,
      bio,
      skills,
      experience,
      education,
      workHistory,
      links,
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData['profile.phone'] = phone;
    if (location !== undefined) updateData['profile.location'] = location;
    if (bio !== undefined) updateData['profile.bio'] = bio;
    if (skills !== undefined) updateData['profile.skills'] = skills;
    if (experience !== undefined) updateData['profile.experience'] = experience;
    if (education !== undefined) updateData['profile.education'] = education;
    if (workHistory !== undefined) updateData['profile.workHistory'] = workHistory;
    if (links !== undefined) updateData['profile.links'] = links;

    // Check if profile is complete
    const user = await User.findById(req.user._id);
    const hasSkills = (skills || user.profile?.skills || []).length > 0;
    const hasName = name || user.name;
    updateData['profile.profileComplete'] = !!(hasName && hasSkills);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated', profile: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload resume to profile (using memory storage)
export const uploadProfileResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Parse the resume from buffer
    let parsedData;
    try {
      if (req.file.mimetype === 'application/pdf') {
        parsedData = await parseResumePDF(req.file.buffer);
      } else {
        const text = req.file.buffer.toString('utf-8');
        parsedData = await parseResumeText(text);
      }
    } catch (error) {
      console.error('Resume parsing error:', error);
      // Continue even if parsing fails - still save the metadata
      parsedData = {
        name: '',
        email: '',
        phone: '',
        skills: [],
        experience: '',
        education: [],
        workExperience: [],
        summary: '',
      };
    }

    // Update user profile with resume data
    const updateData = {
      'profile.resume': {
        fileName: req.file.originalname,
        filePath: '',
        fileSize: req.file.size,
        uploadedAt: new Date(),
        parsedData,
      },
    };

    // Auto-fill profile from parsed resume data
    const user = await User.findById(req.user._id);
    if (parsedData.skills?.length > 0 && (!user.profile?.skills?.length)) {
      updateData['profile.skills'] = parsedData.skills;
    }
    if (parsedData.experience && !user.profile?.experience) {
      updateData['profile.experience'] = parsedData.experience;
    }
    if (parsedData.phone && !user.profile?.phone) {
      updateData['profile.phone'] = parsedData.phone;
    }
    if (parsedData.summary && !user.profile?.bio) {
      updateData['profile.bio'] = parsedData.summary;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Resume uploaded and profile updated',
      profile: updatedUser,
      parsedData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get profile resume metadata
export const getProfileResume = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user?.profile?.resume?.fileName) {
      return res.status(404).json({ message: 'No resume uploaded' });
    }

    res.json({
      resume: {
        fileName: user.profile.resume.fileName,
        fileSize: user.profile.resume.fileSize,
        uploadedAt: user.profile.resume.uploadedAt,
        parsedData: user.profile.resume.parsedData,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
