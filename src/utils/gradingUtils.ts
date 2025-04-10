
/**
 * Utilities for grading student submissions using OpenAI
 */

// src/utils/gradingUtils.ts
import { supabase } from "@/integrations/supabase/client";
export async function gradeWithOpenAI(submissionText: string, assignmentData: any, apiKey: string = "", gradingScale: number = 100): Promise<{ grade: number; feedback: string }> {
  try {
    if (!submissionText || submissionText.trim().length === 0) {
      console.warn("Empty submission text detected - unable to grade properly");
      return { 
        grade: 0, 
        feedback: "Unable to grade: The submission appears to be empty or could not be processed. Please review the original submission file manually." 
      };
    }
    
    // Log submission details for debugging
    console.log(`Grading submission content length: ${submissionText.length} chars`);
    console.log(`Submission preview: "${submissionText.substring(0, 100)}..."`);
    
    // Safety check for very large submissions
    if (submissionText.length > 15000) {
      console.warn(`Large submission detected (${submissionText.length} chars), truncating to avoid token limits`);
      submissionText = submissionText.substring(0, 15000) + "\n\n[Content truncated due to length]";
    }
    
    const prompt = constructPrompt(submissionText, assignmentData);
    
    // Save the prompt to localStorage for later inspection
    saveGradingPrompt(prompt, submissionText.substring(0, 200));
    
    // Always use GPT-4 for grading
    const modelToUse = "gpt-4o-mini";
    console.log(`Using OpenAI model: ${modelToUse} for grading`);
    
    // Implement retry logic with exponential backoff
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: Error | null = null;
    
    // Get the Supabase URL from client
    // The URL is directly available in the client configuration
    const supabaseUrl = "https://owaqnztggyxahjhbcylj.supabase.co";
    console.log("Using Supabase URL for edge function:", supabaseUrl);
    
    while (retryCount < maxRetries) {
      try {
        // Check if we're in local development
        const isLocalDevelopment = window.location.hostname === 'localhost';
        let response;
        
        if (isLocalDevelopment) {
          // In local development, bypass the Supabase Edge Function and use OpenAI directly if apiKey is provided
          if (apiKey) {
            console.log("Local development: Using OpenAI API directly");
            response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          } else {
            // If no API key for local development, provide simulated response
            console.log("Local development: Using simulated grading response");
            
            // Calculate a reasonable grade based on content length
            const contentLength = submissionText.length;
            const simulatedGrade = Math.min(95, Math.max(60, Math.round(75 + contentLength / 1000)));
            
            // Create a simulated response that looks like it came from the API
            const simulatedResponse = {
              status: 200,
              json: async () => ({
                choices: [{
                  message: {
                    content: `Grade: ${simulatedGrade}\n\nFeedback: This is simulated feedback for local development testing. The submission shows good understanding of the material and addresses the key points of the assignment. Some areas could be developed further with more specific examples and deeper analysis.`
                  }
                }]
              })
            };
            
            response = simulatedResponse as Response;
            console.log("Simulated response created for local development");
          }
        } else {
          // In production, use the Supabase Edge Function
          try {
            console.log("Production: Calling Supabase edge function for OpenAI proxy");
            // Try with Supabase Edge Function
            response = await fetch(`${supabaseUrl}/functions/v1/openai-proxy`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Include original API key for backwards compatibility
                ...(apiKey && { 'x-openai-key': apiKey }),
              },
              body: JSON.stringify({
                model: modelToUse,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
              }),
            });
            console.log("Edge function response status:", response.status);
          } catch (edgeFunctionError) {
            console.error("Edge function error:", edgeFunctionError);
            
            // Fallback to direct OpenAI API if edge function fails and we have an API key
            if (apiKey) {
              console.log("Falling back to direct OpenAI API call");
              response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            } else {
              throw edgeFunctionError;
            }
          }
        }
        
        // Check if we have a simulated response for local development
        const isSimulatedResponse = isLocalDevelopment && !apiKey;
        
        if (!isSimulatedResponse) {
          // Only check these properties for real API responses
          if (response.status === 429) {  // Rate limit error
            const retryAfter = response.headers.get('Retry-After') || retryCount + 1;
            console.warn(`Rate limit hit. Retry after ${retryAfter} seconds. Attempt ${retryCount + 1}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter as string) * 1000 || (retryCount + 1) * 1000));
            retryCount++;
            continue;
          }
          
          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
          }
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Extract grade and feedback from the response
        const { grade, feedback } = extractGradeAndFeedback(content, gradingScale);
        
        // Validate the grade to ensure it's within proper range
        const validatedGrade = Math.min(Math.max(0, grade), gradingScale);
        
        // Ensure the feedback doesn't start with a "/points" format (issue #3)
        const cleanedFeedback = feedback.replace(/^\/\d+\s*/, '');
        
        return { grade: validatedGrade, feedback: cleanedFeedback };
      } catch (error) {
        console.error(`Attempt ${retryCount + 1}/${maxRetries} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;
        
        // Add exponential backoff
        if (retryCount < maxRetries) {
          const backoffTime = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying in ${backoffTime/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    throw lastError || new Error("Failed after max retries");
  } catch (error) {
    console.error("Error in gradeWithOpenAI:", error);
    return { 
      grade: 0, 
      feedback: "Failed to grade submission. Error: " + (error instanceof Error ? error.message : "Unknown error") 
    };
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
  The tone of your feedback should be ${feedbackFormality <= 3 ? "casual" : feedbackFormality <= 7 ? "moderately formal" : "very formal"}. \
  DO NOT begin your feedback with a grade or score like "/30" - just provide the actual feedback directly. `;
  
  if (instructorTone) {
    prompt += `Adopt this tone as if you were the instructor: ${instructorTone}. `;
  }
  
  if (additionalInstructions) {
    prompt += `Adhere to these additional instructions: ${additionalInstructions}. `;
  }
  
  prompt += `Now, grade the following submission:\n\n${submissionText}\n\nProvide your response in this format:\nGrade: [numeric grade out of ${gradingScale}]\nFeedback: [your detailed feedback without any score or "/${gradingScale}" prefix]\n\n`;
  
  return prompt;
}

function saveGradingPrompt(prompt: string, submissionPreview: string) {
  // Get existing prompts from localStorage
  const existingPrompts = localStorage.getItem('grading_prompts');
  let prompts = [];
  
  if (existingPrompts) {
    try {
      prompts = JSON.parse(existingPrompts);
    } catch (e) {
      console.error("Error parsing existing prompts:", e);
      prompts = [];
    }
  }
  
  // Add new prompt with timestamp
  prompts.push({
    timestamp: new Date().toISOString(),
    prompt: prompt,
    submissionPreview: submissionPreview
  });
  
  // Store back in localStorage (limit to last 50 prompts to avoid storage limits)
  if (prompts.length > 50) {
    prompts = prompts.slice(-50);
  }
  
  localStorage.setItem('grading_prompts', JSON.stringify(prompts, null, 2));
  console.log(`Saved grading prompt to localStorage (${prompts.length} prompts total)`);
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
  
  // Remove any "/points" format from the beginning of the feedback (issue #3)
  feedback = feedback.replace(/^\/\d+\s*/, '');
  
  // Ensure grade is within proper range
  grade = Math.min(Math.max(0, grade), gradingScale);
  
  return { grade, feedback };
}
