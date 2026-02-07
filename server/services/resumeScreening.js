import AIService from './aiService.js';

/**
 * Experience level hierarchy (index = seniority weight)
 * Higher index = more senior
 */
const EXP_LEVELS = ['Fresher', 'Junior', 'Mid', 'Senior', 'Lead'];

/**
 * Normalize a skill string for comparison
 */
const normalize = (s) => s.toLowerCase().trim().replace(/[.\-\/]/g, '');

/**
 * Check if two skills match (exact, substring, or alias)
 */
const skillsMatch = (candidateSkill, jobSkill) => {
  const a = normalize(candidateSkill);
  const b = normalize(jobSkill);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Prevent "java" matching "javascript"
  if ((a === 'java' && b === 'javascript') || (b === 'java' && a === 'javascript')) return false;
  return false;
};

/**
 * RULE-BASED PRE-SCREENING
 * Runs before AI and catches obvious mismatches.
 * Returns { pass: boolean, result: screeningResult } if failed, or { pass: true } if ok to proceed.
 */
const ruleBasedScreening = (resumeData, jobData) => {
  const candidateSkills = (resumeData.skills || []).map(normalize);
  const jobSkills = (jobData.skills || []).map(normalize);
  const candidateExp = resumeData.experience || '';
  const jobExp = jobData.experienceLevel || '';

  const candidateExpIdx = EXP_LEVELS.indexOf(candidateExp);
  const jobExpIdx = EXP_LEVELS.indexOf(jobExp);

  // Calculate skill overlap
  let matchedSkills = [];
  let missingSkills = [];

  for (const jobSkill of jobData.skills || []) {
    let found = false;
    for (const candSkill of resumeData.skills || []) {
      if (skillsMatch(candSkill, jobSkill)) {
        matchedSkills.push(jobSkill);
        found = true;
        break;
      }
    }
    if (!found) missingSkills.push(jobSkill);
  }

  const totalJobSkills = jobSkills.length || 1;
  const skillOverlap = matchedSkills.length / totalJobSkills;
  const skillMatchPercent = Math.round(skillOverlap * 100);

  // ===== HARD REJECTION RULES =====

  // RULE 1: Extreme experience level mismatch
  // Fresher/Junior applying for Senior/Lead = reject
  // Senior/Lead applying for Fresher = also reject (overqualified, likely fraud)
  if (candidateExpIdx >= 0 && jobExpIdx >= 0) {
    const gap = jobExpIdx - candidateExpIdx;

    // Under-qualified by 2+ levels (e.g., Fresher → Senior, Junior → Lead)
    if (gap >= 2) {
      return {
        pass: false,
        result: {
          status: 'rejected',
          matchScore: Math.max(5, skillMatchPercent - 20),
          analysis: {
            strengths: matchedSkills.length > 0
              ? [`Has some relevant skills: ${matchedSkills.join(', ')}`]
              : ['Resume was submitted for review'],
            weaknesses: [
              `Experience level mismatch: Your profile says "${candidateExp}" but this role requires "${jobExp}" level experience`,
              `This position requires ${gap > 2 ? 'significantly' : ''} more experience than your profile indicates`,
            ],
            missingSkills,
            matchingSkills: matchedSkills,
            recommendation: `This role requires ${jobExp}-level experience. Your profile indicates ${candidateExp}-level experience, which is ${gap} levels below the requirement. Consider applying for positions that match your current experience level.`,
          },
          rejectionReason: `Experience level mismatch: Position requires ${jobExp} but candidate is ${candidateExp} (${gap} levels gap). Consider applying for ${candidateExp} or ${EXP_LEVELS[Math.min(candidateExpIdx + 1, EXP_LEVELS.length - 1)]}-level positions.`,
        },
      };
    }
  }

  // RULE 2: No relevant skills at all
  if (jobSkills.length >= 3 && matchedSkills.length === 0 && candidateSkills.length > 0) {
    return {
      pass: false,
      result: {
        status: 'rejected',
        matchScore: 10,
        analysis: {
          strengths: [`Has ${candidateSkills.length} skills on resume`],
          weaknesses: [
            'None of the required job skills were found in your resume',
            `Job requires: ${(jobData.skills || []).join(', ')}`,
            `Your skills: ${(resumeData.skills || []).join(', ')}`,
          ],
          missingSkills,
          matchingSkills: [],
          recommendation: 'Your skill set does not align with this position. None of the required skills were found in your resume. Consider upskilling or applying for roles that match your current expertise.',
        },
        rejectionReason: `No skill overlap: Job requires ${(jobData.skills || []).join(', ')} but none were found in candidate resume.`,
      },
    };
  }

  // RULE 3: Very low skill match + experience gap
  if (skillOverlap < 0.2 && candidateExpIdx >= 0 && jobExpIdx >= 0 && jobExpIdx - candidateExpIdx >= 1) {
    return {
      pass: false,
      result: {
        status: 'rejected',
        matchScore: Math.max(10, skillMatchPercent),
        analysis: {
          strengths: matchedSkills.length > 0
            ? [`Partial skill match: ${matchedSkills.join(', ')}`]
            : ['Resume was reviewed'],
          weaknesses: [
            `Only ${skillMatchPercent}% of required skills match your resume`,
            `Experience gap: You're ${candidateExp}, role needs ${jobExp}`,
          ],
          missingSkills,
          matchingSkills: matchedSkills,
          recommendation: `Your profile has only ${skillMatchPercent}% skill overlap and a lower experience level (${candidateExp} vs ${jobExp}). This combination makes you unlikely to succeed in this role. Consider gaining experience in: ${missingSkills.slice(0, 5).join(', ')}.`,
        },
        rejectionReason: `Low qualification match: ${skillMatchPercent}% skill overlap + experience gap (${candidateExp} vs ${jobExp} required).`,
      },
    };
  }

  // RULE 4: Empty or garbage resume (no skills at all)
  if (candidateSkills.length === 0 && (!resumeData.summary || resumeData.summary.length < 20) && (!resumeData.workExperience || resumeData.workExperience.length === 0)) {
    return {
      pass: false,
      result: {
        status: 'rejected',
        matchScore: 5,
        analysis: {
          strengths: [],
          weaknesses: [
            'Resume appears to be empty or could not be parsed properly',
            'No skills, work experience, or summary were found',
          ],
          missingSkills: jobData.skills || [],
          matchingSkills: [],
          recommendation: 'Your resume could not be analyzed properly. Please ensure it contains your skills, work experience, and a professional summary. Then try again.',
        },
        rejectionReason: 'Resume appears empty or unparseable. No skills, experience, or summary detected.',
      },
    };
  }

  // Passed rule-based screening — proceed to AI
  return {
    pass: true,
    partialData: {
      matchedSkills,
      missingSkills,
      skillMatchPercent,
      experienceGap: candidateExpIdx >= 0 && jobExpIdx >= 0 ? jobExpIdx - candidateExpIdx : null,
    },
  };
};

