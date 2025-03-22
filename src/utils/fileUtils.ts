
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
 * Extract student information from file name or folder path
 * This function parses common Moodle file naming patterns and folder structures
 */
export function extractStudentInfoFromFilename(filename: string, folderPath?: string): { identifier: string, fullName: string, email: string } {
  let identifier = '';
  let fullName = '';
  let email = '';
  
  // First, try to extract information from folder path if available
  if (folderPath && folderPath !== '' && folderPath !== 'root') {
    console.log(`Extracting student info from folder path: "${folderPath}"`);
    
    // Fix for folders with "onlinetext" in them
    // If the folder contains "onlinetext", we need to handle it differently
    const isOnlineText = folderPath.includes('onlinetext');
    
    // Clean up folder path (remove path separators)
    const folderName = folderPath.split('/').pop() || '';
    console.log(`Processing folder name: "${folderName}"`);
    
    // IMPROVED EXTRACTION LOGIC FOR ONLINE TEXT SUBMISSIONS
    if (isOnlineText) {
      // For online text submissions, extract student name part before "_assignsubmission_onlinetext"
      const onlineTextMatch = folderName.match(/^(.+?)_assignsubmission_onlinetext/);
      if (onlineTextMatch && onlineTextMatch[1]) {
        fullName = onlineTextMatch[1].replace(/_/g, ' ').trim();
        console.log(`Extracted name from onlinetext folder: "${fullName}"`);
        
        // Properly format the name for comparison with gradebook
        fullName = fullName.split(' ')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
        
        // Check if the name might be in "Last, First" format
        if (fullName.includes(',')) {
          const nameParts = fullName.split(',').map(part => part.trim());
          if (nameParts.length === 2) {
            fullName = `${nameParts[1]} ${nameParts[0]}`;
            console.log(`Converted "Last, First" format to "${fullName}"`);
          }
        }
        
        return {
          identifier: fullName.replace(/\s+/g, '').toLowerCase(),
          fullName: fullName,
          email: `${fullName.replace(/\s+/g, '.').toLowerCase()}@example.com`
        };
      }
    }
    
    // Pattern 1: First Last_12345_ format
    let nameMatch = folderName.match(/^([^_]+(?:\s[^_]+)*)/);
    if (nameMatch && nameMatch[1] && nameMatch[1].includes(' ')) {
      fullName = nameMatch[1].trim();
      console.log(`Found name with space in folder name: "${fullName}"`);
      
      // Properly format the name for comparison with gradebook
      fullName = fullName.split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
      
      return {
        identifier: identifier || fullName.replace(/\s+/g, '').toLowerCase(),
        fullName: fullName,
        email: `${fullName.replace(/\s+/g, '.').toLowerCase()}@example.com`
      };
    }
    
    // Pattern 2: Last, First format
    nameMatch = folderName.match(/^([^,]+),\s*([^_]+)/);
    if (nameMatch && nameMatch[1] && nameMatch[2]) {
      const lastName = nameMatch[1].trim();
      const firstName = nameMatch[2].trim();
      fullName = `${firstName} ${lastName}`;
      console.log(`Found Last, First format: "${fullName}"`);
      
      // Properly format the name
      fullName = fullName.split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
      
      return {
        identifier: fullName.replace(/\s+/g, '').toLowerCase(),
        fullName: fullName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
      };
    }
    
    // Pattern 3: LAST_FIRST format or general *_assignsubmission_* format
    const assignSubmissionMatch = folderName.match(/^(.+?)_assignsubmission_/);
    if (assignSubmissionMatch && assignSubmissionMatch[1]) {
      const namePart = assignSubmissionMatch[1];
      
      // Check if it has an ID segment (like "Smith_John_12345_assignsubmission")
      const idMatch = namePart.match(/^(.*?)_(\d+)$/);
      
      if (idMatch && idMatch[1]) {
        // Has ID, use the part before the ID
        fullName = idMatch[1].replace(/_/g, ' ').trim();
      } else {
        // No ID, use the whole part before "_assignsubmission_"
        fullName = namePart.replace(/_/g, ' ').trim();
      }
      
      console.log(`Extracted name from assignsubmission pattern: "${fullName}"`);
      
      // Properly format the name
      fullName = fullName.split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
      
      return {
        identifier: fullName.replace(/\s+/g, '').toLowerCase(),
        fullName: fullName,
        email: `${fullName.replace(/\s+/g, '.').toLowerCase()}@example.com`
      };
    }
    
    // If previous patterns failed, try a more general approach
    // Replace common separators with spaces
    const normalizedFolderName = folderName.replace(/[_-]/g, ' ');
    const words = normalizedFolderName.split(/\s+/);
    
    // Try to extract name parts (likely in the beginning)
    if (words.length >= 2) {
      // Use first two words as name if they don't look like numbers or codes
      if (!/^\d+$/.test(words[0]) && !/^\d+$/.test(words[1])) {
        const nameCandidate = `${words[0]} ${words[1]}`;
        if (nameCandidate.length > 3) {
          fullName = nameCandidate;
          console.log(`Extracted name candidate from folder: "${fullName}"`);
          
          // Properly format the name
          fullName = fullName.split(' ')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
          
          return {
            identifier: fullName.replace(/\s+/g, '').toLowerCase(),
            fullName: fullName,
            email: `${words[0].toLowerCase()}.${words[1].toLowerCase()}@example.com`
          };
        }
      }
    }
    
    // If we've reached here, we'll just use the folder name as-is for fullName
    if (folderName.length > 0) {
      // Clean up the folder name - replace separators with spaces
      const cleanedName = folderName.replace(/[_-]/g, ' ').trim();
      
      // Filter out common Moodle keywords
      const nameParts = cleanedName.split(/\s+/)
        .filter(part => !part.includes('assign') && 
                       !part.includes('submission') && 
                       !part.includes('file') && 
                       !part.includes('onlinetext') && 
                       !/^\d+$/.test(part));
      
      if (nameParts.length > 0) {
        fullName = nameParts.join(' ');
        console.log(`Using cleaned folder name as fallback: "${fullName}"`);
        
        // Properly format the name
        fullName = fullName.split(' ')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
      } else {
        // Last resort: use the raw folder name
        fullName = cleanedName;
        console.log(`Using raw folder name as last resort: "${fullName}"`);
      }
      
      return {
        identifier: fullName.replace(/\s+/g, '').toLowerCase(),
        fullName: fullName,
        email: `${fullName.replace(/\s+/g, '.').toLowerCase()}@example.com`
      };
    }
  }
  
  // If folder path didn't yield a proper name, process filename
  const cleanedFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  
  // Special handling for onlinetext filenames
  if (cleanedFilename.includes('onlinetext')) {
    // For online text submissions, extract student name part before "_onlinetext"
    const onlineTextMatch = cleanedFilename.match(/^(.+?)_onlinetext/);
    if (onlineTextMatch && onlineTextMatch[1]) {
      const namePart = onlineTextMatch[1];
      // Check if the name part has an ID segment
      const idMatch = namePart.match(/^(.*?)_(\d+)$/);
      if (idMatch && idMatch[1]) {
        fullName = idMatch[1].replace(/_/g, ' ').trim();
      } else {
        fullName = namePart.replace(/_/g, ' ').trim();
      }
      
      console.log(`Extracted name from onlinetext filename: "${fullName}"`);
      
      // Properly format the name
      fullName = fullName.split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
      
      return {
        identifier: fullName.replace(/\s+/g, '').toLowerCase(),
        fullName: fullName,
        email: `${fullName.replace(/\s+/g, '.').toLowerCase()}@example.com`
      };
    }
  }
  
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
