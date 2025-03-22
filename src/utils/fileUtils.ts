
/**
 * Utilities for handling files and extracting student information
 */

import { StudentInfo } from './nameMatchingUtils';

/**
 * Extract student information from a filename
 */
export function extractStudentInfoFromFilename(fileName: string, folderPath?: string): StudentInfo {
  try {
    // Prioritize folder path for student name extraction since it typically contains the student name
    const sourcePath = folderPath || fileName;
    
    if (!sourcePath) {
      return { identifier: '', fullName: '' };
    }
    
    // Log the path we're processing
    console.log(`Extracting student info from: "${sourcePath}"`);
    
    // Remove common Moodle suffixes and prefixes
    let cleanName = sourcePath
      .replace(/^.*[\/\\]/, '') // Remove any directory path before the filename
      .replace(/_assignsubmission_.*$/, '')
      .replace(/_onlinetext_.*$/, '')
      .replace(/_file_.*$/, '')
      .replace(/^\d+SP\s+/, ''); // Remove semester prefix like "25SP "
      
    // Look for Moodle ID pattern (typically after the student name)
    const idMatch = cleanName.match(/_(\d+)$/);
    const studentId = idMatch ? idMatch[1] : '';
    
    // Remove the ID part for the name
    if (studentId) {
      cleanName = cleanName.replace(/_\d+$/, '');
    }
    
    // Replace separators with spaces
    cleanName = cleanName.replace(/[_\-]/g, ' ').trim();
    
    // Try to extract course info
    if (cleanName.match(/^[A-Z]{3}-\d{3}/)) {
      // This looks like a course code (e.g., "SOC-395-A"), remove it
      cleanName = cleanName.replace(/^[A-Z]{3}-\d{3}-[A-Z]\s*/, '');
      // Also remove anything after a dash followed by numbers (assignment info)
      cleanName = cleanName.replace(/-\d+.*$/, '').trim();
    }
    
    // Handle "Last, First" format if present
    let firstName = '';
    let lastName = '';
    
    if (cleanName.includes(',')) {
      const parts = cleanName.split(',').map(p => p.trim());
      if (parts.length === 2) {
        firstName = parts[1];
        lastName = parts[0];
        cleanName = `${firstName} ${lastName}`;
      }
    } else if (cleanName.includes(' ')) {
      // Simple first/last name extraction for "First Last" format
      const parts = cleanName.split(' ');
      firstName = parts[0];
      lastName = parts[parts.length - 1];
    }
    
    // Generate email based on first and last name if both are present
    let email = '';
    if (firstName && lastName) {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    } else {
      email = `${cleanName.replace(/\s+/g, '.').toLowerCase()}@example.com`;
    }
    
    console.log(`Extracted student info: name="${cleanName}", ID=${studentId || 'none'}, First="${firstName || 'unknown'}", Last="${lastName || 'unknown'}"`);
    
    return {
      identifier: studentId || cleanName.replace(/\s+/g, '').toLowerCase(),
      fullName: cleanName,
      firstName: firstName,
      lastName: lastName,
      email: email
    };
  } catch (error) {
    console.error("Error extracting student info from filename:", error);
    return { identifier: '', fullName: '' };
  }
}

/**
 * Find the best submission file to grade from a list of files
 */
export function findBestSubmissionFile(files: File[]): File | null {
  if (!files || files.length === 0) {
    return null;
  }
  
  // Prioritize files that are not "onlinetext" or HTML files
  const nonHtmlFiles = files.filter(file => !file.name.includes('onlinetext') && !file.type.includes('html'));
  if (nonHtmlFiles.length > 0) {
    // If there are multiple non-HTML files, you might want to add more sophisticated logic
    // such as prioritizing certain file extensions (e.g., .pdf, .docx)
    return nonHtmlFiles[0];
  }
  
  // If no non-HTML files are found, fall back to "onlinetext" or HTML files
  const htmlFiles = files.filter(file => file.name.includes('onlinetext') || file.type.includes('html'));
  if (htmlFiles.length > 0) {
    return htmlFiles[0];
  }
  
  // If no "onlinetext" or HTML files are found, return the first file in the array
  return files[0];
}

/**
 * Extract text from an HTML file
 */
export async function extractTextFromHTML(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const htmlContent = event.target?.result as string;
      
      // Create a temporary DOM element to parse the HTML content
      const tempElement = document.createElement('div');
      tempElement.innerHTML = htmlContent;
      
      // Extract the text content from the parsed HTML
      const textContent = tempElement.textContent || tempElement.innerText || "";
      
      resolve(textContent);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
}

/**
 * Generic text extraction from various file types
 */
export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      resolve(text);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
}
