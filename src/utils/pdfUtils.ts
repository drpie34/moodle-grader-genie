
import * as pdfjsLib from 'pdfjs-dist';

// CRITICAL FIX: Set workerSrc for PDF.js with multiple fallbacks in production
try {
  // Dynamically determine which CDNs to try based on PDF.js version
  const version = pdfjsLib.version;
  console.log(`PDF.js version: ${version}`);

  // Define multiple fallback URLs in order of preference
  const workerUrls = [
    // Try unpkg as primary source (more reliable)
    `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`,
    // Try jsDelivr as secondary source
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.js`,
    // Try cdnjs as tertiary source
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`,
    // As last resort, try to use a specific version that's known to work
    `https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`
  ];

  // Function to check if a URL is reachable
  const isUrlReachable = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return true; // If no error is thrown, assume the URL is reachable
    } catch (error) {
      console.warn(`Failed to reach worker at: ${url}`, error);
      return false;
    }
  };

  // Set initial worker source to first URL
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrls[0];
  console.log(`PDF.js worker source initially set to: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);

  // Try to load worker and fall back if needed
  (async () => {
    let workerLoaded = false;
    
    for (let i = 0; i < workerUrls.length; i++) {
      const url = workerUrls[i];
      console.log(`Trying PDF.js worker URL (${i+1}/${workerUrls.length}): ${url}`);
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = url;
      
      // Wait a bit to see if worker loads
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If we've already proceeded past this point in code execution
      // assume the worker is functioning and break the loop
      if (document.querySelector(`script[src="${url}"]`)) {
        console.log(`PDF.js worker script loaded successfully from: ${url}`);
        workerLoaded = true;
        break;
      }
    }
    
    if (!workerLoaded) {
      console.error("Failed to load PDF.js worker from any CDN. PDF functionality may be limited.");
    }
  })();
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
