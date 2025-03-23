
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
    
    // Convert DOCX to HTML with basic styling options
    const options = {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p => p:fresh",
        "table => table.table",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em"
      ]
    };
    
    const result = await mammoth.convertToHtml({
      arrayBuffer,
      ...options
    });
    
    // Add some basic CSS to improve formatting display
    return `
      <style>
        p { margin-bottom: 1em; }
        h1, h2, h3, h4 { margin-top: 1em; margin-bottom: 0.5em; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
        table, th, td { border: 1px solid #ddd; }
        th, td { padding: 8px; text-align: left; }
      </style>
      ${result.value}
    `;
  } catch (error) {
    console.error('Error extracting HTML from DOCX:', error);
    return `<p class="text-red-500">[Error extracting HTML from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}]</p>`;
  }
}
