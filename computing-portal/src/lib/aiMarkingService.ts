import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';

export interface QuestionData {
  id: string;
  question: string;
  type: string;
  marks: number;
  markingScheme?: string;
  modelAnswer?: string;
  topic?: string;
}

export interface DraftFeedbackResult {
  overallFeedback: string;
  overallStrengths: string[];
  overallImprovements: string[];
  questionFeedback: {
    questionId: string;
    questionNumber: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    marksPossible: number;
    canBeImproved: boolean;
    suggestedApproach?: string;
    topic?: string;
  }[];
}

export interface FinalMarkingResult {
  overallFeedback: string;
  overallStrengths: string[];
  overallImprovements: string[];
  questionFeedback: {
    questionId: string;
    questionNumber: number;
    studentAnswer?: string;
    feedback: string;
    strengths: string[];
    improvements: string[];
    marksAwarded: number;
    marksPossible: number;
    isCorrect: boolean;
    canBeImproved: boolean;
    suggestedAnswer?: string;
    topic?: string;
  }[];
  totalMarksAwarded: number;
  totalMarksPossible: number;
  percentage: number;
  grade: string;
  topicScores: Record<string, { awarded: number; possible: number; percentage: number }>;
}

/**
 * Generate draft feedback for a student's work (first-level feedback without marks)
 */
