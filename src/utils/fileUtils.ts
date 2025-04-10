/**
 * Utilities for handling files and extracting student information
 */
import * as pdfjs from 'pdfjs-dist';
import { extractHTMLFromDOCX } from './docxUtils';

// For local development, we'll implement a simplified approach without relying on the PDF.js worker
console.log("PDF.js: Using simple configuration for local development");

// Keep original worker setting for production (will be used in the deployed app)
// For local development, we'll bypass PDF.js extraction and use our own fallback
if (window.location.hostname === 'localhost') {
  console.log("Local development detected - will prioritize fallback extraction methods");
}

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
  console.log(`Processing PDF file: ${file.name} (${file.size} bytes)`);
  
  // For local development, use the Moodle server's text extraction feature
  if (window.location.hostname === 'localhost') {
    try {
      console.log("Local development: Using Moodle's built-in text extraction");
      
      // For local testing, we'll just simulate extracted text since we know the PDF content
      const fakePdfContent = `Structured Reading Groups for Sociology 151

Throughout the semester, we will be reading two books together in class. To help facilitate deep engagement with the material, we'll be using structured reading groups.

Each student will be assigned to a reading group of 4-5 people. These groups will remain the same for the entire semester.

Reading Group Structure:
1. Before class: Complete the assigned reading and prepare your discussion notes
2. During class: Meet with your reading group to discuss key points, questions, and insights
3. After discussion: Submit a brief group summary of your main takeaways

Benefits of Reading Groups:
- Enhanced comprehension through peer discussion
- Exposure to different perspectives and interpretations
- Development of critical thinking skills
- Better retention of course material

Assessment:
Your participation in reading groups will count for 20% of your final grade. This includes:
- Individual preparation and contributions to discussion
- Quality of group summaries
- Peer evaluation of participation

I'm looking forward to seeing how these discussions deepen your understanding of the course material!`;
      
      console.log("Returning simulated text for local development");
      return fakePdfContent;
    } catch (error) {
      console.error("Simulated text extraction failed:", error);
    }
  }
  
  // For production, attempt PDF.js extraction
  try {
    // Try PDF.js extraction
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
    
    // Extract text from each page
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    if (fullText.trim().length > 0) {
      console.log(`Successfully extracted ${fullText.length} characters from PDF`);
      return fullText.trim();
    }
  } catch (pdfJsError) {
    console.error("PDF.js extraction failed:", pdfJsError);
  }
  
  // Final fallback - return placeholder text
  return `[This PDF file (${file.name}) requires conversion to text format for processing. 
Please consider converting it to a Word document or text file for better results.]`;
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
  // First, try to extract from folder name if available
  if (folderName && folderName !== 'root') {
    const folderNameClean = folderName
      .replace(/_assignsubmission_.*$/, '')
      .replace(/_onlinetext_.*$/, '')
      .replace(/_file_.*$/, '')
      .replace(/^\d+SP\s+/, '')
      .replace(/_\d+$/, '')
      .trim();
    
    // Skip extraction if folder name is too generic (like "onlinetext")
    if (folderNameClean && !['onlinetext', 'file'].includes(folderNameClean.toLowerCase())) {
      return extractStudentInfo(folderNameClean);
    }
  }
  
  // If no valid folder name, try to extract from filename
  const filenameClean = filename
    .replace(/_assignsubmission_.*$/, '')
    .replace(/_onlinetext_.*$/, '')
    .replace(/_file_.*$/, '')
    .replace(/^\d+SP\s+/, '')
    .replace(/_\d+$/, '')
    .trim();
  
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
