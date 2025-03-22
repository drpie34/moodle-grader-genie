
import { extractTextFromPDF } from './pdfUtils';
import { extractTextFromDOCX } from './docxUtils';
import { extractTextFromImage } from './imageUtils';
import { processZipFile as extractFilesFromZip } from './zipUtils';
import { extractTextFromTXT, uploadMoodleGradebook } from './csvUtils';
import { gradeWithOpenAI } from './gradingUtils';

/**
 * Core utilities for file operations in the grading system
 */

/**
 * Process a file to extract text content based on its type
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type || getFileTypeFromExtension(file.name);
  
  // Handle different file types
  if (fileType.includes('pdf')) {
    return extractTextFromPDF(file);
  } else if (fileType.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
    return extractTextFromDOCX(file);
  } else if (fileType.includes('text/plain') || file.name.endsWith('.txt')) {
    return extractTextFromTXT(file);
  } else if (fileType.includes('image/')) {
    return extractTextFromImage(file);
  } else {
    // Default: try to read as text
    return extractTextFromTXT(file);
  }
}

/**
 * Get file type from extension when mime type is not available
 */
function getFileTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'txt': return 'text/plain';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
}

/**
 * Process a ZIP file to extract its contents
 */
export async function processZipFile(zipFile: File): Promise<File[]> {
  return extractFilesFromZip(zipFile);
}

// Re-export functions from other utility files
export { 
  extractTextFromTXT,
  uploadMoodleGradebook
} from './csvUtils';

export {
  parseMoodleCSV,
  generateMoodleCSV,
  downloadCSV
} from './csvUtils';

export { gradeWithOpenAI } from './gradingUtils';
