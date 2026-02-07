import Attempt from '../models/Attempt.js';
import Result from '../models/Result.js';
import Job from '../models/Job.js';

export const generateRankings = async (jobId) => {
  try {
    // Get all attempts for this job
    const attempts = await Attempt.find({
      jobId,
      submittedAt: { $exists: true },
    }).populate('candidateId', 'name email');

    if (attempts.length === 0) {
      return [];
    }

    // Calculate overall scores and sort
    const candidates = attempts.map((attempt) => {
      const objectiveScore = attempt.sectionScores?.objective || 0;
      const subjectiveScore = attempt.sectionScores?.subjective || 0;
      const codingScore = attempt.sectionScores?.coding || 0;
      
      // Weighted scoring: objective 30%, subjective 30%, coding 40%
      const overallScore =
        objectiveScore * 0.3 + subjectiveScore * 0.3 + codingScore * 0.4;

      return {
        attemptId: attempt._id,
        candidateId: attempt.candidateId._id,
        candidateName: attempt.candidateId.name,
        candidateEmail: attempt.candidateId.email,
        overallScore,
        sectionScores: attempt.sectionScores,
        score: attempt.score,
        submittedAt: attempt.submittedAt,
      };
    });

    // Sort by overall score descending
    candidates.sort((a, b) => b.overallScore - a.overallScore);

    // Assign ranks and calculate percentiles
    const totalCandidates = candidates.length;
    candidates.forEach((candidate, index) => {
      candidate.rank = index + 1;
      candidate.percentile = ((totalCandidates - index) / totalCandidates) * 100;
    });

    // Save or update results
    for (const candidate of candidates) {
      await Result.findOneAndUpdate(
        {
          jobId,
          candidateId: candidate.candidateId,
        },
        {
          jobId,
          candidateId: candidate.candidateId,
          attemptId: candidate.attemptId,
          overallScore: candidate.overallScore,
          rank: candidate.rank,
          percentile: candidate.percentile,
          skillBreakdown: candidate.sectionScores || {},
        },
        { upsert: true, new: true }
      );
    }

    return candidates;
  } catch (error) {
    console.error('Ranking generation error:', error);
    throw new Error(`Failed to generate rankings: ${error.message}`);
  }
};

export const getLeaderboard = async (jobId, limit = 10) => {
  try {
    const results = await Result.find({ jobId })
      .populate('candidateId', 'name email')
      .sort({ rank: 1 })
      .limit(limit);

    return results;
  } catch (error) {
    throw new Error(`Failed to get leaderboard: ${error.message}`);
  }
};
