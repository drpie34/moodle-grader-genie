
import JSZip from 'jszip';

/**
 * Extract files from a ZIP archive
 */
export async function processZipFile(zipFile: File): Promise<File[]> {
  try {
    // Read ZIP file
    const zip = new JSZip();
    const zipData = await zipFile.arrayBuffer();
    const loadedZip = await zip.loadAsync(zipData);
    
    const extractedFiles: File[] = [];
    
    // Process each file in the ZIP
    const filePromises = Object.keys(loadedZip.files).map(async (filename) => {
      const zipEntry = loadedZip.files[filename];
      
      // Skip directories
      if (zipEntry.dir) {
        return;
      }
      
      // Get file content as Blob
      const content = await zipEntry.async('blob');
      
      // Create File object
      const file = new File([content], filename.split('/').pop() || filename, {
        type: getFileTypeFromName(filename)
      });
      
      extractedFiles.push(file);
    });
    
    await Promise.all(filePromises);
    
    return extractedFiles;
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    return [];
  }
}

/**
 * Get file type from filename
 */
function getFileTypeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'txt': return 'text/plain';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
}
