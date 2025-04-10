/**
 * Utilities for handling files and extracting student information
 */
import * as pdfjs from 'pdfjs-dist';
import { extractHTMLFromDOCX } from './docxUtils';

// Set the worker URL for PDF.js
// Try multiple CDNs and also provide a bundled fallback option
const trySetPdfWorker = () => {
  try {
    // Define multiple potential worker URLs to try
    const potentialWorkerSources = [
      // Use unpkg as primary source
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
      // Fallback to jsdelivr
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
      // Original cdnjs as last resort
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
    ];
    
    // Use the first worker source
    pdfjs.GlobalWorkerOptions.workerSrc = potentialWorkerSources[0];
    console.log(`PDF.js worker set to: ${potentialWorkerSources[0]}`);
    
    // Pre-fetch the worker to check if it's available
    fetch(potentialWorkerSources[0], { method: 'HEAD' })
      .catch(() => {
        console.warn(`Primary PDF.js worker source failed, trying fallback...`);
        // If the first worker fails, try the second one
        pdfjs.GlobalWorkerOptions.workerSrc = potentialWorkerSources[1];
        console.log(`PDF.js worker set to fallback: ${potentialWorkerSources[1]}`);
        
        // Pre-fetch the second worker
        return fetch(potentialWorkerSources[1], { method: 'HEAD' });
      })
      .catch(() => {
        console.warn(`Secondary PDF.js worker source failed, trying last resort...`);
        // If the second worker fails, try the third one
        pdfjs.GlobalWorkerOptions.workerSrc = potentialWorkerSources[2];
        console.log(`PDF.js worker set to last resort: ${potentialWorkerSources[2]}`);
      });
  } catch (error) {
    console.error("Error setting PDF.js worker:", error);
  }
};

// Initialize the PDF worker
trySetPdfWorker();

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
 * Extract text from a PDF file with fallback mechanisms
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log(`Attempting to extract text from PDF: ${file.name} (${file.size} bytes)`);
    
    // Store the arrayBuffer for potential retries
    const arrayBuffer = await file.arrayBuffer();
    
    // Attempt extraction with current worker configuration
    try {
      console.log("Starting PDF extraction with configured worker");
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
      }
      
      console.log(`Successfully extracted ${fullText.length} characters from PDF`);
      return fullText;
    } catch (workerError) {
      // If worker fails, try alternative CDN sources
      console.error("PDF.js worker error:", workerError);
      console.log("Attempting to use alternative PDF worker source...");
      
      // Try another CDN
      const alternativeWorkerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
      pdfjs.GlobalWorkerOptions.workerSrc = alternativeWorkerSrc;
      console.log(`Switched PDF.js worker to: ${alternativeWorkerSrc}`);
      
      try {
        // Retry with new worker source
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          
          fullText += pageText + '\n\n';
        }
        
        console.log(`Successfully extracted ${fullText.length} characters from PDF with alternative worker`);
        return fullText;
      } catch (retryError) {
        console.error("Alternative PDF worker also failed:", retryError);
        throw retryError; // Throw to trigger final fallback
      }
    }
  } catch (error) {
    console.error('All PDF extraction methods failed:', error);
    // Last resort: try to extract text directly from the raw bytes
    try {
      const text = await extractTextFromRawFile(file);
      if (text && text.length > 50) {
        console.log(`Extracted ${text.length} characters from PDF using raw text fallback`);
        return text;
      }
    } catch (fallbackError) {
      console.error("Raw text extraction fallback also failed:", fallbackError);
    }
    
    return `[Unable to extract text from PDF file: ${file.name}. The PDF might be scanned or protected.]`;
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
