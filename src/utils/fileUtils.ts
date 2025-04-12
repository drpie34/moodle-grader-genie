/**
 * Utilities for handling files and extracting student information
 */
import * as pdfjs from 'pdfjs-dist';
import { extractHTMLFromDOCX } from './docxUtils';
// Import the worker script first, as it's bundled via pdfUtils
import './pdfUtils';
import { isImageFile, processImageWithOpenAI, extractTextFromImage } from './imageUtils';

// Database name for file caching
const DB_NAME = 'moodle_grader_file_cache';
const STORE_NAME = 'file_metadata';

// Initialize the IndexedDB for file caching
export async function initFileDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB', event);
      reject('Could not open IndexedDB');
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store for file metadata
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('path', 'path', { unique: false });
      }
    };
  });
}

// Cache file metadata (not the file content itself)
export async function cacheFileMetadata(files: File[]): Promise<void> {
  try {
    const db = await initFileDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Clear previous cache
    store.clear();
    
    // Add file metadata to cache
    for (const file of files) {
      // Create a serializable object (without the actual file data)
      const fileMetadata = {
        id: `${file.name}_${file.size}_${file.lastModified}`,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        path: file.webkitRelativePath || file.name,
        timestamp: Date.now()
      };
      
      store.add(fileMetadata);
    }
    
    console.log(`Cached metadata for ${files.length} files in IndexedDB`);
    
    // Also store information in sessionStorage for faster access
    sessionStorage.setItem('moodle_grader_file_count', files.length.toString());
    
    // Store file paths for debugging
    const filePaths = files.map(f => f.webkitRelativePath || f.name);
    sessionStorage.setItem('moodle_grader_file_paths', JSON.stringify(filePaths.slice(0, 100)));
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => {
        console.error('Error caching file metadata', event);
        reject('Failed to cache file metadata');
      };
    });
  } catch (error) {
    console.error('Error in cacheFileMetadata:', error);
  }
}

// Retrieve cached file metadata
export async function getCachedFileMetadata(): Promise<any[]> {
  try {
    const db = await initFileDatabase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = (event) => {
        console.error('Error retrieving cached file metadata', event);
        reject('Failed to retrieve file metadata');
      };
    });
  } catch (error) {
    console.error('Error in getCachedFileMetadata:', error);
    return [];
  }
}

// Clear the file cache
export async function clearFileCache(): Promise<void> {
  try {
    const db = await initFileDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.clear();
    console.log('File metadata cache cleared');
    
    // Also clear from sessionStorage
    sessionStorage.removeItem('moodle_grader_file_count');
    sessionStorage.removeItem('moodle_grader_file_paths');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => {
        console.error('Error clearing file cache', event);
        reject('Failed to clear file cache');
      };
    });
  } catch (error) {
    console.error('Error in clearFileCache:', error);
  }
}

// Log PDF.js status, but don't override worker setup from pdfUtils.ts
console.log(`[fileUtils] PDF.js version: ${pdfjs.version}`);
console.log(`[fileUtils] PDF.js worker status:`, {
  workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
  workerSrcIsSet: !!pdfjs.GlobalWorkerOptions.workerSrc
});

// For local development, we'll also have a fallback method
if (window.location.hostname === 'localhost') {
  console.log("Local development detected - will have fallback extraction methods available");
}

