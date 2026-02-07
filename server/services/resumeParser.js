import AIService from './aiService.js';
import fs from 'fs/promises';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

export const parseResumePDF = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    
    // Use PDFParse class from pdf-parse
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const resumeText = textResult.text || '';
    
    if (!resumeText || resumeText.trim().length === 0) {
      throw new Error('PDF appears to be empty or could not extract text');
    }
    
    return await parseResumeText(resumeText);
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};

export const parseResumeText = async (resumeText) => {
  const prompt = `Extract structured information from the following resume text. Return a JSON object with this exact structure:

{
  "name": "candidate name",
  "email": "email address",
  "phone": "phone number if available",
  "skills": ["array of technical skills"],
  "experience": "one of: Fresher, Junior, Mid, Senior, Lead",
  "education": ["array of education entries"],
  "workExperience": ["array of work experience entries"],
  "summary": "brief professional summary"
}

Resume Text:
${resumeText}

Extract all relevant information accurately. If information is not available, use empty string or empty array.`;

  const schema = {
    name: 'string',
    email: 'string',
    phone: 'string',
    skills: ['string'],
    experience: 'string',
    education: ['string'],
    workExperience: ['string'],
    summary: 'string',
  };

  try {
    const parsed = await AIService.generateJSON(prompt, schema);
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
};
