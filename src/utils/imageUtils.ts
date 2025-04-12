import { createWorker } from 'tesseract.js';
import { supabase } from "@/integrations/supabase/client";

// Cache for storing image text extraction results to avoid duplicate API calls
const imageExtractionCache = new Map<string, string>();

/**
 * Unified cache utility
 */
const imageCache = {
  // Get from cache (checks both in-memory and localStorage)
  get: (cacheKey: string, useLocalStorage: boolean = true): string | null => {
    // First check in-memory cache
    if (imageExtractionCache.has(cacheKey)) {
      console.log(`Using in-memory cached text for image key: ${cacheKey}`);
      return imageExtractionCache.get(cacheKey) as string;
    }
    
    // Then check localStorage if enabled
    if (useLocalStorage) {
      try {
        const cachedText = localStorage.getItem(cacheKey);
        if (cachedText) {
          console.log(`Using localStorage cached text for image key: ${cacheKey}`);
          // Update in-memory cache too
          imageExtractionCache.set(cacheKey, cachedText);
          return cachedText;
        }
      } catch (error) {
        console.warn('Error reading from localStorage:', error);
      }
    }
    
    return null;
  },
  
  // Store in cache (both in-memory and localStorage if enabled)
  set: (cacheKey: string, value: string, useLocalStorage: boolean = true): void => {
    // Always update in-memory cache
    imageExtractionCache.set(cacheKey, value);
    
    // Update localStorage if enabled
    if (useLocalStorage) {
      try {
        localStorage.setItem(cacheKey, value);
        console.log(`Cached text for key: ${cacheKey}`);
      } catch (error) {
        console.warn('Could not cache in localStorage:', error);
      }
    }
  }
};

/**
 * File conversion utilities
 */
export const fileUtils = {
  /**
   * Convert a File object to a data URL
   */
  toDataURL: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
  
  /**
   * Convert a File object to a base64 string (alias for consistency)
   */
  toBase64: (file: File): Promise<string> => {
    return fileUtils.toDataURL(file);
  },
  
  /**
   * Generate a cache key for a file
   */
  generateCacheKey: (file: File, prefix: string = ""): string => {
    return `${prefix}${file.name}_${file.size}_${file.lastModified}`;
  }
};

/**
 * Extract text from an image file using OpenAI's vision capabilities
 * This is the preferred method as it's more accurate and can handle various languages and image types
 */
export async function processImageWithOpenAI(
  file: File, 
  prompt: string = "Describe this image in detail and extract any visible text"
): Promise<string> {
  try {
    // Generate a cache key for this specific file
    const cacheKey = `image_text_${fileUtils.generateCacheKey(file)}`;
    
    // Check for cached result
    const cachedResult = imageCache.get(cacheKey);
    if (cachedResult) return cachedResult;
    
    console.log(`Processing image file ${file.name} (${file.size} bytes) with OpenAI`);
    
    // Convert to base64 format required by OpenAI
    const base64Image = await fileUtils.toBase64(file);
    
    // Extract just the base64 data part (remove data:image/jpeg;base64, prefix)
    const base64Data = base64Image.split(',')[1];
    
    // Get the file's content type
    const contentType = file.type || 'image/jpeg';
    
    // Prepare message for GPT-4o with vision
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${contentType};base64,${base64Data}`,
              detail: "high"
            }
          }
        ]
      }
    ];
    
    // Get API key info for authorization
    const useServerKey = localStorage.getItem("use_server_api_key") === "true";
    const personalKey = localStorage.getItem("openai_api_key");
    
    // Prepare headers for the request - always prefer server-side key
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabase.auth.getSession()?.data?.session?.access_token || (supabase as any).supabaseKey}`,
      'x-use-server-key': 'true'
    };
    
    // If on deployed environment, add deployment flag
    if (window.location.hostname !== 'localhost') {
      headers['x-supabase-auth'] = 'deployment';
    }
    
    // Only include personal key if server key isn't being used
    if (!useServerKey && personalKey) {
      headers['x-openai-key'] = personalKey;
    }
    
    console.log('Making image processing request to OpenAI using Edge Function');
    
    // Call OpenAI through our Edge Function
    const requestBody = {
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    };
    
    // Make the request through our Edge Function
    const response = await fetch(
      "https://owaqnztggyxahjhbcylj.supabase.co/functions/v1/openai-proxy",
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorText);
      throw new Error(`OpenAI API returned error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      const imageDescription = data.choices[0].message.content;
      console.log(`Successfully processed image: ${imageDescription.substring(0, 100)}...`);
      
      // Cache the result for future use
      imageCache.set(cacheKey, imageDescription);
      
      return imageDescription;
    } else {
      console.error('Unexpected response format from OpenAI:', data);
      throw new Error('Unexpected response format from OpenAI');
    }
  } catch (error) {
    console.error('Error processing image with OpenAI:', error);
    return `[Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Extract text from an image file using Tesseract.js
 * This is used as a fallback method when OpenAI processing is not available
 */
export async function extractTextFromImage(file: File): Promise<string> {
  try {
    // Generate a cache key for this specific file
    const cacheKey = `tesseract_text_${fileUtils.generateCacheKey(file)}`;
    
    // Check for cached result
    const cachedResult = imageCache.get(cacheKey);
    if (cachedResult) return cachedResult;
    
    console.log(`Processing image with Tesseract: ${file.name}`);
    
    // Create a Tesseract worker with English language directly
    const worker = await createWorker('eng');
    
    // Convert file to data URL
    const dataUrl = await fileUtils.toDataURL(file);
    
    // Recognize text in the image
    const { data } = await worker.recognize(dataUrl);
    
    // Terminate worker to free resources
    await worker.terminate();
    
    // Cache the result
    imageCache.set(cacheKey, data.text);
    
    return data.text;
  } catch (error) {
    console.error('Error extracting text from image with Tesseract:', error);
    return `[Error extracting text from image: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Main function to extract text from an image file, using optimal method
 * This function orchestrates both extraction methods with fallbacks
 */
export async function extractImageText(file: File, useAI: boolean = true): Promise<string> {
  if (!isImageFile(file)) {
    return `[Not an image file: ${file.name}]`;
  }
  
  try {
    // Try OpenAI first if enabled
    if (useAI) {
      const prompt = "You are a teaching assistant grading a student's submission. " +
                    "Please extract all text from this image, preserve formatting where possible, " +
                    "and describe any diagrams, charts or visual elements that are relevant to academic grading. " +
                    "If you can't extract meaningful text, please state that this appears to be an image " +
                    "without substantial text content.";
      
      const oaiResult = await processImageWithOpenAI(file, prompt);
      
      if (oaiResult && !oaiResult.includes("Error processing image")) {
        return oaiResult;
      }
    }
    
    // Fall back to Tesseract
    console.log("Falling back to Tesseract for image text extraction");
    return await extractTextFromImage(file);
  } catch (error) {
    console.error("Error extracting text from image:", error);
    return `[Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  const imageTypes = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif',
    'image/'
  ];
  
  return imageTypes.some(type => 
    file.name.toLowerCase().includes(type) || (file.type && file.type.toLowerCase().includes(type))
  );
}