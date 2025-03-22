
import mammoth from 'mammoth';

/**
 * Extract text from a DOCX file using mammoth.js
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract text from DOCX with improved options for better formatting
    const result = await mammoth.extractRawText({
      arrayBuffer,
      preserveStyles: true,
      includeDefaultStyleMap: true
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
    
    // Convert DOCX to HTML to preserve formatting
    const result = await mammoth.convertToHtml({
      arrayBuffer,
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p => p:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em"
      ]
    });
    
    return result.value;
  } catch (error) {
    console.error('Error extracting HTML from DOCX:', error);
    return `<p class="text-red-500">[Error extracting HTML from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}]</p>`;
  }
}
