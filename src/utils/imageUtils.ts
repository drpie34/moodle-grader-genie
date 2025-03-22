
import { createWorker } from 'tesseract.js';

/**
 * Extract text from an image file using Tesseract.js
 */
export async function extractTextFromImage(file: File): Promise<string> {
  try {
    // Create a Tesseract worker
    const worker = await createWorker('eng');
    
    // Convert file to data URL
    const dataUrl = await fileToDataURL(file);
    
    // Recognize text in the image
    const { data } = await worker.recognize(dataUrl);
    
    // Terminate worker to free resources
    await worker.terminate();
    
    return data.text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    return `[Error extracting text from image: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Convert a File object to a data URL
 */
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
