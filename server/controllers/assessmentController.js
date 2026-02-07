import Assessment from '../models/Assessment.js';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import generateAssessment from '../services/assessmentGenerator.js';
import parseJobDescription from '../services/jdParser.js';

export const generateAssessmentForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if assessment already exists
    let assessment = await Assessment.findOne({ jobId });

    if (assessment) {
      return res.json({
        message: 'Assessment already exists',
        assessment,
      });
    }

    // Parse JD if needed
    let parsedJD = {
      skills: job.skills || [],
      experience: job.experienceLevel,
      tools: [],
    };

    if (job.description) {
      try {
        parsedJD = await parseJobDescription(job.description);
      } catch (error) {
        console.error('JD parsing error:', error);
      }
    }

    // Generate assessment
    const generatedAssessment = await generateAssessment(
      parsedJD,
      job.assessmentConfig
    );

    // Transform to our schema
    const questions = [
      ...generatedAssessment.objective.map((q) => ({
        type: 'objective',
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points || 1,
      })),
      ...generatedAssessment.subjective.map((q) => ({
        type: 'subjective',
        question: q.question,
        points: q.points || 5,
      })),
      ...generatedAssessment.coding.map((q) => ({
        type: 'coding',
        question: q.question,
        constraints: q.constraints,
        testCases: q.testCases,
        points: q.points || 10,
      })),
    ];

    assessment = await Assessment.create({
      jobId,
      questions,
      duration: job.assessmentConfig.duration || 60,
    });

    res.status(201).json({
      message: 'Assessment generated successfully',
      assessment,
    });
  } catch (error) {
    console.error('Assessment generation error:', error);
    
    // Check if it's a rate limit error
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate limit')) {
      const isDailyQuota = error.message?.includes('Daily') || error.message?.includes('PerDay');
      
      if (isDailyQuota) {
        return res.status(429).json({ 
          message: 'Daily API quota exceeded (20 requests/day on free tier). Please try again tomorrow or upgrade your API plan.',
          error: 'DAILY_QUOTA_EXCEEDED',
          retryAfter: 86400 // 24 hours
        });
      }
      
      return res.status(429).json({ 
        message: 'API rate limit exceeded. The system will automatically retry. Please wait...',
        error: 'RATE_LIMIT',
        retryAfter: 60
      });
    }
    
    res.status(500).json({ message: error.message });
  }
};

export const getAssessment = async (req, res) => {
  try {
    const { jobId } = req.params;

    // For candidates, enforce resume screening before accessing assessment
    if (req.user.role === 'candidate') {
      const resume = await Resume.findOne({
        candidateId: req.user._id,
        jobId,
      });

      if (!resume) {
        return res.status(403).json({
          message: 'You must upload and get your resume screened before accessing the assessment.',
          requiresResume: true,
        });
      }

      if (resume.screeningResult?.status === 'pending') {
        return res.status(403).json({
          message: 'Your resume is still being screened. Please wait for approval.',
          requiresResume: true,
        });
      }

      if (resume.screeningResult?.status === 'rejected') {
        return res.status(403).json({
          message: 'Your application was rejected based on resume screening.',
          rejectionReason: resume.screeningResult.rejectionReason,
          requiresResume: true,
        });
      }
    }

    const assessment = await Assessment.findOne({ jobId });

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // For candidates, don't send correct answers
    if (req.user.role === 'candidate') {
      const questionsWithoutAnswers = assessment.questions.map((q) => {
        const question = { ...q.toObject() };
        if (question.type === 'objective') {
          delete question.correctAnswer;
        }
        if (question.type === 'coding') {
          // Don't send expected outputs for coding questions
          question.testCases = question.testCases.map((tc) => ({
            input: tc.input,
            points: tc.points,
          }));
        }
        return question;
      });

      return res.json({
        assessment: {
          ...assessment.toObject(),
          questions: questionsWithoutAnswers,
        },
      });
    }

    res.json({ assessment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
