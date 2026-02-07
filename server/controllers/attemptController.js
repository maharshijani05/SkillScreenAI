import Attempt from '../models/Attempt.js';
import Assessment from '../models/Assessment.js';
import Resume from '../models/Resume.js';
import {
  evaluateObjective,
  evaluateSubjective,
  evaluateCodingWithAI,
} from '../services/evaluationService.js';
import { detectFraud } from '../services/fraudDetection.js';
import { generateRankings } from '../services/rankingService.js';

export const startAttempt = async (req, res) => {
  try {
    const { jobId, assessmentId } = req.body;

    // Check if resume is uploaded and approved
    const resume = await Resume.findOne({
      candidateId: req.user._id,
      jobId,
    });

    if (!resume) {
      return res.status(400).json({
        message: 'Resume not uploaded. Please upload your resume before taking the assessment.',
        requiresResume: true,
      });
    }

    if (resume.screeningResult.status === 'pending') {
      return res.status(400).json({
        message: 'Resume is still being screened. Please wait for approval.',
        requiresResume: true,
      });
    }

    if (resume.screeningResult.status === 'rejected') {
      return res.status(403).json({
        message: 'Your application has been rejected based on resume screening.',
        rejectionReason: resume.screeningResult.rejectionReason,
        requiresResume: true,
      });
    }

    // Check if assessment exists
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Check if already attempted
    const existingAttempt = await Attempt.findOne({
      candidateId: req.user._id,
      jobId,
      submittedAt: { $exists: false },
    });

    if (existingAttempt) {
      return res.json({
        message: 'Attempt already in progress',
        attempt: existingAttempt,
      });
    }

    const attempt = await Attempt.create({
      candidateId: req.user._id,
      jobId,
      assessmentId,
      startedAt: new Date(),
      answers: [],
    });

    res.status(201).json({
      message: 'Attempt started',
      attempt,
      duration: assessment.duration,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitAttempt = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;

    const attempt = await Attempt.findById(attemptId)
      .populate('assessmentId')
      .populate('jobId');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.candidateId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({ message: 'Attempt already submitted' });
    }

    const assessment = attempt.assessmentId;
    const questions = assessment.questions;

    // Calculate max possible scores for each section
    const maxScores = {
      objective: 0,
      subjective: 0,
      coding: 0,
    };

    questions.forEach((q) => {
      if (q.type === 'objective') maxScores.objective += q.points;
      else if (q.type === 'subjective') maxScores.subjective += q.points;
      else if (q.type === 'coding') maxScores.coding += q.points;
    });

    // Evaluate answers
    const evaluatedAnswers = [];
    let totalScore = 0;
    const sectionScores = {
      objective: 0,
      subjective: 0,
      coding: 0,
    };

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = answers[i]?.answer || '';

      let evaluation = {
        questionId: question._id,
        answer: userAnswer,
        isCorrect: false,
        score: 0,
        feedback: '',
      };

      if (question.type === 'objective') {
        const isCorrect = evaluateObjective(userAnswer, question.correctAnswer);
        evaluation.isCorrect = isCorrect;
        evaluation.score = isCorrect ? question.points : 0;
        evaluation.feedback = isCorrect
          ? 'Correct answer'
          : 'Incorrect answer';
        sectionScores.objective += evaluation.score;
      } else if (question.type === 'subjective') {
        const result = await evaluateSubjective(
          question.question,
          userAnswer,
          question.keyPoints || []
        );
        evaluation.score = (result.score / 100) * question.points;
        evaluation.feedback = result.feedback;
        sectionScores.subjective += evaluation.score;
      } else if (question.type === 'coding') {
        const result = await evaluateCodingWithAI(
          question.question,
          userAnswer,
          question.testCases,
          question.constraints
        );
        evaluation.score = (result.score / 100) * question.points;
        evaluation.feedback = result.feedback;
        sectionScores.coding += evaluation.score;
      }

      totalScore += evaluation.score;
      evaluatedAnswers.push(evaluation);
    }

    // Convert section scores to percentages
    if (maxScores.objective > 0) {
      sectionScores.objective = (sectionScores.objective / maxScores.objective) * 100;
    }
    if (maxScores.subjective > 0) {
      sectionScores.subjective = (sectionScores.subjective / maxScores.subjective) * 100;
    }
    if (maxScores.coding > 0) {
      sectionScores.coding = (sectionScores.coding / maxScores.coding) * 100;
    }

    // Calculate time spent
    const timeSpent = Math.floor(
      (new Date() - attempt.startedAt) / 1000
    );

    // Detect fraud
    const flags = await detectFraud(
      {
        ...attempt.toObject(),
        answers: evaluatedAnswers,
        submittedAt: new Date(),
        timeSpent,
      },
      req.user._id
    );

    // Update attempt - use findByIdAndUpdate to avoid version conflicts
    await Attempt.findByIdAndUpdate(
      attempt._id,
      {
        answers: evaluatedAnswers,
        submittedAt: new Date(),
        score: totalScore,
        sectionScores: sectionScores,
        flags: flags,
        timeSpent: timeSpent,
      },
      { new: true }
    );

    // Generate rankings
    await generateRankings(attempt.jobId._id);

    res.json({
      message: 'Attempt submitted successfully',
      attempt,
    });
  } catch (error) {
    console.error('Submit attempt error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAttempts = async (req, res) => {
  try {
    const { jobId } = req.query;

    const query = {};
    if (req.user.role === 'candidate') {
      query.candidateId = req.user._id;
    }
    if (jobId) {
      query.jobId = jobId;
    }

    const attempts = await Attempt.find(query)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title')
      .sort({ submittedAt: -1 });

    res.json({ attempts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
