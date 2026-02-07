import Job from '../models/Job.js';
import User from '../models/User.js';
import parseJobDescription from '../services/jdParser.js';

export const createJob = async (req, res) => {
  try {
    const { title, description, assessmentConfig } = req.body;

    // Parse JD if description is provided (optional - continue even if it fails)
    let parsedData = {};
    if (description) {
      try {
        parsedData = await parseJobDescription(description);
      } catch (error) {
        console.error('JD parsing error:', error);
        // If it's a quota error, inform user but continue
        if (error.message?.includes('quota') || error.message?.includes('Daily')) {
          console.warn('JD parsing skipped due to API quota. Job will be created with manual skills.');
        }
        // Continue with manual data if parsing fails
      }
    }

    const job = await Job.create({
      title,
      description,
      skills: parsedData.skills || [],
      experienceLevel: parsedData.experience || 'Fresher',
      assessmentConfig: assessmentConfig || {
        objectiveCount: 5,
        subjectiveCount: 3,
        codingCount: 2,
        duration: 60,
      },
      anonymousHiring: req.body.anonymousHiring || false,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: 'Job created successfully',
      job,
      parsedData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJobs = async (req, res) => {
  try {
    // If recruiter/admin, show only their jobs. If candidate, show all jobs.
    const query = req.user.role === 'candidate' 
      ? {} 
      : { createdBy: req.user._id };

    // Search support for candidates
    const { search, skill, experience } = req.query;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { skills: regex },
      ];
    }
    if (skill) {
      query.skills = { $regex: new RegExp(skill, 'i') };
    }
    if (experience) {
      query.experienceLevel = experience;
    }
    
    const jobs = await Job.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('createdBy', 'name email');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({ message: 'Job updated successfully', job: updatedJob });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle anonymous hiring mode
export const toggleAnonymousHiring = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    job.anonymousHiring = !job.anonymousHiring;
    if (!job.anonymousHiring) {
      // If turning off anonymous mode, also reveal identities
      job.identitiesRevealed = true;
    } else {
      job.identitiesRevealed = false;
    }
    await job.save();

    res.json({
      message: `Anonymous hiring ${job.anonymousHiring ? 'enabled' : 'disabled'}`,
      job,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Shortlist candidates
export const shortlistCandidates = async (req, res) => {
  try {
    const { candidateIds } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    job.shortlistedCandidates = candidateIds;
    await job.save();

    res.json({ message: 'Candidates shortlisted', job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reveal identities for shortlisted candidates
export const revealIdentities = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (!job.anonymousHiring) {
      return res.status(400).json({ message: 'Anonymous hiring is not enabled for this job' });
    }

    job.identitiesRevealed = true;
    await job.save();

    res.json({ message: 'Identities revealed for shortlisted candidates', job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Skill alias map for better matching
const SKILL_ALIASES = {
  'javascript': ['js', 'es6', 'es2015', 'ecmascript', 'vanilla js'],
  'typescript': ['ts'],
  'react': ['reactjs', 'react.js', 'react js'],
  'angular': ['angularjs', 'angular.js', 'angular js'],
  'vue': ['vuejs', 'vue.js', 'vue js'],
  'node': ['nodejs', 'node.js', 'node js'],
  'express': ['expressjs', 'express.js'],
  'next': ['nextjs', 'next.js', 'next js'],
  'python': ['py', 'python3'],
  'java': [],
  'c++': ['cpp', 'cplusplus'],
  'c#': ['csharp', 'c sharp'],
  'mongodb': ['mongo'],
  'postgresql': ['postgres', 'psql'],
  'mysql': ['sql'],
  'docker': ['containerization'],
  'kubernetes': ['k8s'],
  'aws': ['amazon web services'],
  'gcp': ['google cloud', 'google cloud platform'],
  'azure': ['microsoft azure'],
  'git': ['github', 'gitlab', 'version control'],
  'css': ['css3', 'stylesheets'],
  'html': ['html5'],
  'tailwind': ['tailwindcss', 'tailwind css'],
  'sass': ['scss'],
  'rest': ['restful', 'rest api', 'restful api'],
  'graphql': ['gql'],
  'redis': [],
  'tensorflow': ['tf', 'tensorflow.js'],
  'machine learning': ['ml'],
  'deep learning': ['dl'],
  'artificial intelligence': ['ai'],
  'natural language processing': ['nlp'],
  'data science': ['data analytics'],
  'devops': ['ci/cd', 'ci cd'],
  'agile': ['scrum'],
  'flutter': [],
  'react native': ['rn'],
  'swift': ['ios'],
  'kotlin': ['android'],
};

// Build reverse alias map for faster lookup
const buildAliasLookup = () => {
  const lookup = {};
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    lookup[canonical] = canonical;
    for (const alias of aliases) {
      lookup[alias] = canonical;
    }
  }
  return lookup;
};
const ALIAS_LOOKUP = buildAliasLookup();

// Normalize a skill string to its canonical form
const normalizeSkill = (skill) => {
  const lower = skill.toLowerCase().trim();
  return ALIAS_LOOKUP[lower] || lower;
};

// Calculate similarity between two skill strings
const skillSimilarity = (a, b) => {
  const na = normalizeSkill(a);
  const nb = normalizeSkill(b);
  // Exact canonical match
  if (na === nb) return 1.0;
  // One contains the other (but avoid "java" matching "javascript")
  if (na.length >= 3 && nb.length >= 3) {
    if (na === nb.substring(0, na.length) && nb.length - na.length <= 2) return 0.8;
    if (nb === na.substring(0, nb.length) && na.length - nb.length <= 2) return 0.8;
  }
  return 0;
};

// Get recommended jobs for candidate based on profile
export const getRecommendedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profileSkills = (user.profile?.skills || []);
    const profileExperience = user.profile?.experience || '';
    const resumeSkills = (user.profile?.resume?.parsedData?.skills || []);
    const resumeSummary = (user.profile?.resume?.parsedData?.summary || '').toLowerCase();
    const bio = (user.profile?.bio || '').toLowerCase();

    // Merge and deduplicate all candidate skills (keep original case, dedupe on normalized)
    const seen = new Set();
    const allSkills = [];
    for (const s of [...profileSkills, ...resumeSkills]) {
      const norm = normalizeSkill(s);
      if (!seen.has(norm)) {
        seen.add(norm);
        allSkills.push(s);
      }
    }

    if (allSkills.length === 0 && !profileExperience && !bio) {
      return res.json({
        recommendations: [],
        message: 'Complete your profile or upload a resume to get personalized job recommendations.',
      });
    }

    const allJobs = await Job.find({}).sort({ createdAt: -1 });

    // Score each job
    const scored = allJobs.map((job) => {
      const jobSkills = (job.skills || []);
      let skillScore = 0;
      let matchedSkills = [];
      let missingSkills = [];
      const totalJobSkills = jobSkills.length || 1;
      const matchReasons = [];

      // 1. Skill matching (up to 60 points)
      for (const jobSkill of jobSkills) {
        let bestMatch = 0;
        for (const candidateSkill of allSkills) {
          const sim = skillSimilarity(candidateSkill, jobSkill);
          bestMatch = Math.max(bestMatch, sim);
        }
        if (bestMatch >= 0.8) {
          matchedSkills.push(jobSkill);
          skillScore += bestMatch === 1.0 ? 1 : 0.7;
        } else {
          missingSkills.push(jobSkill);
        }
      }
      // Normalize: if all job skills matched, get 60 points
      const skillMatchPercent = Math.round((matchedSkills.length / totalJobSkills) * 100);
      const normalizedSkillScore = totalJobSkills > 0
        ? (matchedSkills.length / totalJobSkills) * 60
        : 0;

      if (matchedSkills.length > 0) {
        matchReasons.push(`${matchedSkills.length}/${jobSkills.length} skills match`);
      }

      // 2. Experience level match (up to 25 points)
      let experienceScore = 0;
      const expLevels = ['Fresher', 'Junior', 'Mid', 'Senior', 'Lead'];
      const candidateIdx = expLevels.indexOf(profileExperience);
      const jobIdx = expLevels.indexOf(job.experienceLevel);
      if (candidateIdx >= 0 && jobIdx >= 0) {
        const diff = Math.abs(candidateIdx - jobIdx);
        if (diff === 0) { experienceScore = 25; matchReasons.push('Experience level matches exactly'); }
        else if (diff === 1) { experienceScore = 15; matchReasons.push('Experience level is close'); }
        else if (diff === 2) { experienceScore = 5; }
      }

      // 3. Title/description keyword matching (up to 15 points)
      let contextScore = 0;
      const titleLower = job.title.toLowerCase();
      const descLower = (job.description || '').toLowerCase();
      const candidateText = `${bio} ${resumeSummary} ${allSkills.join(' ').toLowerCase()}`;

      // Check if job title keywords appear in candidate profile
      const titleWords = titleLower.split(/[\s\-\/]+/).filter(w => w.length > 2);
      const titleHits = titleWords.filter(w => candidateText.includes(w));
      if (titleHits.length > 0) {
        contextScore += Math.min(10, titleHits.length * 3);
        matchReasons.push(`Profile mentions "${titleHits.slice(0, 2).join(', ')}"`);
      }

      // Check candidate skills in job description
      for (const skill of allSkills) {
        if (descLower.includes(skill.toLowerCase())) {
          contextScore += 2;
        }
      }
      contextScore = Math.min(15, contextScore);

      const totalScore = Math.round(normalizedSkillScore + experienceScore + contextScore);

      return {
        job: job.toObject(),
        score: totalScore,
        matchedSkills,
        missingSkills,
        skillMatchPercent,
        matchReasons,
      };
    });

    // Filter jobs with meaningful score and sort by score descending
    const recommendations = scored
      .filter(s => s.score >= 10)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Job.findByIdAndDelete(req.params.id);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
