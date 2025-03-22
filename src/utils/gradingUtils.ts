/**
 * Utilities for grading student submissions using OpenAI
 */

// src/utils/gradingUtils.ts
export async function gradeWithOpenAI(submissionText: string, assignmentData: any, apiKey: string, gradingScale: number = 100): Promise<{ grade: number; feedback: string }> {
  try {
    const prompt = constructPrompt(submissionText, assignmentData);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
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
    
    return { grade, feedback };
  } catch (error) {
    console.error("Error in gradeWithOpenAI:", error);
    return { grade: 0, feedback: "Failed to grade submission." };
  }
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
  
  prompt += `Now, grade the following submission:\n${submissionText}\n\nRespond with the grade (out of ${gradingScale}) followed by feedback.\n\n`;
  
  return prompt;
}

function extractGradeAndFeedback(content: string, gradingScale: number): { grade: number; feedback: string } {
  // Use a more robust regex to find the grade
  const gradeMatch = content.match(/(\d+(\.\d+)?)\s*\/\s*(\d+)/);
  let grade = 0;
  
  if (gradeMatch) {
    // If the grade is in the format "X / Y", use X
    grade = parseFloat(gradeMatch[1]);
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
  let feedback = content.replace(/(\d+(\.\d+)?\s*\/\s*\d+)|(\d+(\.\d+)?)/, '').trim();
  
  return { grade, feedback };
}