/**
 * AI-POWERED SCREENING
 * Called only if rule-based screening passes. Uses stricter prompt.
 */
export const screenResume = async (resumeData, jobData) => {
  // Step 1: Rule-based pre-screening
  const ruleCheck = ruleBasedScreening(resumeData, jobData);

  if (!ruleCheck.pass) {
    console.log(`Resume rejected by rules: ${ruleCheck.result.rejectionReason}`);
    return ruleCheck.result;
  }

  const { matchedSkills, missingSkills, skillMatchPercent, experienceGap } = ruleCheck.partialData;

  // Step 2: AI screening (stricter prompt)
  const prompt = `You are a STRICT hiring screening system. Your job is to ensure only qualified candidates proceed to the assessment phase.

## Job Requirements
- Title: ${jobData.title}
- Required Skills: ${jobData.skills?.join(', ') || 'Not specified'}
- Experience Level Required: ${jobData.experienceLevel || 'Not specified'}
- Description: ${jobData.description?.substring(0, 800) || 'Not specified'}

## Candidate Resume
- Skills: ${resumeData.skills?.join(', ') || 'None found'}
- Experience Level: ${resumeData.experience || 'Not specified'}
- Summary: ${resumeData.summary || 'Not provided'}
- Work Experience: ${resumeData.workExperience?.join('; ') || 'None listed'}
- Education: ${resumeData.education?.join('; ') || 'Not listed'}

## Pre-screening Data
- Skill match: ${skillMatchPercent}% (${matchedSkills.length}/${(jobData.skills || []).length} skills match)
- Matched: ${matchedSkills.join(', ') || 'None'}
- Missing: ${missingSkills.join(', ') || 'None'}
- Experience gap: ${experienceGap !== null ? `${experienceGap} level(s) ${experienceGap > 0 ? 'below' : experienceGap < 0 ? 'above' : 'exact match'}` : 'Unknown'}

## Screening Rules (FOLLOW STRICTLY)
1. If skill match < 40% AND experience is below required → REJECT
2. If candidate claims experience level that doesn't match their work history → REJECT (likely fraud/exaggeration)
3. If work experience is empty/minimal but claims Mid/Senior/Lead → REJECT (suspicious)
4. If candidate has good skills but is 1 level below required experience → APPROVE with low score (50-65)
5. If candidate matches well → APPROVE with appropriate score
6. Be skeptical of resumes with buzzwords but no concrete work experience

Return a JSON object:
{
  "status": "approved" or "rejected",
  "matchScore": number (0-100, be realistic, don't inflate),
  "analysis": {
    "strengths": ["specific strengths based on resume"],
    "weaknesses": ["specific gaps and concerns"],
    "missingSkills": ["skills from job not found in resume"],
    "matchingSkills": ["skills that match between resume and job"],
    "recommendation": "detailed assessment with specific reasoning"
  },
  "rejectionReason": "clear reason if rejected, empty string if approved",
  "fraudIndicators": ["list any suspicious patterns like inflated experience claims"]
}

Be STRICT. The purpose is to filter out unqualified candidates, not to be generous. Only approve candidates who have a reasonable chance of succeeding in this role.`;

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
    fraudIndicators: ['string'],
  };

  try {
    const screening = await AIService.generateJSON(prompt, schema);

    // Validate AI response — ensure it's consistent
    if (screening.matchScore < 40 && screening.status === 'approved') {
      screening.status = 'rejected';
      screening.rejectionReason = screening.rejectionReason || `Match score too low (${screening.matchScore}%). Minimum required: 40%.`;
    }

    // If AI approved but experience gap is concerning, add a warning
    if (screening.status === 'approved' && experienceGap && experienceGap >= 1) {
      screening.analysis.weaknesses = screening.analysis.weaknesses || [];
      screening.analysis.weaknesses.push(
        `Note: Candidate experience (${resumeData.experience}) is ${experienceGap} level(s) below the required ${jobData.experienceLevel}`
      );
      // Cap the score for under-experienced candidates
      screening.matchScore = Math.min(screening.matchScore, 65);
    }

    return screening;
  } catch (error) {
    // Step 3: FALLBACK — Rule-based scoring instead of auto-approve
    console.error('AI screening failed, using rule-based fallback:', error.message);
    return ruleBasedFallback(resumeData, jobData, matchedSkills, missingSkills, skillMatchPercent, experienceGap);
  }
};

