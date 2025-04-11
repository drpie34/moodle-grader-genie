
import * as pdfjsLib from 'pdfjs-dist';

// Set workerSrc for PDF.js - use both CDNJS and unpkg as fallbacks
try {
  // Primary CDN - CDNJS
  const cdnjsWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  // Backup CDN - unpkg
  const unpkgWorkerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  
  // Set the worker source to the CDN URL
  pdfjsLib.GlobalWorkerOptions.workerSrc = cdnjsWorkerSrc;
  
  console.log(`PDF.js worker source set to: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
  console.log(`PDF.js version: ${pdfjsLib.version}`);
  
  // Use a timeout to check if the worker loaded properly
  setTimeout(() => {
    if (document.querySelector(`script[src="${cdnjsWorkerSrc}"]`)) {
      console.log("PDF.js worker script was loaded successfully");
    } else {
      console.warn("PDF.js worker script might not have loaded, trying backup CDN");
      pdfjsLib.GlobalWorkerOptions.workerSrc = unpkgWorkerSrc;
    }
  }, 2000);
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
