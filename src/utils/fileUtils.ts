import { extractTextFromPDF } from './pdfUtils';
import { extractTextFromDOCX, extractHTMLFromDOCX } from './docxUtils';
import { extractTextFromImage } from './imageUtils';
import { processZipFile as extractFilesFromZip } from './zipUtils';
import { parseSpreadsheetData, uploadMoodleGradebook, generateMoodleCSV, downloadCSV } from './csvUtils';
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
  } else if (fileType.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    return extractTextFromSpreadsheet(file);
  } else if (fileType.includes('xml') || file.name.endsWith('.xml')) {
    return extractTextFromXML(file);
  } else {
    // Default: try to read as text
    return extractTextFromTXT(file);
  }
}

/**
 * Extract student information from file name
 * This function parses common Moodle file naming patterns
 */
export function extractStudentInfoFromFilename(filename: string): { identifier: string, fullName: string, email: string } {
  // Common Moodle naming patterns:
  // Format 1: John_Doe_assignsubmission_file_JohnDoe_Essay.pdf
  // Format 2: johndoe_12345_assignsubmission_file.html
  // Format 3: johndoe_1234567_onlinetext.html
  
  let identifier = '';
  let fullName = '';
  let email = '';
  
  // Process filename
  const cleanedFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  
  // Try to extract student ID - look for patterns like numeric ID or username
  const idMatch = cleanedFilename.match(/[a-z0-9._-]+_(\d+)_/i);
  if (idMatch && idMatch[1]) {
    identifier = idMatch[1];
  } else {
    // Fall back to first part before underscore as identifier
    identifier = cleanedFilename.split('_')[0];
  }
  
  // Try to extract full name using common patterns
  if (cleanedFilename.includes('assignsubmission')) {
    // Format 1: Extract name from beginning
    const nameParts = cleanedFilename.split('_assignsubmission')[0].split('_');
    fullName = nameParts.join(' ');
  } else if (cleanedFilename.includes('onlinetext')) {
    // Format 3: For onlinetext submissions
    const namePart = cleanedFilename.split('_onlinetext')[0];
    const lastId = namePart.lastIndexOf('_');
    fullName = lastId > 0 ? namePart.substring(0, lastId).replace(/_/g, ' ') : namePart.replace(/_/g, ' ');
  } else {
    // General case: use first part of filename and convert underscores to spaces
    fullName = cleanedFilename.split('_')[0].replace(/([A-Z])/g, ' $1').trim();
  }
  
  // Clean up full name (capitalize first letter of each word)
  fullName = fullName.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Generate email using identifier
  if (identifier.match(/^\d+$/)) {
    // If identifier is numeric, use name for email
    const emailBase = fullName.toLowerCase().replace(/\s+/g, '.');
    email = `${emailBase}@example.com`;
  } else {
    // Otherwise use identifier for email
    email = `${identifier}@example.com`;
  }
  
  return { identifier, fullName, email };
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
 * Extract text from XML file
 */
async function extractTextFromXML(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        // Create a DOM parser and parse the XML
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/xml');
        
        // Extract text content from the XML
        const textContent = doc.documentElement.textContent || '';
        
        // Clean up whitespace
        const cleanedText = textContent
          .replace(/\s+/g, ' ')
          .trim();
          
        resolve(cleanedText);
      } catch (error) {
        console.error('Error extracting text from XML:', error);
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Placeholder for extracting text from spreadsheet files
 * This requires a library for parsing Excel files
 */
async function extractTextFromSpreadsheet(file: File): Promise<string> {
  // For now, we'll use a simple text extraction
  // In a real implementation, we would use a library like xlsx or exceljs
  return extractTextFromTXT(file);
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
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls': return 'application/vnd.ms-excel';
    case 'xml': return 'application/xml';
    case 'ods': return 'application/vnd.oasis.opendocument.spreadsheet';
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
 * Prioritizes files with content over empty files and non-onlinetext files over onlinetext files
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
    
    // First, separate onlinetext HTML files from other files
    const onlineTextFiles = studentFiles.filter(file => file.name.includes('onlinetext'));
    const otherFiles = studentFiles.filter(file => !file.name.includes('onlinetext'));
    
    // If there are non-onlinetext files, prioritize them first
    if (otherFiles.length > 0) {
      // Prefer PDF, DOCX, DOC over other formats
      const preferredFile = otherFiles.find(file => 
        file.name.endsWith('.pdf') || 
        file.name.endsWith('.docx') || 
        file.name.endsWith('.doc')
      ) || otherFiles[0];
      
      // Check if the preferred file has content
      try {
        const content = await extractTextFromFile(preferredFile);
        if (content.trim().length > 0) {
          bestFiles.push(preferredFile);
          continue; // Found a non-empty non-onlinetext file, use it and skip to next student
        }
      } catch (error) {
        console.error(`Error extracting text from ${preferredFile.name}:`, error);
      }
    }
    
    // If we're here, either there were no non-onlinetext files or they were all empty
    // Now check onlinetext files, but only if they have content
    if (onlineTextFiles.length > 0) {
      for (const htmlFile of onlineTextFiles) {
        try {
          const content = await extractTextFromHTML(htmlFile);
          if (content.trim().length > 0) {
            bestFiles.push(htmlFile);
            break; // Use the first non-empty onlinetext file
          }
        } catch (error) {
          console.error(`Error extracting text from ${htmlFile.name}:`, error);
        }
      }
    }
    
    // If we haven't found any file with content, use the first non-onlinetext file as a fallback
    if (!bestFiles.find(file => filesByStudent[studentId].includes(file))) {
      if (otherFiles.length > 0) {
        bestFiles.push(otherFiles[0]);
      } else if (onlineTextFiles.length > 0) {
        bestFiles.push(onlineTextFiles[0]);
      }
    }
  }
  
  return bestFiles.length > 0 ? bestFiles[0] : null;
}

/**
 * Extract text from TXT file
 */
export async function extractTextFromTXT(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string || '';
      resolve(text);
    };
    reader.readAsText(file);
  });
}

// Re-export functions from other utility files for convenience
export {
  uploadMoodleGradebook,
  parseMoodleCSV,
  generateMoodleCSV,
  downloadCSV
} from './csvUtils';

export { gradeWithOpenAI } from './gradingUtils';

// Export the docx utility functions
export { extractTextFromDOCX, extractHTMLFromDOCX } from './docxUtils';
