/**
 * Utilities for handling files and extracting student information
 */
import * as pdfjs from 'pdfjs-dist';
import { extractHTMLFromDOCX } from './docxUtils';

// Set the worker URL for PDF.js
const PDFJS_WORKER_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

/**
 * Extract text content from a file based on type
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  console.log(`Extracting text from file: ${fileName}, type: ${fileType}`);
  
  // For PDF files
  if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
    console.log("Processing as PDF file");
    return extractTextFromPDF(file);
  }
  
  // For DOCX files
  if (fileType.includes('docx') || fileName.endsWith('.docx')) {
    console.log("Processing as DOCX file");
    try {
      // First try to get HTML content to preserve formatting
      const htmlContent = await extractHTMLFromDOCX(file);
      console.log("Successfully extracted HTML from DOCX with length:", htmlContent.length);
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
    console.log("Processing as HTML file");
    return extractTextFromHTML(file);
  }
  
  // Default text extraction
  console.log("Processing as generic text file");
  return extractTextFromRawFile(file);
}

/**
 * Extract text from a PDF file
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    console.log(`PDF has ${pdf.numPages} pages, extracting text...`);
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    console.log(`Extracted ${fullText.length} characters from PDF`);
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
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
          console.log(`Extracted HTML content with length: ${html.length}`);
          // Return the raw HTML to preserve formatting
          resolve(html);
        } else {
          console.warn("HTML extraction resulted in empty content");
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
        console.log(`Extracted raw text with length: ${text ? text.length : 0}`);
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
