import { PDFParse } from 'pdf-parse';
import AIService from './aiService.js';

// Accepts a Buffer (from multer memory storage) or a file path
export const parseResumePDF = async (bufferOrPath) => {
  try {
    let dataBuffer;

    if (Buffer.isBuffer(bufferOrPath)) {
      dataBuffer = bufferOrPath;
    } else {
      // Legacy: file path support
      const fs = await import('fs/promises');
      dataBuffer = await fs.default.readFile(bufferOrPath);
    }
    
    const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
    const textResult = await parser.getText();
    
    // textResult is an object with .text property or is the text directly
    const resumeText = typeof textResult === 'string' ? textResult : (textResult?.text || textResult?.toString() || '');
    
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
${resumeText.substring(0, 5000)}

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
    // Fallback: basic text extraction without AI
    console.error('AI parsing failed, using basic extraction:', error.message);
    return {
      name: '',
      email: '',
      phone: '',
      skills: [],
      experience: 'Fresher',
      education: [],
      workExperience: [],
      summary: resumeText.substring(0, 500),
    };
  }
};
