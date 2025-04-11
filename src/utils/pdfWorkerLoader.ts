/**
 * PDF.js worker loader - dedicated file to ensure the worker is properly initialized
 */
import * as pdfjs from 'pdfjs-dist';

// Log the starting state
console.log('PDF Worker Loader: Initializing');

// Function to create a blob URL for the worker
function createWorkerBlob() {
  try {
    // Try to dynamically import the worker
    import('pdfjs-dist/build/pdf.worker.mjs')
      .then(worker => {
        // Convert worker code to blob and create URL
        const workerBlob = new Blob([`
          // PDF.js worker wrapper
          ${worker.default}
        `], { type: 'application/javascript' });
        
        const workerBlobUrl = URL.createObjectURL(workerBlob);
        console.log(`Created worker blob URL: ${workerBlobUrl}`);
        pdfjs.GlobalWorkerOptions.workerSrc = workerBlobUrl;
      })
      .catch(err => {
        console.error('Error loading PDF.js worker dynamically:', err);
        // Fallback to CDN
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
      });
  } catch (e) {
    console.error('Error in createWorkerBlob:', e);
    // Final fallback
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  }
}

// IIFE to execute immediately, Vite will preserve this code during transformation
(() => {
  try {
    // Try to set the worker using the bundled worker
    const workerPath = `pdf.worker.js`;
    console.log(`Setting PDF.js worker to: ${workerPath}`);
    pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
    
    // Add a timeout to check if the worker was loaded correctly
    setTimeout(() => {
      if (!document.querySelector(`script[src*="pdf.worker"]`)) {
        console.warn('Worker script not detected in DOM after timeout, creating blob URL');
        createWorkerBlob();
      } else {
        console.log('Worker script detected in DOM');
      }
    }, 1000);
  } catch (e) {
    console.error('Error setting PDF.js worker:', e);
    // Fallback to dynamic import
    createWorkerBlob();
  }
})();

export default pdfjs.GlobalWorkerOptions.workerSrc;