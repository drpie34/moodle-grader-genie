
import mammoth from 'mammoth';

/**
 * Extract text from a DOCX file using mammoth.js
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract text from DOCX
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    return `[Error extracting text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}
