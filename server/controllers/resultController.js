import Result from '../models/Result.js';
import { getLeaderboard } from '../services/rankingService.js';
import { generateCandidateReport } from '../services/reportService.js';

export const getResults = async (req, res) => {
  try {
    const { jobId } = req.params;

    const results = await Result.find({ jobId })
      .populate('candidateId', 'name email')
      .sort({ rank: 1 });

    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeaderboardForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const leaderboard = await getLeaderboard(jobId, limit);

    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCandidateReport = async (req, res) => {
  try {
    const { candidateId, jobId } = req.params;

    // Only recruiter/admin can view reports
    if (req.user.role === 'candidate' && req.user._id.toString() !== candidateId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const report = await generateCandidateReport(candidateId, jobId);

    res.json({ report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