/**
 * RULE-BASED FALLBACK when AI is unavailable
 * Uses skill match + experience level to determine pass/fail
 */
const ruleBasedFallback = (resumeData, jobData, matchedSkills, missingSkills, skillMatchPercent, experienceGap) => {
  let score = 0;

  // Skill score (0-60)
  score += Math.round((skillMatchPercent / 100) * 60);

  // Experience score (0-30)
  if (experienceGap !== null) {
    if (experienceGap === 0) score += 30;       // Exact match
    else if (experienceGap === -1) score += 25;  // Slightly overqualified
    else if (experienceGap === 1) score += 10;   // 1 level below
    else if (experienceGap < 0) score += 20;     // Overqualified
    // experienceGap >= 2 would have been caught by rule-based pre-screening
  } else {
    score += 15; // Unknown experience, give benefit of doubt
  }

  // Profile completeness bonus (0-10)
  if (resumeData.summary && resumeData.summary.length > 50) score += 3;
  if (resumeData.workExperience && resumeData.workExperience.length > 0) score += 4;
  if (resumeData.education && resumeData.education.length > 0) score += 3;

  const status = score >= 40 ? 'approved' : 'rejected';

  return {
    status,
    matchScore: score,
    analysis: {
      strengths: matchedSkills.length > 0
        ? [`Matching skills: ${matchedSkills.join(', ')}`]
        : ['Resume was submitted for review'],
      weaknesses: [
        ...(missingSkills.length > 0 ? [`Missing required skills: ${missingSkills.join(', ')}`] : []),
        ...(experienceGap && experienceGap > 0 ? [`Experience level is ${experienceGap} level(s) below requirement`] : []),
        'Note: AI screening was unavailable, used automated rule-based evaluation',
      ],
      missingSkills,
      matchingSkills: matchedSkills,
      recommendation: status === 'approved'
        ? `Automated screening passed with score ${score}/100. ${missingSkills.length > 0 ? `Consider improving: ${missingSkills.slice(0, 3).join(', ')}.` : 'Good skill match.'}`
        : `Automated screening failed with score ${score}/100. ${missingSkills.length > 0 ? `Major gaps in: ${missingSkills.join(', ')}.` : ''} ${experienceGap && experienceGap > 0 ? `Experience level mismatch (${resumeData.experience || 'Unknown'} vs ${jobData.experienceLevel} required).` : ''}`,
    },
    rejectionReason: status === 'rejected'
      ? `Automated screening score: ${score}/100 (minimum 40 required). ${skillMatchPercent}% skill match${experienceGap && experienceGap > 0 ? `, experience ${experienceGap} level(s) below requirement` : ''}.`
      : '',
  };
};
