import AIService from './aiService.js';

export const evaluateObjective = (userAnswer, correctAnswer) => {
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
};

export const evaluateCoding = (userCode, testCases) => {
  // This is a simplified evaluation - in production, you'd run code in a sandbox
  // For now, we'll use AI to evaluate the code logic
  const results = testCases.map((testCase) => {
    // Basic evaluation - check if code contains expected output logic
    // In production, execute code in sandbox
    return {
      passed: false, // Placeholder - would need code execution
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      points: testCase.points,
    };
  });

  return results;
};

export const evaluateSubjective = async (question, userAnswer, keyPoints) => {
  const prompt = `Evaluate the following answer to a subjective question.

Question: ${question}

Expected Key Points:
${keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

Candidate's Answer:
${userAnswer}

Evaluate the answer based on:
1. Correctness - how accurate is the answer?
2. Clarity - how well is it explained?
3. Relevance - how relevant is it to the question?
4. Completeness - how many key points are covered?

Return a JSON object with:
{
  "score": number (0-100 as percentage),
  "feedback": "detailed feedback string",
  "coveredPoints": ["list of key points covered"]
}

Be strict but fair in evaluation.`;

  try {
    const evaluation = await AIService.generateJSON(prompt);
    return {
      score: evaluation.score || 0,
      feedback: evaluation.feedback || 'No feedback provided',
      coveredPoints: evaluation.coveredPoints || [],
    };
  } catch (error) {
    console.error('Subjective evaluation error:', error);
    return {
      score: 0,
      feedback: 'Evaluation failed',
      coveredPoints: [],
    };
  }
};

export const evaluateCodingWithAI = async (question, userCode, testCases, constraints) => {
  const prompt = `Evaluate the following coding solution.

Problem Statement: ${question}
Constraints: ${constraints}

Test Cases:
${testCases.map((tc, i) => `Test ${i + 1}:\nInput: ${tc.input}\nExpected Output: ${tc.expectedOutput}`).join('\n\n')}

Candidate's Code:
\`\`\`
${userCode}
\`\`\`

Evaluate the code for:
1. Correctness - does it solve the problem?
2. Test case passing - how many test cases would pass?
3. Code quality - readability, efficiency
4. Constraint adherence

Return JSON:
{
  "score": number (0-100),
  "feedback": "detailed feedback",
  "testResults": [
    {
      "testCase": 1,
      "passed": boolean,
      "reason": "string"
    }
  ],
  "totalPassed": number
}`;

  try {
    const evaluation = await AIService.generateJSON(prompt);
    return {
      score: evaluation.score || 0,
      feedback: evaluation.feedback || 'No feedback',
      testResults: evaluation.testResults || [],
      totalPassed: evaluation.totalPassed || 0,
    };
  } catch (error) {
    console.error('Coding evaluation error:', error);
    return {
      score: 0,
      feedback: 'Evaluation failed',
      testResults: [],
      totalPassed: 0,
    };
  }
};
