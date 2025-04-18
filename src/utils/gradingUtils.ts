/**
 * Utilities for grading student submissions using OpenAI
 */

// src/utils/gradingUtils.ts
import { supabase } from "@/integrations/supabase/client";

// Cache for storing assignment instruction information to avoid redundant tokens
const gradingCache: {
  functionDefinition?: any, 
  systemMessage?: string,
  assignmentId?: string
} = {};

// Expose gradingCache to window for debugging
// @ts-ignore
window.gradingCache = gradingCache;

// Add a global debug object to track execution path
window._debugGrading = {
  executionPath: [],
  environment: {},
  lastUrl: '',
  logPath: function(step) {
    this.executionPath.push({
      step: step,
      timestamp: new Date().toISOString()
    });
    console.log(`[DEBUG] Execution path: ${step}`);
  }
};

// Initialize environment info
window._debugGrading.environment = {
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  pathname: window.location.pathname,
  isLocal: window.location.hostname === 'localhost',
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString()
};

// Log environment details
console.log('[DEBUG] Environment:', window._debugGrading.environment);

// Create a wrapper for fetch that logs all API calls
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  // Log all fetch calls
  console.log(`[DEBUG] Fetch call to: ${url}`);
  window._debugGrading.lastUrl = url;
  
  // Special detection for direct OpenAI calls
  if (url.includes('api.openai.com')) {
    console.error('‼️ DIRECT OPENAI CALL DETECTED ‼️', {
      url: url,
      options: options,
      executionPath: window._debugGrading.executionPath,
      environment: window._debugGrading.environment
    });
  }
  
  // Call original fetch
  return originalFetch.apply(this, arguments);
};

/**
 * Grades a student submission using OpenAI, handling both text and image submissions
 * @param submissionText Text content to grade, or special marker for image files
 * @param assignmentData Assignment details and grading parameters
 * @param apiKey API key to use (usually "server" to use server-side key)
 * @param gradingScale Maximum points for the assignment
 * @param submissionFile Optional file object for image submissions
 */
