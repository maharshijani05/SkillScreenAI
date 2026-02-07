import AIService from './aiService.js';

const generateAssessment = async (parsedJD, config) => {
  const { objectiveCount = 5, subjectiveCount = 3, codingCount = 2 } = config;

  const prompt = `Generate a comprehensive assessment for a job position with the following details:

Technical Skills: ${parsedJD.skills?.join(', ') || 'Not specified'}
Experience Level: ${parsedJD.experience || 'Not specified'}
Tools: ${parsedJD.tools?.join(', ') || 'Not specified'}

Generate exactly ${objectiveCount} objective (MCQ) questions, ${subjectiveCount} subjective questions, and ${codingCount} coding questions.

For each question type:
- Objective: Provide question, 4 options (a, b, c, d), and correct answer
- Subjective: Provide question and expected key points
- Coding: Provide problem statement, constraints, and 3 test cases with inputs and expected outputs

Return a JSON object with this structure:
{
  "objective": [
    {
      "question": "string",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "option1",
      "points": 1
    }
  ],
  "subjective": [
    {
      "question": "string",
      "keyPoints": ["point1", "point2"],
      "points": 5
    }
  ],
  "coding": [
    {
      "question": "string",
      "constraints": "string",
      "testCases": [
        {
          "input": "string",
          "expectedOutput": "string",
          "points": 2
        }
      ],
      "points": 10
    }
  ]
}`;

  const schema = {
    objective: [
      {
        question: 'string',
        options: ['string'],
        correctAnswer: 'string',
        points: 'number',
      },
    ],
    subjective: [
      {
        question: 'string',
        keyPoints: ['string'],
        points: 'number',
      },
    ],
    coding: [
      {
        question: 'string',
        constraints: 'string',
        testCases: [
          {
            input: 'string',
            expectedOutput: 'string',
            points: 'number',
          },
        ],
        points: 'number',
      },
    ],
  };

  try {
    const assessment = await AIService.generateJSON(prompt, schema);
    return assessment;
  } catch (error) {
    throw new Error(`Failed to generate assessment: ${error.message}`);
  }
};

export default generateAssessment;