export async function generateDraftFeedback(
  assignmentTitle: string,
  subject: string,
  topic: string,
  questions: QuestionData[],
  submissionText: string,
  studentAbilityLevel?: string
): Promise<DraftFeedbackResult> {
  const questionsFormatted = questions.map((q, idx) => 
    `Question ${idx + 1} (${q.marks} marks, Topic: ${q.topic || topic}): ${q.question}`
  ).join('\n\n');

  const abilityContext = studentAbilityLevel ? `
The student is currently performing at "${studentAbilityLevel}" level. Adjust your feedback accordingly:
- For "below_grade": Be very encouraging, break down concepts simply, provide more scaffolding
- For "at_grade": Provide balanced feedback with clear next steps
- For "above_grade": Challenge them with deeper questions, suggest extensions` : '';

  const prompt = `You are an experienced ${subject} teacher providing encouraging first-level feedback on a student's draft work. Your goal is to help them improve before final submission.

**Assignment**: ${assignmentTitle}
**Subject**: ${subject}
**Topic**: ${topic}
${abilityContext}

**Questions**:
${questionsFormatted}

**Student's Submission**:
${submissionText}

Provide constructive, encouraging feedback that:
1. Acknowledges what the student has done well
2. Identifies areas that could be improved
3. Gives specific suggestions without giving away answers
4. Motivates them to revise and improve

Return your response as JSON in this exact format:
{
  "overallFeedback": "A 2-3 sentence encouraging summary of their work",
  "overallStrengths": ["strength1", "strength2"],
  "overallImprovements": ["improvement1", "improvement2"],
  "questionFeedback": [
    {
      "questionId": "q1_id",
      "questionNumber": 1,
      "feedback": "Specific feedback for this question",
      "strengths": ["what they did well"],
      "improvements": ["what could be better"],
      "marksPossible": 10,
      "canBeImproved": true,
      "suggestedApproach": "Hint or approach without giving answer",
      "topic": "topic name"
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(block => block.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text : '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const result = JSON.parse(jsonMatch[0]) as DraftFeedbackResult;
    
    // Ensure all questions have feedback
    result.questionFeedback = questions.map((q, idx) => {
      const existing = result.questionFeedback.find(qf => qf.questionNumber === idx + 1);
      return {
        questionId: q.id,
        questionNumber: idx + 1,
        feedback: existing?.feedback || 'Please review this question.',
        strengths: existing?.strengths || [],
        improvements: existing?.improvements || ['Consider reviewing the question requirements'],
        marksPossible: q.marks,
        canBeImproved: existing?.canBeImproved ?? true,
        suggestedApproach: existing?.suggestedApproach,
        topic: q.topic || topic,
      };
    });

    return result;
  } catch (error: any) {
    console.error('AI Draft Feedback error:', error);
    throw new Error(`Failed to generate draft feedback: ${error.message}`);
  }
}

/**
 * Mark and grade a final submission
 */
export async function markFinalSubmission(
  assignmentTitle: string,
  subject: string,
  topic: string,
  questions: QuestionData[],
  submissionText: string,
  totalMarks: number
): Promise<FinalMarkingResult> {
  const questionsFormatted = questions.map((q, idx) => 
    `Question ${idx + 1} (${q.marks} marks, Topic: ${q.topic || topic}):
Question: ${q.question}
${q.markingScheme ? `Marking Scheme: ${q.markingScheme}` : ''}
${q.modelAnswer ? `Model Answer: ${q.modelAnswer}` : ''}`
  ).join('\n\n---\n\n');

  const prompt = `You are an experienced ${subject} teacher marking a student's final submission. Be fair, thorough, and provide constructive feedback.

**Assignment**: ${assignmentTitle}
**Subject**: ${subject}
**Topic**: ${topic}
**Total Marks**: ${totalMarks}

**Questions with Marking Schemes**:
${questionsFormatted}

**Student's Submission**:
${submissionText}

Mark each question according to the marking scheme. For each question:
1. Identify the student's answer
2. Award marks based on the marking scheme
3. Provide specific feedback
4. Note what was done well and what could improve

Return your response as JSON in this exact format:
{
  "overallFeedback": "Summary of performance",
  "overallStrengths": ["strength1", "strength2"],
  "overallImprovements": ["improvement1", "improvement2"],
  "questionFeedback": [
    {
      "questionId": "q1_id",
      "questionNumber": 1,
      "studentAnswer": "What the student wrote",
      "feedback": "Detailed feedback",
      "strengths": ["what was correct"],
      "improvements": ["what was missing or incorrect"],
      "marksAwarded": 7,
      "marksPossible": 10,
      "isCorrect": false,
      "canBeImproved": true,
      "suggestedAnswer": "The correct/better answer",
      "topic": "topic name"
    }
  ],
  "totalMarksAwarded": 75,
  "totalMarksPossible": ${totalMarks},
  "percentage": 75.0,
  "grade": "B3",
  "topicScores": {
    "Topic Name": {"awarded": 20, "possible": 25, "percentage": 80}
  }
}

Use this grading scale:
A1: 90-100%, A2: 80-89%, B3: 75-79%, B4: 70-74%, C5: 65-69%, C6: 60-64%, D7: 55-59%, E8: 50-54%, F9: <50%`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for consistency
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(block => block.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text : '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const result = JSON.parse(jsonMatch[0]) as FinalMarkingResult;

    // Validate and ensure all fields
    result.questionFeedback = questions.map((q, idx) => {
      const existing = result.questionFeedback.find(qf => qf.questionNumber === idx + 1);
      return {
        questionId: q.id,
        questionNumber: idx + 1,
        studentAnswer: existing?.studentAnswer,
        feedback: existing?.feedback || 'Unable to assess this question.',
        strengths: existing?.strengths || [],
        improvements: existing?.improvements || [],
        marksAwarded: existing?.marksAwarded ?? 0,
        marksPossible: q.marks,
        isCorrect: existing?.isCorrect ?? false,
        canBeImproved: existing?.canBeImproved ?? true,
        suggestedAnswer: existing?.suggestedAnswer,
        topic: q.topic || topic,
      };
    });

    // Recalculate totals for accuracy
    const totalAwarded = result.questionFeedback.reduce((sum, qf) => sum + qf.marksAwarded, 0);
    result.totalMarksAwarded = totalAwarded;
    result.totalMarksPossible = totalMarks;
    result.percentage = Math.round((totalAwarded / totalMarks) * 100 * 10) / 10;
    result.grade = calculateGradeFromPercentage(result.percentage);

    return result;
  } catch (error: any) {
    console.error('AI Final Marking error:', error);
    throw new Error(`Failed to mark submission: ${error.message}`);
  }
}

/**
 * Generate differentiated questions for a student based on their ability level
 */
export async function generateDifferentiatedQuestions(
  subject: string,
  topic: string,
  learningOutcomes: string[],
  abilityLevel: 'below_grade' | 'at_grade' | 'above_grade',
  numQuestions: number,
  performanceHistory?: { weakTopics?: string[]; strongTopics?: string[] }
): Promise<QuestionData[]> {
  const abilityInstructions = {
    below_grade: `Generate questions for a student performing BELOW grade level:
- Use simpler vocabulary and clearer sentence structures
- Break complex problems into smaller, guided steps with scaffolding
- Include hints and worked examples
- Focus on foundational concepts
- Target difficulty: Easy to Medium`,
    at_grade: `Generate questions for a student performing AT grade level:
- Use grade-appropriate vocabulary and complexity
- Mix of knowledge recall, understanding, and application
- Standard cognitive demand
- Some scaffolding but encourage independence
- Target difficulty: Medium`,
    above_grade: `Generate questions for a student performing ABOVE grade level:
- Use advanced vocabulary and complex sentence structures
- Focus on higher-order thinking (analysis, synthesis, evaluation)
- Include extension questions and real-world applications
- Minimal scaffolding - encourage independent problem-solving
- Target difficulty: Medium to Hard`,
  };

  const performanceContext = performanceHistory ? `
Student Performance Context:
${performanceHistory.weakTopics?.length ? `- Weak topics (need support): ${performanceHistory.weakTopics.join(', ')}` : ''}
${performanceHistory.strongTopics?.length ? `- Strong topics (can handle challenges): ${performanceHistory.strongTopics.join(', ')}` : ''}` : '';

  const prompt = `You are an expert ${subject} teacher creating personalized assessment questions.

**Subject**: ${subject}
**Topic**: ${topic}
**Learning Outcomes**:
${learningOutcomes.map((lo, i) => `${i + 1}. ${lo}`).join('\n')}

${abilityInstructions[abilityLevel]}
${performanceContext}

Generate ${numQuestions} questions with marking schemes.

Return your response as JSON array:
[
  {
    "id": "q1",
    "question": "The full question text",
    "type": "short_answer",
    "marks": 5,
    "markingScheme": "Award 1 mark for X, 2 marks for Y...",
    "modelAnswer": "The expected correct answer",
    "topic": "${topic}",
    "difficulty": "medium"
  }
]

Question types should be: "mcq", "short_answer", "long_answer", or "calculation"
Difficulty should be: "easy", "medium", or "hard"`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(block => block.type === 'text');
    const responseText = textContent?.type === 'text' ? textContent.text : '';

    // Parse JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON array');
    }

    const questions = JSON.parse(jsonMatch[0]) as QuestionData[];
    
    // Ensure all questions have required fields
    return questions.map((q, idx) => ({
      id: q.id || `q${idx + 1}`,
      question: q.question,
      type: q.type || 'short_answer',
      marks: q.marks || 5,
      markingScheme: q.markingScheme,
      modelAnswer: q.modelAnswer,
      topic: q.topic || topic,
      difficulty: q.difficulty,
    }));
  } catch (error: any) {
    console.error('AI Question Generation error:', error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
}

function calculateGradeFromPercentage(percentage: number): string {
  if (percentage >= 90) return 'A1';
  if (percentage >= 80) return 'A2';
  if (percentage >= 75) return 'B3';
  if (percentage >= 70) return 'B4';
  if (percentage >= 65) return 'C5';
  if (percentage >= 60) return 'C6';
  if (percentage >= 55) return 'D7';
  if (percentage >= 50) return 'E8';
  return 'F9';
}
