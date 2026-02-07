import Attempt from '../models/Attempt.js';
import User from '../models/User.js';

export const detectFraud = async (attempt, candidateId) => {
  const flags = {
    resumeMismatch: false,
    randomAttempts: false,
    botDetection: false,
    plagiarism: 0,
  };

  try {
    // 1. Check for extremely fast submissions
    const timeSpent = (attempt.submittedAt - attempt.startedAt) / 1000; // seconds
    const assessment = attempt.assessmentId;
    
    // If submitted in less than 30 seconds, flag as suspicious
    if (timeSpent < 30) {
      flags.randomAttempts = true;
    }

    // 2. Check for repeated submissions from same candidate
    const previousAttempts = await Attempt.find({
      candidateId,
      jobId: attempt.jobId,
    }).sort({ createdAt: -1 });

    if (previousAttempts.length > 3) {
      flags.botDetection = true;
    }

    // 3. Check for resume mismatch (if score is very low but candidate claims high skills)
    // This would require resume data - simplified for now
    if (attempt.score < 20 && previousAttempts.length === 0) {
      // First attempt with very low score might indicate mismatch
      flags.resumeMismatch = true;
    }

    // 4. Check for plagiarism (compare with other attempts)
    const otherAttempts = await Attempt.find({
      jobId: attempt.jobId,
      candidateId: { $ne: candidateId },
      submittedAt: { $exists: true },
    });

    let maxSimilarity = 0;
    for (const otherAttempt of otherAttempts) {
      const similarity = calculateSimilarity(attempt.answers, otherAttempt.answers);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    flags.plagiarism = maxSimilarity;

    return flags;
  } catch (error) {
    console.error('Fraud detection error:', error);
    return flags;
  }
};

const calculateSimilarity = (answers1, answers2) => {
  if (answers1.length !== answers2.length) return 0;

  let matches = 0;
  for (let i = 0; i < answers1.length; i++) {
    const answer1 = answers1[i].answer?.toLowerCase().trim() || '';
    const answer2 = answers2[i].answer?.toLowerCase().trim() || '';
    
    if (answer1 === answer2 && answer1.length > 10) {
      matches++;
    }
  }

  return (matches / answers1.length) * 100;
};
