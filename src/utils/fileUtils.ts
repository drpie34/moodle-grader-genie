
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
  } else if (fileType.includes('text/html') || file.name.endsWith('.html') || file.name.endsWith('.htm') || file.name.includes('onlinetext')) {
    return extractTextFromHTML(file);
  } else if (fileType.includes('image/')) {
    return extractTextFromImage(file);
  } else {
    // Default: try to read as text
    return extractTextFromTXT(file);
  }
}

/**
 * Extract text from HTML file
 */
export async function extractTextFromHTML(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        // Create a DOM parser and parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        
        // Extract text content from the body
        const textContent = doc.body.textContent || '';
        
        // Clean up whitespace
        const cleanedText = textContent
          .replace(/\s+/g, ' ')
          .trim();
          
        resolve(cleanedText);
      } catch (error) {
        console.error('Error extracting text from HTML:', error);
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Get file type from extension when mime type is not available
 */
function getFileTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // Special case for onlinetext HTML files from Moodle
  if (filename.includes('onlinetext')) {
    return 'text/html';
  }
  
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'txt': return 'text/plain';
    case 'html':
    case 'htm': return 'text/html';
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

/**
 * Find the best submission file for a student from multiple files
 * Prioritizes files with content over empty files
 */
export async function findBestSubmissionFile(files: File[]): Promise<File | null> {
  if (!files.length) return null;
  if (files.length === 1) return files[0];
  
  // Group files by student identifier (assuming filename format)
  const filesByStudent: { [key: string]: File[] } = {};
  
  for (const file of files) {
    // Extract student identifier from filename
    // This is a simplified approach - may need to be adjusted based on actual naming conventions
    const studentId = file.name.split('_')[0];
    
    if (!filesByStudent[studentId]) {
      filesByStudent[studentId] = [];
    }
    
    filesByStudent[studentId].push(file);
  }
  
  // For each student, find the best submission file
  const bestFiles: File[] = [];
  
  for (const studentId in filesByStudent) {
    const studentFiles = filesByStudent[studentId];
    
    // If there's only one file, use it
    if (studentFiles.length === 1) {
      bestFiles.push(studentFiles[0]);
      continue;
    }
    
    // Check for non-HTML files first (typically uploaded documents)
    const nonHtmlFiles = studentFiles.filter(file => 
      !file.name.endsWith('.html') && !file.name.endsWith('.htm')
    );
    
    if (nonHtmlFiles.length > 0) {
      // Prefer PDF, DOCX, DOC over other formats
      const preferredFile = nonHtmlFiles.find(file => 
        file.name.endsWith('.pdf') || 
        file.name.endsWith('.docx') || 
        file.name.endsWith('.doc')
      ) || nonHtmlFiles[0];
      
      // Check if the file has content
      try {
        const content = await extractTextFromFile(preferredFile);
        if (content.trim().length > 0) {
          bestFiles.push(preferredFile);
          continue;
        }
      } catch (error) {
        console.error(`Error extracting text from ${preferredFile.name}:`, error);
      }
    }
    
    // If no non-HTML file with content was found, try HTML files
    const htmlFiles = studentFiles.filter(file => 
      file.name.endsWith('.html') || file.name.endsWith('.htm')
    );
    
    if (htmlFiles.length > 0) {
      for (const htmlFile of htmlFiles) {
        try {
          const content = await extractTextFromHTML(htmlFile);
          if (content.trim().length > 0) {
            bestFiles.push(htmlFile);
            break; // Use the first HTML file with content
          }
        } catch (error) {
          console.error(`Error extracting text from ${htmlFile.name}:`, error);
        }
      }
    }
    
    // If no file with content was found, use the first file as fallback
    if (!bestFiles.find(file => filesByStudent[studentId].includes(file))) {
      bestFiles.push(studentFiles[0]);
    }
  }
  
  return bestFiles.length > 0 ? bestFiles[0] : null;
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

// Export the docx utility function
export { extractTextFromDOCX } from './docxUtils';
