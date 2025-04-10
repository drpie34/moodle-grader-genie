/**
 * Utilities for handling files and extracting student information
 */
import * as pdfjs from 'pdfjs-dist';
import { extractHTMLFromDOCX } from './docxUtils';

// No longer needed - using built-in fake worker mode for simplicity

// CRITICAL: Setup PDF.js to work without an external worker
// This is the most reliable solution for PDF text extraction
console.log("Setting up PDF.js with fake worker (most reliable option)");

// Force PDF.js to use a fake worker, which doesn't require external files
pdfjs.GlobalWorkerOptions.workerSrc = '';
// This tells PDF.js to use a fake worker implementation within the main thread
(pdfjs as any).disableWorker = true;

// Log the configuration for debugging
console.log("PDF.js configured to use fake worker directly in main thread");
console.log("PDF.js version:", pdfjs.version);

/**
 * Extract text content from a file based on type
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // For PDF files
  if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }
  
  // For DOCX files
  if (fileType.includes('docx') || fileName.endsWith('.docx')) {
    try {
      // First try to get HTML content to preserve formatting
      const htmlContent = await extractHTMLFromDOCX(file);
      // Strip HTML tags to get plain text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      return tempDiv.textContent || '';
    } catch (error) {
      console.error("Error extracting text from DOCX using mammoth:", error);
      // Fall back to text extraction
      return extractTextFromRawFile(file);
    }
  }
  
  // For HTML files
  if (fileType.includes('html') || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    return extractTextFromHTML(file);
  }
  
  // Default text extraction
  return extractTextFromRawFile(file);
}

/**
 * Extract text from a PDF file
 */
async function extractTextFromPDF(file: File): Promise<string> {
  console.log(`Attempting to extract text from PDF: ${file.name} (${file.size} bytes)`);
  
  try {
    // Read the PDF file into an array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    console.log("Loading PDF document with PDF.js");
    
    // Use a timeout to prevent hanging on problematic PDFs
    const pdf = await Promise.race([
      pdfjs.getDocument({ data: arrayBuffer }).promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("PDF loading timeout")), 10000)
      )
    ]);
    
    console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
    
    // Extract text from each page
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
      } catch (pageError) {
        console.warn(`Error extracting text from page ${i}:`, pageError);
      }
    }
    
    // If we extracted meaningful text, return it
    if (fullText.trim().length > 50) {
      console.log(`Successfully extracted ${fullText.length} characters from PDF`);
      return fullText;
    }
    
    throw new Error("PDF.js extraction yielded insufficient text");
  } catch (error) {
    console.error("PDF.js extraction failed:", error);
    
    // If PDF.js failed, offer a user-friendly message
    return `[Note: Unable to extract text from "${file.name}". For best results, please convert the PDF to a Word document or text file and upload again.]`;
  }
}

/**
 * Extract and process HTML content from a file
 */
export async function extractTextFromHTML(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const html = e.target?.result as string;
        
        if (html) {
          // Return the raw HTML to preserve formatting
          resolve(html);
        } else {
          resolve('');
        }
      } catch (error) {
        console.error('Error processing HTML:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading HTML file:', error);
      reject(error);
    };
    
    reader.readAsText(file);
  });
}

/**
 * Extract text from a generic file as raw text
 */
async function extractTextFromRawFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(text || '');
      } catch (error) {
        console.error('Error extracting text from file:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      reject(error);
    };
    
    reader.readAsText(file);
  });
}

/**
 * Extract student information from a filename or folder name
 */
export function extractStudentInfoFromFilename(filename: string, folderName: string = ''): any {
  console.log(`Extracting student info from: folderName="${folderName}", filename="${filename}"`);
  
  // Function to extract student name from Moodle format
  const extractFromMoodleFormat = (str: string) => {
    // Check for standard Moodle format: "Name_12345_assignsubmission_xxx"
    const moodlePattern = /^(.+?)_(\d+)_assignsubmission_/;
    const moodleMatch = str.match(moodlePattern);
    
    if (moodleMatch) {
      // Use the first capture group which contains the student name
      console.log(`  → Moodle pattern matched in "${str}", extracted: "${moodleMatch[1]}"`);
      return moodleMatch[1].replace(/[_\-]/g, ' ').trim();
    }
    
    // Fallback to original cleaning pattern
    return str
      .replace(/_assignsubmission_.*$/, '')
      .replace(/_onlinetext_.*$/, '')
      .replace(/_file_.*$/, '')
      .replace(/^\d+SP\s+/, '')
      .replace(/_\d+$/, '')
      .trim();
  };
  
  // First, try to extract from folder name if available
  if (folderName && folderName !== 'root') {
    const folderNameClean = extractFromMoodleFormat(folderName);
    
    // Skip extraction if folder name is too generic (like "onlinetext")
    if (folderNameClean && !['onlinetext', 'file'].includes(folderNameClean.toLowerCase())) {
      console.log(`  → Using folder name: "${folderNameClean}"`);
      return extractStudentInfo(folderNameClean);
    }
  }
  
  // If no valid folder name, try to extract from filename
  const filenameClean = extractFromMoodleFormat(filename);
  console.log(`  → Using filename: "${filenameClean}"`);
  
  return extractStudentInfo(filenameClean);
}

/**
 * Helper function to extract student information from a cleaned name string
 */
function extractStudentInfo(nameStr: string): any {
  // Handle common formats like "Last, First" or "First Last"
  let firstName = '';
  let lastName = '';
  let fullName = nameStr;
  
  // Handle "Last, First" format
  if (nameStr.includes(',')) {
    const parts = nameStr.split(',').map(p => p.trim());
    lastName = parts[0];
    firstName = parts[1] || '';
    fullName = `${firstName} ${lastName}`;
  } 
  // Handle "First Last" format (simplified)
  else if (nameStr.includes(' ')) {
    const parts = nameStr.split(' ').map(p => p.trim());
    firstName = parts[0];
    lastName = parts.slice(1).join(' ');
  }
  
  return {
    fullName: fullName.replace(/\s+/g, ' ').trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: `${fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    identifier: fullName.replace(/\s+/g, '_').toLowerCase()
  };
}

/**
 * Find the best submission file from a set of files
 */
export function findBestSubmissionFile(files: File[]): File | null {
  if (!files || files.length === 0) return null;
  
  // Prioritize files that are likely to be actual student submissions
  const prioritizedFiles = [...files].sort((a, b) => {
    // Function to get priority score based on file type
    const getPriority = (file: File) => {
      const name = file.name.toLowerCase();
      const type = file.type.toLowerCase();
      
      // First priority: Known document types
      if (name.endsWith('.docx') || name.endsWith('.doc') || type.includes('word')) return 10;
      if (name.endsWith('.pdf') || type.includes('pdf')) return 9;
      if (name.includes('onlinetext') || name.endsWith('.html') || name.endsWith('.htm') || type.includes('html')) return 8;
      if (name.endsWith('.txt') || type.includes('text/plain')) return 7;
      
      // Lower priority for other common files
      if (name.endsWith('.ppt') || name.endsWith('.pptx') || type.includes('presentation')) return 6;
      if (name.endsWith('.xls') || name.endsWith('.xlsx') || type.includes('excel') || type.includes('spreadsheet')) return 5;
      
      // Lowest priority for other files
      return 0;
    };
    
    return getPriority(b) - getPriority(a);
  });
  
  return prioritizedFiles[0];
}
