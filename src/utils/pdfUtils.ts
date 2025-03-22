
import * as pdfjsLib from 'pdfjs-dist';

// Set workerSrc for PDF.js
const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

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
