/**
 * Utilities for handling files and extracting student information
 */
import * as pdfjs from 'pdfjs-dist';
import { extractHTMLFromDOCX } from './docxUtils';

// CRITICAL: Force PDF.js to use the built-in fake worker option to avoid CORS issues in local development
// This is essential for localhost testing where external worker files can't be loaded due to CORS restrictions
console.log("Setting up PDF.js with fake worker to avoid CORS issues");

// When running locally, we'll always use the fake worker approach
// This bypasses the need to load external worker files completely
pdfjs.GlobalWorkerOptions.workerSrc = '';
(window as any).pdfjsWorkerSrc = '';

// Explicitly disable workers to prevent any attempts to load external files
(pdfjs as any).disableWorker = true;
(pdfjs as any).GlobalWorkerOptions.disableWorker = true;

console.log("PDF.js configured to use fake worker - no external files needed");

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
  try {
    console.log(`Processing PDF file: ${file.name} (${file.size} bytes)`);
    
    // Try extraction with PDF.js fake worker mode
    try {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF with a timeout to prevent hanging
      console.log("Loading PDF document with fake worker mode...");
      const pdf = await Promise.race([
        pdfjs.getDocument({ data: arrayBuffer }).promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("PDF loading timeout")), 10000))
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
      
      if (fullText.trim().length > 0) {
        console.log(`Successfully extracted ${fullText.length} characters from PDF`);
        return fullText.trim();
      } else {
        console.log("PDF.js extraction produced empty result, trying fallback");
      }
    } catch (pdfJsError) {
      console.error("PDF.js extraction failed:", pdfJsError);
    }
    
    // Fallback to direct text extraction if PDF.js fails
    console.log("Using direct text extraction fallback for PDF");
    try {
      const text = await extractTextFromRawFile(file);
      // Try to extract only meaningful text from the PDF
      let cleanedText = text
        .replace(/%PDF.*?%%EOF/gs, '') // Remove PDF header and EOF marker
        .replace(/<<.*?>>/gs, '') // Remove PDF dictionary objects
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // If we got some reasonable text, use it
      if (cleanedText.length > 100) {
        console.log(`Extracted ${cleanedText.length} characters using direct extraction`);
        return cleanedText;
      }
    } catch (fallbackError) {
      console.error("Fallback extraction failed:", fallbackError);
    }
    
    // If all methods fail, return a message
    return `[Unable to extract text from PDF file: ${file.name}. The PDF might be scanned or protected.]`;
  } catch (error) {
    console.error("PDF extraction failed completely:", error);
    return `[Error processing PDF: ${error instanceof Error ? error.message : String(error)}]`;
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
