import AIService from './aiService.js';
import Attempt from '../models/Attempt.js';
import Result from '../models/Result.js';
import Assessment from '../models/Assessment.js';

export const generateCandidateReport = async (candidateId, jobId) => {
  try {
    const attempt = await Attempt.findOne({ candidateId, jobId })
      .populate('assessmentId')
      .populate('jobId');

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const result = await Result.findOne({ candidateId, jobId });

    const prompt = `Generate a comprehensive candidate assessment report.

Candidate Performance:
- Overall Score: ${result?.overallScore || attempt.score}%
- Rank: ${result?.rank || 'N/A'}
- Percentile: ${result?.percentile || 0}%

Section Scores:
- Objective Questions: ${attempt.sectionScores?.objective || 0}%
- Subjective Questions: ${attempt.sectionScores?.subjective || 0}%
- Coding Questions: ${attempt.sectionScores?.coding || 0}%

Job Requirements:
${attempt.jobId?.skills?.join(', ') || 'Not specified'}

Generate a detailed report with:
1. Executive Summary
2. Strengths (what the candidate did well)
3. Weaknesses (areas for improvement)
4. Skill Gap Analysis (missing skills vs job requirements)
5. Recommendations (for hiring decision)

Return JSON:
{
  "executiveSummary": "string",
  "strengths": ["array of strengths"],
  "weaknesses": ["array of weaknesses"],
  "skillGapAnalysis": {
    "missingSkills": ["array"],
    "strongSkills": ["array"],
    "recommendations": "string"
  },
  "recommendations": "string",
  "overallRating": "string (Excellent/Good/Average/Needs Improvement)"
}`;

    const report = await AIService.generateJSON(prompt);

    return {
      ...report,
      metrics: {
        overallScore: result?.overallScore || attempt.score,
        rank: result?.rank,
        percentile: result?.percentile,
        sectionScores: attempt.sectionScores,
      },
      flags: attempt.flags,
    };
  } catch (error) {
    console.error('Report generation error:', error);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
};
