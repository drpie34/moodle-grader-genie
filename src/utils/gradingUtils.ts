
/**
 * Utility functions for grading assignments with OpenAI
 */

/**
 * Send data to OpenAI for grading
 */
export async function gradeWithOpenAI(
  text: string, 
  assignmentData: any, 
  apiKey: string
): Promise<{ grade: number; feedback: string }> {
  try {
    // Prepare the prompt with feedback style instructions based on user preferences
    const lengthGuidance = getLengthGuidance(assignmentData.feedbackLength || 5);
    const formalityGuidance = getFormalityGuidance(assignmentData.feedbackFormality || 5);
    const toneGuidance = assignmentData.instructorTone 
      ? `Match this tone in your feedback: "${assignmentData.instructorTone}"`
      : "";
    const additionalInstructions = assignmentData.additionalInstructions
      ? `Additional instructions: ${assignmentData.additionalInstructions}`
      : "";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that grades student assignments. 
                      The assignment is for ${assignmentData.courseName}, 
                      titled "${assignmentData.assignmentName}". 
                      The academic level is ${assignmentData.academicLevel}. 
                      Use a ${assignmentData.gradingScale}-point scale with 
                      ${assignmentData.gradingStrictness}/10 strictness. 
                      
                      Feedback style instructions:
                      - ${lengthGuidance}
                      - ${formalityGuidance}
                      ${toneGuidance ? `- ${toneGuidance}` : ''}
                      ${additionalInstructions ? `- ${additionalInstructions}` : ''}
                      
                      Assignment instructions: ${assignmentData.assignmentInstructions}
                      
                      Rubric: ${assignmentData.rubric || 'No specific rubric provided.'}`
          },
          {
            role: 'user',
            content: `Here is the student's submission: \n\n${text}\n\nPlease grade this submission and provide feedback. Return your response in JSON format with two fields: "grade" (a number) and "feedback" (a string with your comments).`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse the JSON response
    try {
      // The model should return JSON, but it might include markdown formatting
      // Let's try to extract just the JSON part
      const jsonMatch = content.match(/```json\n([\s\S]*)\n```/) || 
                        content.match(/```\n([\s\S]*)\n```/) || 
                        content.match(/{[\s\S]*}/);
      
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      const result = JSON.parse(jsonString);
      
      return {
        grade: Number(result.grade),
        feedback: result.feedback
      };
    } catch (e) {
      // If parsing fails, extract grade and feedback manually
      const gradeMatch = content.match(/grade["\s:]+(\d+)/i);
      const grade = gradeMatch ? parseInt(gradeMatch[1], 10) : 0;
      
      // Remove any JSON-like formatting and just use the content as feedback
      const feedback = content.replace(/{|}|"grade":|"feedback":|"/g, '');
      
      return { grade, feedback };
    }
  } catch (error) {
    console.error('Error grading with OpenAI:', error);
    return {
      grade: 0,
      feedback: `Error grading assignment: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get length guidance based on user preference
 */
export function getLengthGuidance(lengthPreference: number): string {
  if (lengthPreference <= 3) {
    return "Keep feedback very concise and focused on the most important points (2-3 sentences)";
  } else if (lengthPreference <= 7) {
    return "Provide moderately detailed feedback with specific examples (1-2 paragraphs)";
  } else {
    return "Give comprehensive, detailed feedback covering multiple aspects of the work (several paragraphs)";
  }
}

/**
 * Get formality guidance based on user preference
 */
export function getFormalityGuidance(formalityPreference: number): string {
  if (formalityPreference <= 3) {
    return "Use casual, conversational language with contractions and first-person address";
  } else if (formalityPreference <= 7) {
    return "Use a balanced, semi-formal tone that is professional but approachable";
  } else {
    return "Use formal academic language, avoiding contractions and colloquialisms";
  }
}
