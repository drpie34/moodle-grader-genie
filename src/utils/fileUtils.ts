/**
 * Utilities for handling files and extracting student information
 */
import * as pdfjs from 'pdfjs-dist';
import { extractHTMLFromDOCX } from './docxUtils';

// Create a blob URL for the PDF.js worker directly in the browser
// This eliminates dependency on external CDNs that may be blocked
const createPdfWorkerFallback = () => {
  // Simple worker implementation that does the bare minimum for text extraction
  const workerScript = `
    // Minimal PDF.js worker implementation
    self.onmessage = function(event) {
      const data = event.data;
      
      if (data.action === "pdfjs-initialize") {
        self.postMessage({ action: "pdfjs-initialize-response", initialized: true, version: "2.10.377" });
      } else if (data.action === "pdfjs-gettext") {
        // This is a simplified extraction that works for many PDFs
        const pdf = new Uint8Array(data.data);
        let text = "";
        
        // Simple text extraction from PDF binary
        for (let i = 0; i < pdf.length - 5; i++) {
          // Check for text markers in PDF
          if (pdf[i] === 40 && pdf[i + 1] === 84) { // '(T'
            let str = "";
            let j = i + 2;
            while (j < pdf.length && pdf[j] !== 41) { // ')'
              if (pdf[j] >= 32 && pdf[j] < 127) {
                str += String.fromCharCode(pdf[j]);
              }
              j++;
            }
            if (str.length > 2) {
              text += str + " ";
            }
            i = j;
          }
        }
        
        self.postMessage({ 
          action: "pdfjs-gettext-response", 
          text: text || "[PDF text extraction fallback: Limited capabilities]"
        });
      }
    };
  `;
  
  // Create a blob URL from the worker script
  const blob = new Blob([workerScript], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
};

// Set up the PDF.js worker - try multiple approaches
try {
  // Approach 1: Set the worker path directly
  const workerPath = `/node_modules/pdfjs-dist/build/pdf.worker.min.js`;
  pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
  console.log(`PDF.js worker path set to: ${workerPath}`);
  
  // Pre-fetch to check if it will work
  fetch(workerPath, { method: 'HEAD' })
    .then(() => {
      console.log("PDF.js worker is available at the specified path");
    })
    .catch(() => {
      console.warn("PDF.js worker not found at specified path, trying fallbacks...");
      
      // Approach 2: Try unpkg CDN (more reliable than cdnjs)
      const cdnPath = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
      pdfjs.GlobalWorkerOptions.workerSrc = cdnPath;
      console.log(`PDF.js worker set to CDN path: ${cdnPath}`);
      
      // Pre-fetch the CDN worker
      fetch(cdnPath, { method: 'HEAD' })
        .catch(() => {
          console.warn("CDN worker not available either, using in-browser fallback");
          
          // Approach 3: Create worker in-browser as final fallback
          const fallbackWorkerUrl = createPdfWorkerFallback();
          pdfjs.GlobalWorkerOptions.workerSrc = fallbackWorkerUrl;
          console.log("PDF.js using in-browser worker fallback");
        });
    });
} catch (error) {
  console.error("Error configuring PDF.js worker:", error);
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
 * Extract text from a PDF file with multiple fallback mechanisms
 */
async function extractTextFromPDF(file: File): Promise<string> {
  console.log(`Attempting to extract text from PDF: ${file.name} (${file.size} bytes)`);
  
  // Store the arrayBuffer for repeated use
  const arrayBuffer = await file.arrayBuffer();
  
  // APPROACH 1: First try the standard PDF.js extraction
  try {
    console.log("Attempting PDF extraction with PDF.js");
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await Promise.race([
      loadingTask.promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("PDF loading timeout after 5 seconds")), 5000)
      )
    ]);
    
    console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
    
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
      return fullText;
    } else {
      console.log("PDF.js extraction returned empty text, trying fallback methods");
    }
  } catch (pdfJsError) {
    console.error("PDF.js extraction failed:", pdfJsError);
  }
  
  // APPROACH 2: Simple text extraction for PDFs that might have plain text embedded
  try {
    console.log("Trying simple text extraction as fallback");
    let text = await extractTextFromRawFile(file);
    
    // Clean up PDF binary garbage
    if (text.startsWith('%PDF')) {
      // This looks like binary PDF data, let's try to clean it up
      text = text.replace(/%PDF[^]*?stream/g, '')
                .replace(/endstream[^]*?endobj/g, '')
                .replace(/<<[^]*?>>/g, '')
                .replace(/[^\x20-\x7E\s]/g, ' ') // Keep only ASCII printable chars
                .replace(/\s+/g, ' ')
                .trim();
      
      // Check if we have meaningful text after cleanup
      if (text.length > 100 && text.split(' ').length > 20) {
        console.log(`Extracted ${text.length} characters using simple text cleanup`);
        return text;
      }
    }
    
    console.log("Simple text extraction didn't yield usable results");
  } catch (textExtractionError) {
    console.error("Text extraction fallback failed:", textExtractionError);
  }
  
  // APPROACH 3: Last resort - return a user-friendly message with instructions
  console.log("All PDF extraction methods failed for this file");
  return `[Could not extract text from PDF file "${file.name}". Please convert the PDF to text or Word format and try again.]`;
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
