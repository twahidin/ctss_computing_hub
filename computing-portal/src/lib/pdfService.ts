// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require('pdf-parse');

export interface ExtractedPDFData {
  text: string;
  numPages: number;
  info?: Record<string, any>;
}

/**
 * Extract text content from a PDF buffer
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<ExtractedPDFData> {
  try {
    const data = await pdf(pdfBuffer);
    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info,
    };
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Parse submission text to identify answers by question
 */
export function parseSubmissionData(
  extractedText: string,
  questions: { id: string; question: string }[]
): Record<string, string> {
  const answers: Record<string, string> = {};
  
  // Simple parsing - look for question numbers or patterns
  // This is a basic implementation; can be enhanced with AI
  const lines = extractedText.split('\n').filter(line => line.trim());
  
  let currentQuestionId: string | null = null;
  let currentAnswer: string[] = [];
  
  for (const line of lines) {
    // Check if this line starts a new question
    const questionMatch = line.match(/^(?:Q|Question|Qn?)[\s.:]?(\d+)/i);
    
    if (questionMatch) {
      // Save previous answer if exists
      if (currentQuestionId && currentAnswer.length > 0) {
        answers[currentQuestionId] = currentAnswer.join('\n').trim();
      }
      
      const qNum = parseInt(questionMatch[1], 10);
      if (qNum > 0 && qNum <= questions.length) {
        currentQuestionId = questions[qNum - 1].id;
        currentAnswer = [];
        // Check if answer is on same line
        const answerPart = line.substring(questionMatch[0].length).trim();
        if (answerPart) {
          currentAnswer.push(answerPart);
        }
      }
    } else if (currentQuestionId) {
      // Continue collecting answer text
      currentAnswer.push(line);
    }
  }
  
  // Save last answer
  if (currentQuestionId && currentAnswer.length > 0) {
    answers[currentQuestionId] = currentAnswer.join('\n').trim();
  }
  
  // If no structured answers found, store full text under 'raw'
  if (Object.keys(answers).length === 0) {
    answers['raw'] = extractedText;
  }
  
  return answers;
}

/**
 * Calculate grade from percentage
 */
export function calculateGrade(percentage: number): string {
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
