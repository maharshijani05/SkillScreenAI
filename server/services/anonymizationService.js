import Job from '../models/Job.js';
import Result from '../models/Result.js';
import Attempt from '../models/Attempt.js';
import { AIService } from './aiService.js';

// Generate a consistent anonymous identifier for a candidate within a job
const anonymousLabels = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi',
  'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega',
];

// Create a deterministic mapping of candidateId -> anonymous label within a job
export const getAnonymousMapping = (candidateIds) => {
  const mapping = {};
  candidateIds.forEach((id, index) => {
    const label = index < anonymousLabels.length
      ? `Candidate ${anonymousLabels[index]}`
      : `Candidate ${index + 1}`;
    mapping[id.toString()] = label;
  });
  return mapping;
};

// Anonymize a candidate result object
export const anonymizeResult = (result, anonymousName) => {
  const anonymized = result.toObject ? result.toObject() : { ...result };

  // Replace identifying info
  if (anonymized.candidateId && typeof anonymized.candidateId === 'object') {
    anonymized.candidateId = {
      _id: anonymized.candidateId._id,
      name: anonymousName,
      email: `${anonymousName.toLowerCase().replace(/\s+/g, '.')}@anonymous`,
    };
  }

  // Strip any resume or personal data references
  delete anonymized.resumeAnalysis;

  return anonymized;
};

// Generate AI-powered neutral summary based purely on performance
export const generateNeutralSummary = async (result, attempt) => {
  try {
    const prompt = `Generate a brief, neutral candidate assessment summary based ONLY on these performance metrics. Do NOT reference any personal details, names, demographics, universities, or identifiers. Focus purely on skills and performance.

Performance Data:
- Overall Score: ${result.overallScore}%
- Rank: #${result.rank}
- Percentile: ${result.percentile}%
- Section Scores: Objective: ${attempt?.sectionScores?.objective || 'N/A'}%, Subjective: ${attempt?.sectionScores?.subjective || 'N/A'}%, Coding: ${attempt?.sectionScores?.coding || 'N/A'}%
- Integrity Score: ${attempt?.integrityScore || 100}/100
- Time Spent: ${attempt?.timeSpent ? Math.round(attempt.timeSpent / 60) : 'N/A'} minutes
- Skill Breakdown: ${JSON.stringify(Object.fromEntries(result.skillBreakdown || new Map()))}

Return a JSON object with:
{
  "summary": "2-3 sentence neutral performance summary",
  "strengths": ["strength1", "strength2"],
  "areasForImprovement": ["area1", "area2"],
  "recommendation": "strong_hire" | "hire" | "maybe" | "no_hire"
}`;

    const response = await AIService.generateJSON(prompt);
    return response;
  } catch (error) {
    console.error('Failed to generate neutral summary:', error);
    // Fallback to rule-based summary
    return {
      summary: `This candidate scored ${result.overallScore.toFixed(1)}% overall, ranking #${result.rank} with a ${result.percentile.toFixed(0)}th percentile performance.`,
      strengths: result.overallScore >= 70 ? ['Strong overall performance'] : ['Completed assessment'],
      areasForImprovement: result.overallScore < 50 ? ['Overall score below average'] : [],
      recommendation: result.overallScore >= 80 ? 'strong_hire' : result.overallScore >= 60 ? 'hire' : result.overallScore >= 40 ? 'maybe' : 'no_hire',
    };
  }
};

// Calculate bias reduction metrics for a job
export const calculateBiasMetrics = async (jobId) => {
  try {
    const results = await Result.find({ jobId })
      .populate('candidateId', 'name email createdAt')
      .sort({ rank: 1 });

    if (results.length === 0) {
      return {
        totalCandidates: 0,
        metricsAvailable: false,
        message: 'No results available yet',
      };
    }

    const scores = results.map(r => r.overallScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Score distribution analysis
    const scoreRanges = {
      excellent: scores.filter(s => s >= 80).length,
      good: scores.filter(s => s >= 60 && s < 80).length,
      average: scores.filter(s => s >= 40 && s < 60).length,
      belowAverage: scores.filter(s => s < 40).length,
    };

    // Fairness index: lower variance = more fair evaluation
    // Normalized between 0-100 where 100 is most fair
    const fairnessIndex = Math.max(0, Math.min(100, 100 - (stdDev / avgScore) * 100));

    // Performance-based distribution (ideal would be normal-like)
    const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];
    const skewness = (avgScore - medianScore) / (stdDev || 1);

    return {
      totalCandidates: results.length,
      metricsAvailable: true,
      averageScore: Math.round(avgScore * 10) / 10,
      medianScore: Math.round(medianScore * 10) / 10,
      standardDeviation: Math.round(stdDev * 10) / 10,
      fairnessIndex: Math.round(fairnessIndex * 10) / 10,
      scoreDistribution: scoreRanges,
      skewness: Math.round(skewness * 100) / 100,
      biasIndicators: {
        evaluationConsistency: stdDev < 15 ? 'High' : stdDev < 25 ? 'Moderate' : 'Low',
        scoreSpread: `${Math.min(...scores).toFixed(1)}% - ${Math.max(...scores).toFixed(1)}%`,
        performanceGap: Math.round((Math.max(...scores) - Math.min(...scores)) * 10) / 10,
      },
      anonymousHiringBenefits: [
        'Eliminated name-based bias in evaluation',
        'Removed university prestige bias',
        'Prevented demographic-based prejudgment',
        'Focused evaluation purely on skill demonstration',
      ],
    };
  } catch (error) {
    console.error('Failed to calculate bias metrics:', error);
    throw error;
  }
};

export default {
  getAnonymousMapping,
  anonymizeResult,
  generateNeutralSummary,
  calculateBiasMetrics,
};