/**
 * Extract text content from a file based on type
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // For image files - use OpenAI vision API
  if (isImageFile(file)) {
    console.log(`Processing image file: ${file.name} (${file.size} bytes)`);
    try {
      // First try using OpenAI's vision capabilities
      const prompt = "You are a teaching assistant grading a student's submission. " +
                    "Please extract all text from this image, preserve formatting where possible, " +
                    "and describe any diagrams, charts or visual elements that are relevant to academic grading. " +
                    "If you can't extract meaningful text, please state that this appears to be an image " +
                    "without substantial text content.";
      
      const oaiResult = await processImageWithOpenAI(file, prompt);
      
      if (oaiResult && !oaiResult.includes("Error processing image")) {
        return oaiResult;
      }
      
      // Fall back to Tesseract.js if OpenAI fails
      console.log("Falling back to Tesseract for image text extraction");
      return await extractTextFromImage(file);
    } catch (error) {
      console.error("Error processing image with OpenAI:", error);
      // Fall back to Tesseract.js if OpenAI fails
      try {
        return await extractTextFromImage(file);
      } catch (fallbackError) {
        console.error("Fallback image processing also failed:", fallbackError);
        return `[Image file detected: ${file.name}. Please review this submission manually.]`;
      }
    }
  }
  
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
  
  // Try real PDF.js extraction for all environments first
  try {
    // Log our setup to help debug
    console.log("PDF.js worker setup:", {
      workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
      version: pdfjs.version,
      isWorkerSet: !!pdfjs.GlobalWorkerOptions.workerSrc
    });
    
    // Load the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    console.log("PDF loading task created");
    
    const pdf = await loadingTask.promise;
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
      console.log(`Successfully extracted ${fullText.length} characters from ${file.name}`);
      return fullText.trim();
    }
  } catch (pdfJsError) {
    console.error("PDF.js extraction failed:", pdfJsError);
    
    // Only use the simulated content in local development as a fallback
    if (window.location.hostname === 'localhost') {
      console.log("Local development: Falling back to simulated content");
      
      // For local testing, we'll just simulate extracted text
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
    }
  }
  
  // Final fallback - return placeholder text
  return `[This PDF file (${file.name}) requires conversion to text format for processing. 
Please consider converting it to a Word document or text file for better results.]`;
}

/**
 * Special markers for file content
 */
export const CONTENT_MARKERS = {
  EMPTY_SUBMISSION: '[EMPTY_SUBMISSION]',
  NO_SUBMISSION: '[NO_SUBMISSION]'
};

/**
 * Check if content is considered empty or missing
 */
export function isEmptySubmission(content: string | null | undefined): boolean {
  if (!content) return true;
  
  const trimmed = content.trim();
  
  // Only consider it empty if it's literally empty or just contains special markers
  if (trimmed.length === 0 || 
      trimmed === CONTENT_MARKERS.EMPTY_SUBMISSION || 
      trimmed === CONTENT_MARKERS.NO_SUBMISSION) {
    return true;
  }
  
  return false;
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
          // Check if the HTML contains empty content
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          const textContent = tempDiv.textContent || '';
          const cleanText = textContent.trim();
          
          if (cleanText.length === 0) {
            console.log('HTML file contains empty content');
            resolve(CONTENT_MARKERS.EMPTY_SUBMISSION);
          } else {
            // Return the raw HTML to preserve formatting
            resolve(html);
          }
        } else {
          console.log('Empty HTML content detected');
          resolve(CONTENT_MARKERS.EMPTY_SUBMISSION);
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
 * 
 * This logic only deprioritizes HTML files (which are often auto-generated by Moodle).
 * All other file types (PDFs, docs, images, spreadsheets, etc.) are treated equally,
 * as they could all be valid assignment submissions depending on the assignment.
 */
export function findBestSubmissionFile(files: File[]): File | null {
  if (!files || files.length === 0) return null;
  
  // First, separate HTML files from other submission types
  const htmlFiles: File[] = [];
  const otherFiles: File[] = [];
  
  for (const file of files) {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    
    // Check if it's an HTML file (which are often auto-generated by Moodle)
    if (name.includes('onlinetext') || name.endsWith('.html') || name.endsWith('.htm') || type.includes('html')) {
      htmlFiles.push(file);
    } else {
      otherFiles.push(file);
    }
  }
  
  // If there are any non-HTML files, prefer those over HTML files
  if (otherFiles.length > 0) {
    // If multiple non-HTML files, sort by file size (assuming larger files have more content)
    // This is just a heuristic - all file types are treated equally in terms of "value"
    otherFiles.sort((a, b) => b.size - a.size);
    
    console.log(`Found ${otherFiles.length} non-HTML files. Using largest: ${otherFiles[0].name} (${otherFiles[0].size} bytes)`);
    return otherFiles[0];
  }
  
  // Only use HTML files if no other files were submitted
  if (htmlFiles.length > 0) {
    // Sort HTML files by size
    htmlFiles.sort((a, b) => b.size - a.size);
    console.log(`No non-HTML files found. Using HTML file: ${htmlFiles[0].name} (${htmlFiles[0].size} bytes)`);
    return htmlFiles[0];
  }
  
  return null;
}
