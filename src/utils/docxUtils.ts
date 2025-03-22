
import mammoth from 'mammoth';

/**
 * Extract text from a DOCX file using mammoth.js
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract text from DOCX using supported options
    const result = await mammoth.extractRawText({
      arrayBuffer
    });
    
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    return `[Error extracting text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Extract HTML from a DOCX file to preserve formatting
 */
export async function extractHTMLFromDOCX(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Define custom style map for better formatting
    const options = {
      arrayBuffer,
      transformDocument: mammoth.transforms.paragraph(paragraph => {
        return paragraph;
      })
    };
    
    // Convert DOCX to HTML to preserve formatting
    const result = await mammoth.convertToHtml(options);
    
    return result.value;
  } catch (error) {
    console.error('Error extracting HTML from DOCX:', error);
    return `<p class="text-red-500">[Error extracting HTML from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}]</p>`;
  }
}
