import { PDFParse } from 'pdf-parse';
import AIService from './aiService.js';

// Accepts a Buffer (from multer memory storage)
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

    // getText() returns { text: "...", pages: [...], total: N }
    let resumeText = '';
    if (typeof textResult === 'string') {
      resumeText = textResult;
    } else if (textResult && typeof textResult === 'object') {
      resumeText = textResult.text || '';
      // If main text is just page markers, try concatenating page texts
      if (resumeText.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim().length < 20 && textResult.pages) {
        const pageTexts = textResult.pages.map((p) => p.text || '').join('\n');
        if (pageTexts.trim().length > resumeText.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim().length) {
          resumeText = pageTexts;
        }
      }
    }

    // Clean the text - remove page markers
    resumeText = resumeText.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();

    if (!resumeText || resumeText.length < 10) {
      throw new Error('PDF appears to be empty or could not extract text. Please ensure the PDF contains selectable text (not scanned images).');
    }

    console.log(`PDF parsed: ${resumeText.length} chars extracted`);
    return await parseResumeText(resumeText);
  } catch (error) {
    console.error('PDF parsing error:', error.message);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
};

export const parseResumeText = async (resumeText) => {
  const prompt = `Extract structured information from the following resume text. Return a JSON object with this exact structure:

{
  "name": "candidate name",
  "email": "email address",
  "phone": "phone number if available",
  "skills": ["array of technical and professional skills - extract ALL skills mentioned"],
  "experience": "one of: Fresher, Junior, Mid, Senior, Lead (based on years of experience: 0-1=Fresher, 1-3=Junior, 3-5=Mid, 5-10=Senior, 10+=Lead)",
  "education": ["array of education entries"],
  "workExperience": ["array of work experience entries, each as a summary string"],
  "summary": "brief professional summary"
}

IMPORTANT:
- Extract ALL skills mentioned anywhere in the resume (technical skills, tools, languages, frameworks, soft skills)
- Determine experience level based on work history dates, not just what they claim
- If no clear work experience, set experience to "Fresher"
- Be thorough with skill extraction - check every section of the resume

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
    console.log(`AI parsed resume: ${parsed.skills?.length || 0} skills found, experience: ${parsed.experience}`);
    return parsed;
  } catch (error) {
    // Fallback: basic regex-based extraction without AI
    console.error('AI parsing failed, using regex fallback:', error.message);
    return extractWithRegex(resumeText);
  }
};

/**
 * Regex-based fallback resume parser
 * Used when AI is unavailable (quota exceeded etc.)
 */
function extractWithRegex(text) {
  const lowerText = text.toLowerCase();

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : '';

  // Extract phone
  const phoneMatch = text.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // Extract name (usually first line or near the top)
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const name = lines.length > 0 ? lines[0].substring(0, 60) : '';

  // Extract skills using common tech keywords
  const skillKeywords = [
    'javascript', 'typescript', 'python', 'java', 'c\\+\\+', 'c#', 'ruby', 'php', 'go', 'rust', 'swift', 'kotlin',
    'react', 'angular', 'vue', 'next\\.?js', 'node\\.?js', 'express', 'django', 'flask', 'spring', 'laravel',
    'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'firebase', 'dynamodb',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd',
    'git', 'github', 'gitlab', 'jira', 'agile', 'scrum',
    'rest\\s*api', 'graphql', 'microservices', 'serverless',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp',
    'data science', 'data analysis', 'pandas', 'numpy', 'tableau', 'power bi',
    'figma', 'photoshop', 'illustrator',
    'linux', 'unix', 'bash', 'shell',
    'testing', 'jest', 'cypress', 'selenium', 'junit',
    'blockchain', 'web3', 'solidity',
    'communication', 'leadership', 'teamwork', 'problem.solving', 'project management',
  ];

  const foundSkills = [];
  for (const keyword of skillKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(text)) {
      // Get the original casing from the text
      const match = text.match(new RegExp(`\\b(${keyword})\\b`, 'i'));
      if (match) {
        foundSkills.push(match[1]);
      }
    }
  }

  // Determine experience level from keywords
  let experience = 'Fresher';
  if (/\b(10|[1-9]\d)\+?\s*years?\b/i.test(text)) experience = 'Lead';
  else if (/\b[5-9]\+?\s*years?\b/i.test(text)) experience = 'Senior';
  else if (/\b[3-4]\+?\s*years?\b/i.test(text)) experience = 'Mid';
  else if (/\b[1-2]\+?\s*years?\b/i.test(text)) experience = 'Junior';
  else if (/\b(fresher|entry.level|recent graduate|new graduate|intern)\b/i.test(text)) experience = 'Fresher';

  // Extract education
  const education = [];
  const eduPatterns = [
    /\b(B\.?(?:Tech|Sc|E|A|Com)|M\.?(?:Tech|Sc|E|A|Com|BA)|Ph\.?D|Bachelor|Master|MBA|BCA|MCA|Diploma)\b[^.\n]{0,100}/gi,
  ];
  for (const pattern of eduPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      education.push(...matches.map((m) => m.trim()).slice(0, 5));
    }
  }

  // Extract work experience entries
  const workExperience = [];
  const workPatterns = [
    /(?:worked?\s+(?:at|for|with)|employed\s+(?:at|by))\s+[^.\n]{5,100}/gi,
    /\b(?:Software|Frontend|Backend|Full.?Stack|Data|DevOps|Product|Project|QA|UI|UX)\s+(?:Engineer|Developer|Designer|Manager|Analyst|Scientist|Architect)\b[^.\n]{0,100}/gi,
  ];
  for (const pattern of workPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      workExperience.push(...matches.map((m) => m.trim()).slice(0, 5));
    }
  }

  // Build summary from first few meaningful lines
  const summaryLines = lines.filter((l) => l.length > 20 && !l.match(/^(name|email|phone|address|linkedin|github)/i));
  const summary = summaryLines.slice(0, 3).join(' ').substring(0, 500) || text.substring(0, 500);

  console.log(`Regex fallback: found ${foundSkills.length} skills, experience: ${experience}`);

  return {
    name,
    email,
    phone,
    skills: [...new Set(foundSkills)], // deduplicate
    experience,
    education,
    workExperience,
    summary,
  };
}
