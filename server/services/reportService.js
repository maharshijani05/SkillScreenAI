import AIService from './aiService.js';
import Attempt from '../models/Attempt.js';
import Result from '../models/Result.js';

export const generateCandidateReport = async (candidateId, jobId) => {
  try {
    const attempt = await Attempt.findOne({ candidateId, jobId })
      .populate('assessmentId')
      .populate('jobId');

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const result = await Result.findOne({ candidateId, jobId });

    const overallScore = result?.overallScore || attempt.score || 0;
    const rank = result?.rank || 'N/A';
    const percentile = result?.percentile || 0;
    const sectionScores = attempt.sectionScores || {};

    // Try AI-generated report first
    try {
      const prompt = `Generate a comprehensive candidate assessment report.

Candidate Performance:
- Overall Score: ${overallScore}%
- Rank: ${rank}
- Percentile: ${percentile}%

Section Scores:
- Objective Questions: ${sectionScores.objective || 0}%
- Subjective Questions: ${sectionScores.subjective || 0}%
- Coding Questions: ${sectionScores.coding || 0}%

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
          overallScore,
          rank,
          percentile,
          sectionScores,
        },
        flags: attempt.flags,
      };
    } catch (aiError) {
      console.error('AI report generation failed, using fallback:', aiError.message);

      // Fallback: generate rule-based report
      const rating =
        overallScore >= 80
          ? 'Excellent'
          : overallScore >= 60
          ? 'Good'
          : overallScore >= 40
          ? 'Average'
          : 'Needs Improvement';

      const strengths = [];
      const weaknesses = [];

      if (sectionScores.objective >= 70) strengths.push('Strong objective/MCQ performance');
      else if (sectionScores.objective < 40) weaknesses.push('Needs improvement in objective questions');

      if (sectionScores.subjective >= 70) strengths.push('Good subjective/analytical skills');
      else if (sectionScores.subjective < 40) weaknesses.push('Subjective response quality needs improvement');

      if (sectionScores.coding >= 70) strengths.push('Strong coding and problem-solving ability');
      else if (sectionScores.coding < 40) weaknesses.push('Coding skills need development');

      if (overallScore >= 75) strengths.push('Above-average overall performance');
      if (overallScore >= 90) strengths.push('Top-tier candidate');

      if (strengths.length === 0) strengths.push('Completed the assessment');
      if (weaknesses.length === 0) weaknesses.push('No major weaknesses identified');

      return {
        executiveSummary: `Candidate scored ${overallScore.toFixed(1)}% overall, ranking #${rank} in the ${percentile.toFixed(0)}th percentile. Overall rating: ${rating}.`,
        strengths,
        weaknesses,
        skillGapAnalysis: {
          missingSkills: [],
          strongSkills: attempt.jobId?.skills?.slice(0, 3) || [],
          recommendations: `Based on a score of ${overallScore.toFixed(1)}%, ${
            overallScore >= 60
              ? 'the candidate shows adequate competency for this role.'
              : 'the candidate may need further skill development before being considered.'
          }`,
        },
        recommendations:
          overallScore >= 80
            ? 'Strongly recommend for the next round.'
            : overallScore >= 60
            ? 'Consider for the next round with specific skill assessment.'
            : 'May not be the best fit for this position at this time.',
        overallRating: rating,
        metrics: {
          overallScore,
          rank,
          percentile,
          sectionScores,
        },
        flags: attempt.flags,
      };
    }
  } catch (error) {
    console.error('Report generation error:', error);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
};
