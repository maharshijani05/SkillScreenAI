import AIService from './aiService.js';

const parseJobDescription = async (jdText) => {
  const prompt = `Analyze the following job description and extract structured information. Return a JSON object with the following structure:

{
  "skills": ["array of technical skills"],
  "softSkills": ["array of soft skills"],
  "tools": ["array of tools and technologies"],
  "experience": "one of: Fresher, Junior, Mid, Senior, Lead",
  "responsibilities": ["array of key responsibilities"],
  "requirements": ["array of key requirements"]
}

Job Description:
${jdText}

Extract all relevant information accurately.`;

  const schema = {
    skills: ['string'],
    softSkills: ['string'],
    tools: ['string'],
    experience: 'string',
    responsibilities: ['string'],
    requirements: ['string'],
  };

  try {
    const parsed = await AIService.generateJSON(prompt, schema);
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse job description: ${error.message}`);
  }
};

export default parseJobDescription;
