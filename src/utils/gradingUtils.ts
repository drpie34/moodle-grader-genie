
/**
 * Utilities for grading student submissions using OpenAI
 */

// src/utils/gradingUtils.ts
export async function gradeWithOpenAI(submissionText: string, assignmentData: any, apiKey: string, gradingScale: number = 100): Promise<{ grade: number; feedback: string }> {
  try {
    if (!submissionText || submissionText.trim().length === 0) {
      console.warn("Empty submission text detected - unable to grade properly");
      return { 
        grade: 0, 
        feedback: "Unable to grade: The submission appears to be empty or could not be processed. Please review the original submission file manually." 
      };
    }

    // Trim submission text to a reasonable length to reduce token usage
    // Most student submissions don't need more than 10,000 characters for effective grading
    const MAX_SUBMISSION_LENGTH = 10000;
    const trimmedSubmission = submissionText.length > MAX_SUBMISSION_LENGTH 
      ? submissionText.substring(0, MAX_SUBMISSION_LENGTH) + "... [submission truncated to reduce API costs]" 
      : submissionText;
    
    // Log the first 100 chars of submission to verify content (for debugging)
    console.log(`Grading submission content preview: "${trimmedSubmission.substring(0, 100)}..."`);
    console.log(`Submission length: ${trimmedSubmission.length} chars (original: ${submissionText.length} chars)`);
    
    const prompt = constructPrompt(trimmedSubmission, assignmentData);
    
    // Use gpt-3.5-turbo by default unless assignment complexity requires gpt-4
    const modelToUse = shouldUseAdvancedModel(assignmentData) ? "gpt-4" : "gpt-3.5-turbo";
    console.log(`Using OpenAI model: ${modelToUse} for grading`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract grade and feedback from the response
    const { grade, feedback } = extractGradeAndFeedback(content, gradingScale);
    
    // Validate the grade to ensure it's within proper range
    const validatedGrade = Math.min(Math.max(0, grade), gradingScale);
    
    return { grade: validatedGrade, feedback };
  } catch (error) {
    console.error("Error in gradeWithOpenAI:", error);
    return { grade: 0, feedback: "Failed to grade submission. Error: " + (error instanceof Error ? error.message : "Unknown error") };
  }
}

/**
 * Determines if the advanced GPT-4 model should be used based on assignment complexity
 */
function shouldUseAdvancedModel(assignmentData: any): boolean {
  const { gradingStrictness, academicLevel, additionalInstructions, rubric } = assignmentData;
  
  // Use advanced model for graduate level or very complex assignments
  if (academicLevel && academicLevel.toLowerCase().includes('graduate')) {
    return true;
  }
  
  // Use advanced model for very strict grading
  if (gradingStrictness && gradingStrictness > 8) {
    return true;
  }
  
  // Use advanced model if there's a complex rubric
  if (rubric && rubric.length > 500) {
    return true;
  }
  
  // Default to the cheaper model
  return false;
}

function constructPrompt(submissionText: string, assignmentData: any): string {
  const { assignmentName, courseName, assignmentInstructions, rubric, academicLevel, gradingScale, gradingStrictness, feedbackLength, feedbackFormality, instructorTone, additionalInstructions } = assignmentData;
  
  let prompt = `You are an AI grading assistant for ${courseName} at the ${academicLevel} level. \
  Your task is to grade student submissions for the assignment "${assignmentName}" out of ${gradingScale} points. \
  Follow these instructions: ${assignmentInstructions}. `;
  
  if (rubric) {
    prompt += `Use this rubric to guide your grading: ${rubric}. `;
  }
  
  prompt += `Be ${gradingStrictness <= 3 ? "lenient" : gradingStrictness <= 7 ? "moderately strict" : "very strict"} in your grading. \
  Provide feedback that is ${feedbackLength <= 3 ? "concise" : feedbackLength <= 7 ? "moderately detailed" : "very detailed"}. \
  The tone of your feedback should be ${feedbackFormality <= 3 ? "casual" : feedbackFormality <= 7 ? "moderately formal" : "very formal"}. `;
  
  if (instructorTone) {
    prompt += `Adopt this tone as if you were the instructor: ${instructorTone}. `;
  }
  
  if (additionalInstructions) {
    prompt += `Adhere to these additional instructions: ${additionalInstructions}. `;
  }
  
  prompt += `Now, grade the following submission:\n\n${submissionText}\n\nProvide your response in this format:\nGrade: [numeric grade out of ${gradingScale}]\nFeedback: [your detailed feedback]\n\n`;
  
  return prompt;
}

function extractGradeAndFeedback(content: string, gradingScale: number): { grade: number; feedback: string } {
  // First, try to extract the grade using the structured format we requested
  const gradeMatch = content.match(/Grade:\s*(\d+(\.\d+)?)/i);
  
  let grade = 0;
  let feedback = content;
  
  if (gradeMatch) {
    // If the grade is in the format "Grade: X", use X
    grade = parseFloat(gradeMatch[1]);
    
    // Remove the grade line from the feedback
    feedback = content.replace(/Grade:\s*\d+(\.\d+)?/i, '').trim();
    
    // If there's a "Feedback:" label, remove it
    feedback = feedback.replace(/^Feedback:\s*/i, '').trim();
  } else {
    // Fallback to older extraction patterns
    const fallbackGradeMatch = content.match(/(\d+(\.\d+)?)\s*\/\s*(\d+)/);
    
    if (fallbackGradeMatch) {
      // If the grade is in the format "X / Y", use X
      grade = parseFloat(fallbackGradeMatch[1]);
    } else {
      // If the grade is a single number, use that
      const singleGradeMatch = content.match(/^(\d+(\.\d+)?)/);
      if (singleGradeMatch) {
        grade = parseFloat(singleGradeMatch[1]);
      }
    }
    
    // Normalize the grade to be out of the gradingScale
    if (grade > gradingScale) {
      grade = (grade / 100) * gradingScale;
    }
    
    // Extract feedback by removing the grade from the content
    feedback = content.replace(/(\d+(\.\d+)?\s*\/\s*\d+)|(\d+(\.\d+)?)/, '').trim();
  }
  
  // Ensure grade is within proper range
  grade = Math.min(Math.max(0, grade), gradingScale);
  
  return { grade, feedback };
}
