
import * as pdfjsLib from 'pdfjs-dist';
// Import our dedicated worker loader to ensure it's properly initialized
import './pdfWorkerLoader';

// Set up logging
console.log("PDF Utils: Initializing");
try {
  // Get PDF.js version for logs
  const version = pdfjsLib.version;
  console.log(`PDF.js version: ${version}`);
  
  // Log worker status
  console.log("PDF.js worker setup:", {
    version,
    workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc,
    workerSrcIsSet: !!pdfjsLib.GlobalWorkerOptions.workerSrc
  });
  
  // Add a global object with our PDF.js info for debugging
  window.__PDF_JS_INFO = {
    version,
    workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc,
    timestamp: new Date().toISOString()
  };
} catch (error) {
  console.error("Error setting up PDF.js worker:", error);
}

/**
 * Extract text from a PDF file using PDF.js
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    
    // Get total number of pages
    const numPages = pdf.numPages;
    let fullText = '';
    
    // Process each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return `[Error extracting text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}