export async function gradeWithOpenAI(
  submissionText: string, 
  assignmentData: any, 
  apiKey: string = "", 
  gradingScale: number = 100,
  submissionFile?: File
): Promise<{ grade: number; feedback: string }> {
  window._debugGrading.logPath('gradeWithOpenAI function start');
  console.log('[DEBUG] Function parameters:', { 
    submissionLength: submissionText?.length,
    assignmentName: assignmentData?.assignmentName,
    apiKeyProvided: !!apiKey,
    apiKeyType: typeof apiKey,
    apiKeyIsString: typeof apiKey === 'string',
    apiKeyLength: typeof apiKey === 'string' ? apiKey.length : 0,
    gradingScale,
    hasSubmissionFile: !!submissionFile,
    fileType: submissionFile?.type,
    isImageSubmission: submissionText === '[IMAGE_SUBMISSION]'
  });
  
  // CRITICAL CHECK: If someone is passing an actual OpenAI API key, this could lead to direct calls
  if (typeof apiKey === 'string' && apiKey.length > 30 && apiKey.startsWith('sk-')) {
    window._debugGrading.logPath('⚠️ DIRECT OPENAI API KEY DETECTED');
    console.error('⚠️ DIRECT OPENAI API KEY DETECTED - This should never happen with server-side key architecture');
    
    // Save for diagnostic purposes
    window._debugGrading.environment.directApiKeyDetected = true;
    
    // Replace with safe value to prevent direct calls
    apiKey = "server";
  }
  
  try {
    // Handle image submissions specially
    const isImageSubmission = submissionText === '[IMAGE_SUBMISSION]' && submissionFile;
    
    if (isImageSubmission) {
      window._debugGrading.logPath('Image submission detected');
      console.log("Processing image submission:", submissionFile?.name);
      
      // Make sure we have a file
      if (!submissionFile) {
        console.error("Image submission marker found but no file provided");
        return {
          grade: 0,
          feedback: "Error: Image submission detected but file is missing. Please review manually."
        };
      }
      
      // Image submissions are handled through a different flow
      return await gradeImageSubmission(submissionFile, assignmentData, apiKey, gradingScale);
    }
    
    // Regular text submission flow
    if (!submissionText || submissionText.trim().length === 0) {
      window._debugGrading.logPath('Empty submission detected');
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
    
    // Create a unique ID for this assignment configuration to check if we need to update the cache
    const assignmentId = `${assignmentData.assignmentName}-${assignmentData.gradingScale}-${assignmentData.gradingStrictness}-${assignmentData.feedbackLength}-${assignmentData.feedbackFormality}`;
    
    // Setup function calling for token optimization
    if (!gradingCache.functionDefinition || !gradingCache.systemMessage || gradingCache.assignmentId !== assignmentId) {
      console.log("Setting up new grading function and system message");
      gradingCache.assignmentId = assignmentId;
      setupGradingFunction(assignmentData);
    } else {
      console.log("Using cached grading function and system message");
    }
    
    // Save the actual API request data to localStorage for accurate debugging
    // This shows exactly what we're sending to the OpenAI API
    const apiRequestSummary = {
      systemMessage: gradingCache.systemMessage || "None",
      userMessage: `Grade this submission: ${submissionText}`,
      function: gradingCache.functionDefinition ? gradingCache.functionDefinition.name : "None",
      cached: !!gradingCache.assignmentId,
      assignmentId: gradingCache.assignmentId || "None"
    };
    // Save a preview of the submission for quick reference
    saveApiRequest(apiRequestSummary, submissionText);
    
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
        let response;
        
        // Always use the Edge Function regardless of environment
        const isLocalDevelopment = window.location.hostname === 'localhost';
        window._debugGrading.logPath(`Environment detection: isLocalDevelopment=${isLocalDevelopment}`);
        
        // Capture all environment variables that could affect routing
        window._debugGrading.environment.isLocalDevelopment = isLocalDevelopment;
        window._debugGrading.environment.locationHostname = window.location.hostname;
        window._debugGrading.environment.locationOrigin = window.location.origin;
        
        console.log("[DEBUG] Detailed environment info:", { 
          isLocalDevelopment,
          hostname: window.location.hostname,
          origin: window.location.origin,
          href: window.location.href,
          useServerSideKey: true
        });
        
        // Prepare optimized request with function calling
        const requestBody = {
          model: modelToUse,
          messages: [
            // Use the full system message - this is the actual message sent to OpenAI
            { role: "system", content: gradingCache.systemMessage },
            // Use the full submission text - this is critical for proper grading
            { role: "user", content: `Grade this submission: ${submissionText}` }
          ],
          functions: [gradingCache.functionDefinition],
          function_call: { name: "gradeSubmission" },
          temperature: 0.7,
        };
        
        window._debugGrading.logPath('Request body prepared');
        console.log("[DEBUG] Request body prepared:", {
          modelToUse,
          functionName: requestBody.function_call.name,
          systemMessageLength: gradingCache.systemMessage?.length,
          userMessageLength: submissionText.length
        });
        
        // Always use Supabase Edge Function
        try {
          window._debugGrading.logPath('Preparing to call Supabase edge function');
          console.log("Calling Supabase edge function for OpenAI proxy");
          
          // Get the Supabase key - try multiple sources to ensure we have a key
          // 1. Try the session token first (for authenticated users)
          // 2. Then try the client's anon key 
          // 3. Finally use our hardcoded anon key as a last resort
          const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93YXFuenRnZ3l4YWhqaGJjeWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NTA3NzMsImV4cCI6MjA1ODIyNjc3M30.hPtP2iECWacaUFthBGItwezPox5JX6GhdlKFqRZMcOA";
          
          const sessionKey = supabase.auth.getSession()?.data?.session?.access_token;
          const clientKey = (supabase as any).supabaseKey;
          
          const SUPABASE_KEY = sessionKey || clientKey || ANON_KEY;
          
          // Log which key source we're using (without revealing the actual key)
          console.log("Key source:", 
            sessionKey ? "user session" : 
            clientKey ? "client anon key" : 
            "fallback anon key");
          
          // Set additional authentication info for deployed environment
          const isDeployedEnvironment = window.location.hostname !== 'localhost';
          
          console.log("Using SUPABASE_KEY:", SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 10)}...` : "none");
          console.log("Environment detection:", { hostname: window.location.hostname, isDeployedEnvironment });
          
          // Optional simulation mode for local development testing - disabled by default
          const useSimulation = false; // Set to true if you want to use simulated responses
          
          if (isLocalDevelopment && useSimulation) {
            console.log("Local development: Using simulated response (simulation mode enabled)");
            
            // Create a simulated response
            const simulatedGrade = Math.min(95, Math.max(60, Math.round(75 + submissionText.length / 1000)));
            
            // Create simulated function call response format
            response = {
              status: 200,
              ok: true,
              headers: new Headers(),
              json: async () => ({
                choices: [{
                  message: {
                    function_call: {
                      name: "gradeSubmission",
                      arguments: JSON.stringify({
                        grade: simulatedGrade,
                        feedback: "This is simulated feedback for local development. The submission demonstrates a good understanding of the material. There are several strong points as well as areas that could be improved."
                      })
                    }
                  }
                }]
              })
            } as Response;
          } else {
            // Production or local development - always use Edge Function
            console.log("Calling Supabase Edge Function from:", isLocalDevelopment ? "local development" : "production");
            
            // Set up headers for the Edge Function
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_KEY}`
            };
            
            // ALWAYS add the deployment flag for non-localhost environments
            if (isDeployedEnvironment || !SUPABASE_KEY || SUPABASE_KEY.length < 10) {
              headers['x-supabase-auth'] = 'deployment';
              console.log("Using deployment auth mode");
            }
            
            // IMPORTANT: Signal to our edge function that we want it to use the server's API key
            headers['x-use-server-key'] = 'true';
            
            console.log("Using server's API key in edge function");
            console.log("Is deployed environment:", isDeployedEnvironment);
            console.log("Edge function request headers:", Object.keys(headers));
            
            // CRITICAL CHANGE: Add debugging for API call path
            window._debugGrading.logPath('Preparing to call Edge Function with hardcoded URL');
            
            // CRITICAL FIX: Hardcode the Supabase URL and endpoint to guarantee we don't call OpenAI directly
            const edgeFunctionUrl = "https://owaqnztggyxahjhbcylj.supabase.co/functions/v1/openai-proxy";
            
            // Create permanent debug object that won't be removed in production builds
            try {
              window.__TRACK_FETCH_CALLS = window.__TRACK_FETCH_CALLS || [];
              const originalFetchDirect = window.fetch;
              
              // Only override if we haven't already
              if (!window.__FETCH_OVERRIDDEN) {
                window.__FETCH_OVERRIDDEN = true;
                window.fetch = function directFetchTracker(url, options) {
                  // Track API calls in a way that will survive minification
                  window.__TRACK_FETCH_CALLS.push({
                    url: url?.toString?.() || "unknown",
                    time: new Date().toISOString()
                  });
                  
                  // Detect direct OpenAI calls
                  if (url?.toString?.().includes('api.openai.com')) {
                    console.error('⚠️ DIRECT OPENAI CALL DETECTED ⚠️', { url });
                    
                    // Capture full info to diagnose the issue
                    window.__OPENAI_DIRECT_CALLS = window.__OPENAI_DIRECT_CALLS || [];
                    window.__OPENAI_DIRECT_CALLS.push({
                      url: url?.toString?.(),
                      options: JSON.stringify(options || {}),
                      stack: new Error().stack,
                      time: new Date().toISOString()
                    });
                  }
                  
                  // Call original fetch
                  return originalFetchDirect.apply(this, arguments);
                };
              }
            } catch (e) {
              console.error("Failed to set up fetch tracking:", e);
            }
            
            window._debugGrading.environment.edgeFunctionUrl = edgeFunctionUrl;
            
            console.log("[DEBUG] Using Edge Function URL:", edgeFunctionUrl);
            console.log("[DEBUG] Headers being sent:", {
              headerKeys: Object.keys(headers),
              contentType: headers['Content-Type'],
              authPresent: !!headers['Authorization'],
              xDeployment: headers['x-supabase-auth'],
              xServerKey: headers['x-use-server-key']
            });
            
            // Check for any potential fetch overrides
            window._debugGrading.environment.fetchIsOverridden = window.fetch !== originalFetch;
            console.log("[DEBUG] Is fetch overridden:", window._debugGrading.environment.fetchIsOverridden);
            
            try {
              window._debugGrading.logPath('Executing Edge Function fetch call');
              
              // Record the URL we're about to call to verify it's not changed
              const beforeCallUrl = edgeFunctionUrl;
              window._debugGrading.lastUrlBeforeCall = beforeCallUrl;
              
              // Use a direct, explicit fetch call that's harder to transform
              response = await (function(url, options) {
                window._debugGrading.logPath(`Actual fetch call to: ${url}`);
                console.log("[DEBUG] Making fetch call with URL:", url);
                return fetch(url, options);
              })(edgeFunctionUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
              });
              
              window._debugGrading.logPath(`Edge function response received: status=${response.status}`);
              console.log("[DEBUG] Edge function response:", {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText,
                headers: [...response.headers.entries()]
              });
              
              // Add detailed logging for non-200 responses
              if (!response.ok) {
                window._debugGrading.logPath(`Error response from Edge Function: ${response.status}`);
                const errorText = await response.text().catch(e => "Could not read error text");
                console.error("[DEBUG] Edge function error response:", errorText);
                throw new Error(`Edge function returned status ${response.status}: ${errorText}`);
              }
            } catch (fetchError) {
              window._debugGrading.logPath(`Fetch error: ${fetchError.message}`);
              console.error("[DEBUG] Fetch to Edge Function failed:", {
                error: fetchError,
                message: fetchError.message,
                url: edgeFunctionUrl,
                headers: headers
              });
              throw fetchError;
            }
          }
        } catch (edgeFunctionError) {
          console.error("Edge function error:", edgeFunctionError);
          
          // IMPORTANT: Add detection for direct OpenAI fallback
          window._debugGrading.logPath(`Edge function error: ${edgeFunctionError.message}`);
          
          // Check if there's any code that might try to directly call OpenAI as a fallback
          console.error("[DEBUG] Edge Function error - checking for fallback paths:", {
            error: edgeFunctionError,
            message: edgeFunctionError.message,
            edgeFunctionUrl: window._debugGrading.environment.edgeFunctionUrl,
            executionPath: window._debugGrading.executionPath
          });
          
          // We should NEVER fall back to direct OpenAI calls - explicitly block any potential fallback
          if (apiKey && apiKey.length > 0 && apiKey !== "server") {
            window._debugGrading.logPath('⚠️ POTENTIAL DIRECT OPENAI FALLBACK DETECTED');
            console.error('⚠️ DETECTED POTENTIAL DIRECT OPENAI FALLBACK - Blocking this path');
            
            // Override apiKey to prevent direct calls
            apiKey = "BLOCKED_DIRECT_CALL_" + (new Date()).getTime();
          }
          
          // If the edge function fails completely, we have no fallback
          // since we're only using the server key
          throw edgeFunctionError;
        }
        
        // Check standard response properties
        if (response) {
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
        
        // Handle function call response format
        let grade, feedback;
        
        if (data.choices[0]?.message?.function_call) {
          // Parse function arguments
          try {
            const functionArgs = JSON.parse(data.choices[0].message.function_call.arguments);
            grade = functionArgs.grade;
            feedback = functionArgs.feedback;
            console.log("Successfully parsed function call response");
          } catch (error) {
            console.error("Error parsing function call response:", error);
            throw new Error("Failed to parse function call response");
          }
        } else {
          // Fallback to old format if function calling isn't supported
          const content = data.choices[0].message.content;
          const extracted = extractGradeAndFeedback(content, gradingScale);
          grade = extracted.grade;
          feedback = extracted.feedback;
        }
        
        // Validate the grade to ensure it's within proper range
        const validatedGrade = Math.min(Math.max(0, grade), gradingScale);
        
        // Ensure the feedback doesn't start with a "/points" format (issue #3)
        const cleanedFeedback = typeof feedback === 'string' ? feedback.replace(/^\/\d+\s*/, '') : '';
        
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

/**
 * Grade a submission that contains an image file
 * This sends the image directly to OpenAI's vision model for grading
 */
async function gradeImageSubmission(
  imageFile: File, 
  assignmentData: any,
  apiKey: string,
  gradingScale: number
): Promise<{ grade: number; feedback: string }> {
  window._debugGrading.logPath('gradeImageSubmission function start');
  console.log(`Processing image file: ${imageFile.name} (${imageFile.type}, ${imageFile.size} bytes)`);
  
  try {
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile);
    
    // Extract just the base64 data part (remove data:image/jpeg;base64, prefix)
    const base64Data = base64Image.split(',')[1];
    
    // Get the file's content type
    const contentType = imageFile.type || 'image/jpeg';
    
    // Create a unique ID for this assignment configuration
    const assignmentId = `${assignmentData.assignmentName}-${assignmentData.gradingScale}-${assignmentData.gradingStrictness}-${assignmentData.feedbackLength}-${assignmentData.feedbackFormality}`;
    
    // Setup grading instructions similar to the text-based version
    if (!gradingCache.systemMessage || gradingCache.assignmentId !== assignmentId) {
      console.log("Setting up new system message for image grading");
      gradingCache.assignmentId = assignmentId;
      setupGradingFunction(assignmentData);
    }
    
    // Save the actual API request data to localStorage for accurate debugging
    const apiRequestSummary = {
      systemMessage: gradingCache.systemMessage || "None",
      userMessage: `Grade this image-based submission`,
      function: gradingCache.functionDefinition ? gradingCache.functionDefinition.name : "None",
      cached: !!gradingCache.assignmentId,
      assignmentId: gradingCache.assignmentId || "None",
      isImageSubmission: true,
      imageInfo: {
        fileName: imageFile.name,
        fileSize: imageFile.size,
        fileType: imageFile.type
      }
    };
    
    // Save for debug purposes
    saveApiRequest(apiRequestSummary, `[Image submission: ${imageFile.name}]`);
    
    // Get the Supabase URL from client
    const supabaseUrl = "https://owaqnztggyxahjhbcylj.supabase.co";
    console.log("Using Supabase URL for edge function:", supabaseUrl);
    
    // Implement retry logic with exponential backoff
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: Error | null = null;
    
    while (retryCount < maxRetries) {
      try {
        // Always use the Edge Function
        const isLocalDevelopment = window.location.hostname === 'localhost';
        window._debugGrading.logPath(`Environment detection for image: isLocalDevelopment=${isLocalDevelopment}`);
        
        // Get authentication credentials for the Edge Function
        const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93YXFuenRnZ3l4YWhqaGJjeWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NTA3NzMsImV4cCI6MjA1ODIyNjc3M30.hPtP2iECWacaUFthBGItwezPox5JX6GhdlKFqRZMcOA";
        const sessionKey = supabase.auth.getSession()?.data?.session?.access_token;
        const clientKey = (supabase as any).supabaseKey;
        const SUPABASE_KEY = sessionKey || clientKey || ANON_KEY;
        
        console.log("Using SUPABASE_KEY:", SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 10)}...` : "none");
        
        // Set up headers for the Edge Function
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'x-use-server-key': 'true'
        };
        
        // Add the deployment flag for non-localhost environments
        const isDeployedEnvironment = window.location.hostname !== 'localhost';
        if (isDeployedEnvironment) {
          headers['x-supabase-auth'] = 'deployment';
        }
        
        window._debugGrading.logPath('Preparing image API request');
        
        // Set up request to include the image with vision specific instructions
        const requestBody = {
          model: "gpt-4o-mini", // Use GPT-4o mini which supports vision
          messages: [
            {
              role: "system",
              content: gradingCache.systemMessage
            },
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: "Grade this image-based submission. Look carefully at any handwritten text, diagrams, or other visual content." 
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${contentType};base64,${base64Data}`,
                    detail: "high" // Request high detail for academic work
                  }
                }
              ]
            }
          ],
          functions: [gradingCache.functionDefinition],
          function_call: { name: "gradeSubmission" },
          temperature: 0.7,
        };
        
        window._debugGrading.logPath('Sending image to OpenAI via Edge Function');
        
        // Call the OpenAI API via Edge Function
        const edgeFunctionUrl = "https://owaqnztggyxahjhbcylj.supabase.co/functions/v1/openai-proxy";
        console.log("[DEBUG] Sending image to Edge Function URL:", edgeFunctionUrl);
        
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestBody)
        });
        
        window._debugGrading.logPath(`Edge function response for image: status=${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text().catch(e => "Could not read error text");
          throw new Error(`Edge function returned status ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        // Parse the response - same code as the text version
        let grade, feedback;
        
        if (data.choices[0]?.message?.function_call) {
          // Parse function arguments
          try {
            const functionArgs = JSON.parse(data.choices[0].message.function_call.arguments);
            grade = functionArgs.grade;
            feedback = functionArgs.feedback;
            console.log("Successfully parsed function call response for image");
          } catch (error) {
            console.error("Error parsing function call response:", error);
            throw new Error("Failed to parse function call response");
          }
        } else {
          // Fallback if function calling wasn't used
          const content = data.choices[0].message.content;
          const extracted = extractGradeAndFeedback(content, gradingScale);
          grade = extracted.grade;
          feedback = extracted.feedback;
        }
        
        // Validate the grade to ensure it's within proper range
        const validatedGrade = Math.min(Math.max(0, grade), gradingScale);
        
        // Ensure the feedback doesn't start with a "/points" format
        const cleanedFeedback = typeof feedback === 'string' ? feedback.replace(/^\/\d+\s*/, '') : '';
        
        return { grade: validatedGrade, feedback: cleanedFeedback };
      } catch (error) {
        console.error(`Image grading attempt ${retryCount + 1}/${maxRetries} failed:`, error);
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
    console.error("Error in gradeImageSubmission:", error);
    return {
      grade: 0,
      feedback: `Failed to grade image submission. Error: ${error instanceof Error ? error.message : "Unknown error"}. Please review this image submission manually.`
    };
  }
}

