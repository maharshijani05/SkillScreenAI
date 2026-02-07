import Result from '../models/Result.js';
import Job from '../models/Job.js';
import Attempt from '../models/Attempt.js';
import { getLeaderboard } from '../services/rankingService.js';
import { generateCandidateReport } from '../services/reportService.js';
import {
  getAnonymousMapping,
  anonymizeResult,
  generateNeutralSummary,
  calculateBiasMetrics,
} from '../services/anonymizationService.js';

export const getResults = async (req, res) => {
  try {
    const { jobId } = req.params;

    const results = await Result.find({ jobId })
      .populate('candidateId', 'name email')
      .sort({ rank: 1 });

    const job = await Job.findById(jobId);

    // If anonymous hiring is enabled and identities not revealed
    if (job?.anonymousHiring && !job.identitiesRevealed) {
      const candidateIds = results.map(r => r.candidateId?._id || r.candidateId);
      const mapping = getAnonymousMapping(candidateIds);

      const anonymizedResults = results.map(r => {
        const cId = r.candidateId?._id?.toString() || r.candidateId?.toString();
        return anonymizeResult(r, mapping[cId] || 'Candidate Unknown');
      });

      return res.json({
        results: anonymizedResults,
        anonymousMode: true,
        identitiesRevealed: false,
        shortlistedCount: job.shortlistedCandidates?.length || 0,
      });
    }

    // If identities revealed, mark shortlisted candidates
    if (job?.anonymousHiring && job.identitiesRevealed) {
      const shortlisted = new Set(job.shortlistedCandidates?.map(id => id.toString()) || []);
      const enrichedResults = results.map(r => {
        const obj = r.toObject ? r.toObject() : { ...r };
        obj.isShortlisted = shortlisted.has(
          (r.candidateId?._id || r.candidateId)?.toString()
        );
        return obj;
      });

      return res.json({
        results: enrichedResults,
        anonymousMode: true,
        identitiesRevealed: true,
        shortlistedCount: job.shortlistedCandidates?.length || 0,
      });
    }

    res.json({ results, anonymousMode: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeaderboardForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const leaderboard = await getLeaderboard(jobId, limit);
    const job = await Job.findById(jobId);

    // Anonymize leaderboard if anonymous hiring is enabled
    if (job?.anonymousHiring && !job.identitiesRevealed) {
      const candidateIds = leaderboard.map(r => r.candidateId?._id || r.candidateId);
      const mapping = getAnonymousMapping(candidateIds);

      const anonymizedLeaderboard = leaderboard.map(r => {
        const cId = r.candidateId?._id?.toString() || r.candidateId?.toString();
        return anonymizeResult(r, mapping[cId] || 'Candidate Unknown');
      });

      return res.json({
        leaderboard: anonymizedLeaderboard,
        anonymousMode: true,
        identitiesRevealed: false,
      });
    }

    // If identities revealed, mark shortlisted candidates
    if (job?.anonymousHiring && job.identitiesRevealed) {
      const shortlisted = new Set(job.shortlistedCandidates?.map(id => id.toString()) || []);
      const enrichedLeaderboard = leaderboard.map(r => {
        const obj = r.toObject ? r.toObject() : { ...r };
        obj.isShortlisted = shortlisted.has(
          (r.candidateId?._id || r.candidateId)?.toString()
        );
        return obj;
      });

      return res.json({
        leaderboard: enrichedLeaderboard,
        anonymousMode: true,
        identitiesRevealed: true,
      });
    }

    res.json({ leaderboard, anonymousMode: false, identitiesRevealed: false });
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

    const job = await Job.findById(jobId);

    // If anonymous mode and identities not revealed, return neutral summary instead
    if (job?.anonymousHiring && !job.identitiesRevealed && req.user.role !== 'candidate') {
      const result = await Result.findOne({ jobId, candidateId });
      const attempt = await Attempt.findOne({ jobId, candidateId });

      if (!result) {
        return res.status(404).json({ message: 'Result not found' });
      }

      const neutralSummary = await generateNeutralSummary(result, attempt);

      return res.json({
        report: {
          ...neutralSummary,
          metrics: {
            overallScore: result.overallScore,
            rank: result.rank,
            percentile: result.percentile,
          },
          anonymousMode: true,
        },
      });
    }

    const report = await generateCandidateReport(candidateId, jobId);
    res.json({ report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get bias reduction metrics
export const getBiasMetrics = async (req, res) => {
  try {
    const { jobId } = req.params;
    const metrics = await calculateBiasMetrics(jobId);
    res.json({ metrics });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
