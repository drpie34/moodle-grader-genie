
import JSZip from 'jszip';

/**
 * Extract files from a ZIP archive, preserving folder structure
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
        console.log(`Skipping directory: ${filename}`);
        return;
      }
      
      // Skip macOS metadata files
      if (filename.includes('__MACOSX') || filename.startsWith('.') || filename.includes('/.')) {
        console.log(`Skipping metadata file: ${filename}`);
        return;
      }
      
      // Get file content as Blob
      const content = await zipEntry.async('blob');
      
      // Preserve full path for folder structure
      const preservedPath = filename;
      
      // Create File object with extended properties for folder structure information
      const file = new File([content], preservedPath.split('/').pop() || preservedPath, {
        type: getFileTypeFromName(preservedPath)
      });
      
      // Add custom property to preserve folder path
      Object.defineProperty(file, 'webkitRelativePath', {
        value: preservedPath,
        writable: false
      });
      
      console.log(`Extracted file with path: ${file.webkitRelativePath}`);
      extractedFiles.push(file);
    });
    
    await Promise.all(filePromises);
    
    console.log(`Extracted ${extractedFiles.length} files from ZIP with folder structure`);
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
    case 'html':
    case 'htm': return 'text/html';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
}