/**
 * Convert a File object to a base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// Setup function definition and system message once and cache it
function setupGradingFunction(assignmentData: any) {
  // Create the function definition
  gradingCache.functionDefinition = {
    name: "gradeSubmission",
    description: "Grade a student submission based on assignment criteria",
    parameters: {
      type: "object",
      properties: {
        grade: {
          type: "number",
          description: `Numeric grade out of ${assignmentData.gradingScale} points`
        },
        feedback: {
          type: "string",
          description: "Detailed feedback for the student"
        }
      },
      required: ["grade", "feedback"]
    }
  };
  
  // Create fine-grained scale mappings (same as in constructPrompt)
  const strictnessDescriptions = [
    "extremely lenient", "very lenient", "lenient", "somewhat lenient", "balanced", 
    "slightly firm", "moderately strict", "firm", "very strict", "extremely strict"
  ];
  
  const feedbackLengthDescriptions = [
    "very brief", "brief", "concise", "somewhat detailed", "moderately detailed",
    "detailed", "quite detailed", "thorough", "very thorough", "extremely detailed"
  ];
  
  const formalityDescriptions = [
    "very casual and conversational", "casual and friendly", "informal", "somewhat informal", "balanced",
    "somewhat formal", "professional", "formal", "quite formal", "highly formal and academic"
  ];
  
  // Convert values and get appropriate levels
  const strictnessValue = typeof assignmentData.gradingStrictness === 'string' ? 
    parseInt(assignmentData.gradingStrictness, 10) : assignmentData.gradingStrictness;
    
  const lengthValue = typeof assignmentData.feedbackLength === 'string' ? 
    parseInt(assignmentData.feedbackLength, 10) : assignmentData.feedbackLength;
    
  const formalityValue = typeof assignmentData.feedbackFormality === 'string' ? 
    parseInt(assignmentData.feedbackFormality, 10) : assignmentData.feedbackFormality;
  
  const strictnessLevel = Math.min(Math.max(1, Math.round(strictnessValue || 5)), 10);
  const lengthLevel = Math.min(Math.max(1, Math.round(lengthValue || 5)), 10);
  const formalityLevel = Math.min(Math.max(1, Math.round(formalityValue || 5)), 10);
  
  // Create system message with all the reusable instructions
  gradingCache.systemMessage = `You are acting as the instructor for ${assignmentData.courseName} at the ${assignmentData.academicLevel} level.
  You are an expert teacher, and you think carefully about how best to assess assignments and provide helpful and friendly feedback.
  You always pay very close attention to the requirements of the assignment and make sure to structure your feedback in a way that takes into account all the components of the assignment,
  while carefully weighing them against any grading instructions or rubric you receive. You write in a way that would be indistinguishable from a human instructor.
  
  Your task is to grade student submissions for the assignment "${assignmentData.assignmentName}" out of ${assignmentData.gradingScale} points.
  
  Assignment instructions: ${assignmentData.assignmentInstructions}
  
  ${assignmentData.rubric ? `Rubric: ${assignmentData.rubric}` : ''}
  
  Grading parameters:
  - Be ${strictnessDescriptions[strictnessLevel - 1]} in your grading (${strictnessLevel}/10 on strictness scale)
  - Provide feedback that is ${feedbackLengthDescriptions[lengthLevel - 1]} (${lengthLevel}/10 on detail scale)
  - The tone of your feedback should be ${formalityDescriptions[formalityLevel - 1]} (${formalityLevel}/10 on formality scale)
  
  DO NOT begin your feedback with a grade or score like "/30" - just provide the actual feedback directly.
  
  ${assignmentData.instructorTone ? `This is a sample of the tone to adopt in your feedback. Remember, this is tone only, the actual example provided may be for an entirely different assignment: ${assignmentData.instructorTone}` : ''}
  
  ${assignmentData.additionalInstructions ? `Additional instructions: ${assignmentData.additionalInstructions}` : ''}`;
  
  console.log("Grading function and system message setup complete");
}

function constructPrompt(submissionText: string, assignmentData: any): string {
  const { assignmentName, courseName, assignmentInstructions, rubric, academicLevel, gradingScale, gradingStrictness, feedbackLength, feedbackFormality, instructorTone, additionalInstructions } = assignmentData;
  
  let prompt = `You are acting as the instructor for ${courseName} at the ${academicLevel} level. \
  You are an expert teacher, and you think carefully about how best to assess assignments and provide helpful and friendly feedback. \
  You always pay very close attention to the requirements of the assignment and make sure to structure your feedback in a way that takes into account all the components of the assignment, \
  while carefully weighing them against any grading instructions or rubric you receive. You write in a way that would be indistinguishable from a human instructor. \
  Your task is to grade student submissions for the assignment "${assignmentName}" out of ${gradingScale} points. \
  Follow these instructions from the assignment description: ${assignmentInstructions}. `;
  
  if (rubric) {
    prompt += `Use this rubric to guide your grading: ${rubric}. `;
  }
  
  // Create a fine-grained scale mapping for strictness (1-10)
  const strictnessDescriptions = [
    "extremely lenient", // 1
    "very lenient",      // 2
    "lenient",           // 3
    "somewhat lenient",  // 4
    "balanced",          // 5 
    "slightly firm",     // 6
    "moderately strict", // 7
    "firm",              // 8
    "very strict",       // 9
    "extremely strict"   // 10
  ];
  
  // Create a fine-grained scale mapping for feedback length (1-10)
  const feedbackLengthDescriptions = [
    "very brief",           // 1
    "brief",                // 2
    "concise",              // 3
    "somewhat detailed",    // 4
    "moderately detailed",  // 5
    "detailed",             // 6
    "quite detailed",       // 7
    "thorough",             // 8
    "very thorough",        // 9
    "extremely detailed"    // 10
  ];
  
  // Create a fine-grained scale mapping for formality (1-10)
  const formalityDescriptions = [
    "very casual and conversational", // 1
    "casual and friendly",           // 2
    "informal",                      // 3
    "somewhat informal",             // 4
    "balanced",                      // 5
    "somewhat formal",               // 6
    "professional",                  // 7
    "formal",                        // 8
    "quite formal",                  // 9
    "highly formal and academic"     // 10
  ];
  
  // Get the appropriate description for each scale (handling values outside 1-10 range)
  // Convert to number if needed, default to 5 (middle of scale) if undefined
  const strictnessValue = typeof gradingStrictness === 'string' ? parseInt(gradingStrictness, 10) : gradingStrictness;
  const lengthValue = typeof feedbackLength === 'string' ? parseInt(feedbackLength, 10) : feedbackLength;
  const formalityValue = typeof feedbackFormality === 'string' ? parseInt(feedbackFormality, 10) : feedbackFormality;
  
  const strictnessLevel = Math.min(Math.max(1, Math.round(strictnessValue || 5)), 10);
  const lengthLevel = Math.min(Math.max(1, Math.round(lengthValue || 5)), 10);
  const formalityLevel = Math.min(Math.max(1, Math.round(formalityValue || 5)), 10);
  
  prompt += `Be ${strictnessDescriptions[strictnessLevel - 1]} in your grading (${strictnessLevel}/10 on strictness scale). \
  Provide feedback that is ${feedbackLengthDescriptions[lengthLevel - 1]} (${lengthLevel}/10 on detail scale). \
  The tone of your feedback should be ${formalityDescriptions[formalityLevel - 1]} (${formalityLevel}/10 on formality scale). \
  DO NOT begin your feedback with a grade or score like "/30" - just provide the actual feedback directly. `;
  
  if (instructorTone) {
    prompt += `This is a sample of the tone to adopt in your feedback. Remember, this is tone only, the actual example provided may be for an entirely different assignment: ${instructorTone}. `;
  }
  
  if (additionalInstructions) {
    prompt += `Adhere to these additional instructions: ${additionalInstructions}. `;
  }
  
  prompt += `Now, grade the following submission:\n\n${submissionText}\n\nProvide your response in this format:\nGrade: [numeric grade out of ${gradingScale}]\nFeedback: [your detailed feedback without any score or "/${gradingScale}" prefix]\n\n`;
  
  return prompt;
}

// Save actual API request details to show what's really being sent to OpenAI
function saveApiRequest(apiRequest: any, submissionPreview: string) {
  // Get existing prompts from localStorage
  const existingPrompts = localStorage.getItem('api_requests');
  let requests = [];
  
  if (existingPrompts) {
    try {
      requests = JSON.parse(existingPrompts);
    } catch (e) {
      console.error("Error parsing existing API requests:", e);
      requests = [];
    }
  }
  
  // Create a record showing the exact API request structure
  const requestRecord = {
    timestamp: new Date().toISOString(),
    submissionPreview: submissionPreview,
    // Include details of what's sent to the API
    apiRequest: apiRequest,
    // Add useful metadata
    edgeFunction: {
      description: "Using Supabase Edge Function for secure server-side API access",
      details: "All API calls are routed through our secure Edge Function",
      benefit: "Your OpenAI API key is never exposed to the client"
    },
    tokenOptimization: {
      description: "Using OpenAI function calling for token optimization",
      details: "System message and function definition are cached and reused between requests",
      benefit: "Only sends the submission text for each new request, avoiding redundant instruction tokens"
    }
  };
  
  // Add the new request record
  requests.push(requestRecord);
  
  // Store back in localStorage (limit to last 50 requests to avoid storage limits)
  if (requests.length > 50) {
    requests = requests.slice(-50);
  }
  
  localStorage.setItem('api_requests', JSON.stringify(requests, null, 2));
  console.log(`Saved API request to localStorage (${requests.length} requests total)`);
  
  // For backward compatibility, also update the old grading_prompts
  updateLegacyPrompts(apiRequest, submissionPreview);
}

// Maintain the old format for backward compatibility
function updateLegacyPrompts(apiRequest: any, submissionPreview: string) {
  try {
    const existingPrompts = localStorage.getItem('grading_prompts');
    let prompts = [];
    
    if (existingPrompts) {
      try {
        prompts = JSON.parse(existingPrompts);
      } catch (e) {
        prompts = [];
      }
    }
    
    prompts.push({
      timestamp: new Date().toISOString(),
      apiRequest: apiRequest,
      submissionPreview: submissionPreview,
      note: "This is a summary of the actual API call. The full instructions are only sent once and cached."
    });
    
    if (prompts.length > 50) {
      prompts = prompts.slice(-50);
    }
    
    localStorage.setItem('grading_prompts', JSON.stringify(prompts, null, 2));
  } catch (error) {
    console.error("Error updating legacy prompts:", error);
  }
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