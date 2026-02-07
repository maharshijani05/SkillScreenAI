import AIService from './aiService.js';

export const screenResume = async (resumeData, jobData) => {
  const prompt = `You are a hiring screening system. Analyze if a candidate's resume matches a job description.

Job Requirements:
- Title: ${jobData.title}
- Skills Required: ${jobData.skills?.join(', ') || 'Not specified'}
- Experience Level: ${jobData.experienceLevel || 'Not specified'}
- Description: ${jobData.description?.substring(0, 500) || 'Not specified'}

Candidate Resume:
- Name: ${resumeData.name || 'Not provided'}
- Skills: ${resumeData.skills?.join(', ') || 'Not specified'}
- Experience Level: ${resumeData.experience || 'Not specified'}
- Summary: ${resumeData.summary || 'Not provided'}
- Work Experience: ${resumeData.workExperience?.join('; ') || 'Not provided'}

Analyze the match between the resume and job requirements. Return a JSON object with:

{
  "status": "approved" or "rejected",
  "matchScore": number (0-100),
  "analysis": {
    "strengths": ["array of candidate strengths"],
    "weaknesses": ["array of candidate weaknesses"],
    "missingSkills": ["array of required skills not found in resume"],
    "matchingSkills": ["array of skills that match"],
    "recommendation": "detailed recommendation string"
  },
  "rejectionReason": "reason for rejection if status is rejected, empty string if approved"
}

Be strict but fair. Reject only if there's a significant mismatch (matchScore < 50). Otherwise, approve and provide detailed analysis.`;

  const schema = {
    status: 'string',
    matchScore: 'number',
    analysis: {
      strengths: ['string'],
      weaknesses: ['string'],
      missingSkills: ['string'],
      matchingSkills: ['string'],
      recommendation: 'string',
    },
    rejectionReason: 'string',
  };

  try {
    const screening = await AIService.generateJSON(prompt, schema);
    return screening;
  } catch (error) {
    throw new Error(`Failed to screen resume: ${error.message}`);
  }
};
