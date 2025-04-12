import { useState } from "react";
import { extractTextFromFile, extractTextFromHTML, findBestSubmissionFile, CONTENT_MARKERS } from "@/utils/fileUtils";
import { isImageFile } from "@/utils/imageUtils";

/**
 * Type for the file processing result
 */
export interface FileProcessingResult {
  submissionText: string;
  submissionFile: File | null;
  hasEmptySubmission: boolean;
  isImageFile?: boolean;
  debug?: any; // Debug information
}

/**
 * Custom hook for file processing operations
 */
export function useFileProcessing() {
  // Cache for text extraction to avoid duplicate work
  const [textExtractionCache] = useState<Map<string, string>>(new Map());
  
  /**
   * Check if file is a supported type
   */
  const isSupportedFileType = (file: File): boolean => {
    const supportedTypes = [
      // Document formats
      '.pdf', '.docx', '.doc', '.txt', '.html', '.htm', 
      'application/pdf', 'text/plain', 'text/html', 
      'application/vnd.openxmlformats-officedocument', 'application/msword',
      // Special case for Moodle online text
      'onlinetext',
      // Image support
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif',
      'image/'
    ];
    
    // Check if file name or type contains any of the supported types
    return supportedTypes.some(type => 
      file.name.toLowerCase().includes(type) || (file.type && file.type.toLowerCase().includes(type))
    );
  };

  /**
   * Extract text with caching for performance
   */
  const extractTextWithCache = async (file: File): Promise<string> => {
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
    
    if (textExtractionCache.has(cacheKey)) {
      return textExtractionCache.get(cacheKey) as string;
    }
    
    try {
      // Check if this is an unsupported file type
      if (!isSupportedFileType(file)) {
        console.warn(`Unsupported file type: ${file.name} (${file.type || "unknown type"})`);
        return `[UNSUPPORTED_FILE_TYPE: The file "${file.name}" cannot be processed automatically. Please review this submission manually.]`;
      }
      
      let text: string;
      
      if (file.name.endsWith('.pdf') || file.type.includes('pdf')) {
        text = await extractTextFromFile(file);
      } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc') || 
                file.type.includes('word') || file.type.includes('officedocument')) {
        text = await extractTextFromFile(file);
      } else if (file.name.includes('onlinetext') || file.name.endsWith('.html') || file.name.endsWith('.htm') || 
                file.type.includes('html')) {
        text = await extractTextFromHTML(file);
      } else if (file.name.endsWith('.txt') || file.type.includes('text/plain')) {
        text = await extractTextFromFile(file);
      } else {
        text = await extractTextFromFile(file);
      }
      
      text = text.replace(/\s+/g, ' ').trim();
      
      if (text.length < 20 && file.size > 1000) {
        console.warn(`Warning: Extracted very short text (${text.length} chars) from large file (${file.size} bytes): ${file.name}`);
        if (file.name.endsWith('.html') || file.type.includes('html')) {
          const rawContent = await extractTextFromHTML(file);
          if (rawContent.length > text.length) {
            text = rawContent;
          }
        }
      }
      
      textExtractionCache.set(cacheKey, text);
      return text;
    } catch (error) {
      console.error(`Error extracting text from ${file.name}:`, error);
      return `[ERROR: Failed to extract text from ${file.name}. This submission may require manual review.]`;
    }
  };

  /**
   * Create debug information for file processing
   */
  const createDebugInfo = (studentInfo: any, files: File[], selectedFile?: File): any => {
    const fileDetails = files.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      isImage: isImageFile(f),
      path: f.webkitRelativePath || f.name
    }));
    
    const debugInfo = {
      student: studentInfo.fullName,
      files: fileDetails,
      timestamp: new Date().toISOString(),
      processedAt: Date.now()
    };
    
    if (selectedFile) {
      debugInfo.selectedFile = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        isImage: isImageFile(selectedFile)
      };
    }
    
    return debugInfo;
  };

  /**
   * Process files for a student folder to find the best submission
   */
  const processFolderFiles = async (
    folderFiles: File[], 
    studentInfo: any
  ): Promise<FileProcessingResult> => {
    console.log(`Processing files for "${studentInfo.fullName}" (${folderFiles.length} files)`);
    
    // Create initial debug information
    const debugInfo = createDebugInfo(studentInfo, folderFiles);
    
    // Add to window debug object if debugging is enabled
    if (typeof window !== 'undefined' && localStorage.getItem("enable_file_debug") === "true") {
      // Initialize debug object if needed
      if (!(window as any)._fileProcessingDebug) {
        (window as any)._fileProcessingDebug = {
          timestamp: new Date().toISOString(),
          summary: "File processing debug information",
          perStudentFiles: {}
        };
      }
      
      // Make sure perStudentFiles exists
      if (!(window as any)._fileProcessingDebug.perStudentFiles) {
        (window as any)._fileProcessingDebug.perStudentFiles = {};
      }
      
      // Add this student's debug info with key properties for UI display
      (window as any)._fileProcessingDebug.perStudentFiles[studentInfo.fullName] = {
        filesFound: folderFiles.length,
        processedAt: Date.now(),
        ...debugInfo
      };
    }
    
    // Find the best file to use - this prioritizes non-HTML files
    const bestFile = findBestSubmissionFile(folderFiles);
    
    if (!bestFile) {
      console.log(`No files found for ${studentInfo.fullName}`);
      return { 
        submissionText: CONTENT_MARKERS.NO_SUBMISSION,
        submissionFile: null,
        hasEmptySubmission: true,
        debug: debugInfo
      };
    }
    
    console.log(`Selected best file for ${studentInfo.fullName}: ${bestFile.name} (${bestFile.type}, ${bestFile.size} bytes)`);
    
    // Update debug info with selected file
    debugInfo.selectedFile = {
      name: bestFile.name,
      type: bestFile.type,
      size: bestFile.size,
      isImage: isImageFile(bestFile)
    };
    
    // Check if this is an image file - we'll handle it specially
    const isImage = isImageFile(bestFile);
    
    // Update debug info
    debugInfo.isImageFile = isImage;
    debugInfo.processingMethod = isImage ? "direct-image-upload" : "text-extraction";
    
    // For image files, we'll send the image directly to the OpenAI API
    if (isImage) {
      console.log(`Image file detected for ${studentInfo.fullName} - will send directly to OpenAI`);
      debugInfo.processingDecision = "Image file will be sent directly to OpenAI for vision processing";
      
      return { 
        submissionText: `[IMAGE_SUBMISSION]`, 
        submissionFile: bestFile,
        isImageFile: true,
        hasEmptySubmission: false,
        debug: debugInfo
      };
    }
    
    // For non-image files, extract text
    try {
      const text = await extractTextWithCache(bestFile);
      console.log(`Extracted ${text.length} chars from ${bestFile.name}`);
      
      // Update debug info
      debugInfo.extractedTextLength = text.length;
      debugInfo.textPreview = text.substring(0, 150) + (text.length > 150 ? '...' : '');
      
      // Only consider completely empty content as truly empty
      const isTrulyEmpty = !text || text.trim().length === 0 || 
        text === CONTENT_MARKERS.EMPTY_SUBMISSION || text === CONTENT_MARKERS.NO_SUBMISSION;
      
      // Update debug
      debugInfo.isEmpty = isTrulyEmpty;
      debugInfo.emptyReason = isTrulyEmpty ? 
        ((!text || text.trim().length === 0) ? "Empty content" : "Empty submission marker") : 
        "Not empty";
      
      if (isTrulyEmpty) {
        console.log(`Truly empty submission detected for ${studentInfo.fullName}`);
        debugInfo.processingDecision = "Empty submission - will not be sent to OpenAI";
        
        return { 
          submissionText: CONTENT_MARKERS.EMPTY_SUBMISSION,
          submissionFile: bestFile,
          hasEmptySubmission: true,
          debug: debugInfo
        };
      }
      
      // Not empty, will be processed normally
      debugInfo.processingDecision = "Content will be sent to OpenAI for grading";
      
      return { 
        submissionText: text, 
        submissionFile: bestFile,
        hasEmptySubmission: false,
        debug: debugInfo
      };
    } catch (error) {
      console.error(`Error extracting text from ${bestFile.name}:`, error);
      
      // Update debug with error
      debugInfo.error = error.message;
      debugInfo.errorStack = error.stack;
      debugInfo.processingDecision = "Error occurred during processing - marking as empty";
      
      // If extraction fails completely, we should still return the file but mark it empty
      return { 
        submissionText: `Error extracting content from ${bestFile.name}: ${error}`, 
        submissionFile: bestFile,
        hasEmptySubmission: true,
        debug: debugInfo
      };
    }
  };

  /**
   * Organize files by folder structure
   */
  const organizeFilesByFolder = (files: File[]): { [key: string]: File[] } => {
    if (files.length === 0) return {};
    
    const filesByFolder: { [key: string]: File[] } = {};
    
    for (const file of files) {
      const pathParts = file.webkitRelativePath ? 
        file.webkitRelativePath.split('/') : 
        file.name.split('/');
      
      let folderPath = '';
      if (pathParts.length > 1) {
        if (file.webkitRelativePath) {
          folderPath = pathParts[0];
          if (pathParts.length > 2) {
            folderPath = pathParts[0];
          }
        } else {
          folderPath = pathParts.slice(0, -1).join('/');
        }
      }
      
      if (!folderPath && (file.name.includes('_assignsubmission_') || file.name.includes('_onlinetext_'))) {
        const submissionParts = file.name.split('_assignsubmission_');
        if (submissionParts.length > 1) {
          folderPath = submissionParts[0];
        } else {
          const onlineTextParts = file.name.split('_onlinetext_');
          if (onlineTextParts.length > 1) {
            folderPath = onlineTextParts[0];
          }
        }
      }
      
      const folderKey = folderPath || 'root';
      
      if (!filesByFolder[folderKey]) {
        filesByFolder[folderKey] = [];
      }
      
      filesByFolder[folderKey].push(file);
    }
    
    return filesByFolder;
  };

  /**
   * Groups files by student name across all folders
   * This is needed because a student might have files in multiple folders
   */
  const groupFilesByStudent = (folderStructure: { [key: string]: File[] }): { [studentName: string]: File[] } => {
    // Initialize student files map
    const studentFiles: { [studentName: string]: File[] } = {};
    
    // Temporary map to track which folders belong to which students
    const folderToStudent: { [folderPath: string]: string } = {};
    
    // First pass: Determine student names from folder names
    for (const folderPath of Object.keys(folderStructure)) {
      // Skip 'root' folder for student name extraction
      if (folderPath === 'root') continue;
      
      // Extract student name from folder path
      let studentName = '';
      
      // Handle Moodle format folders like "John Smith_12345_assignsubmission_file"
      if (folderPath.includes('_assignsubmission_')) {
        studentName = folderPath.split('_assignsubmission_')[0];
      } else if (folderPath.includes('_onlinetext_')) {
        studentName = folderPath.split('_onlinetext_')[0];
      }
      
      // Clean up student name
      if (studentName.includes('_')) {
        // Remove numeric ID if present (e.g., "John Smith_12345" -> "John Smith")
        const parts = studentName.split('_');
        if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
          studentName = parts.slice(0, -1).join('_');
        }
      }
      
      if (studentName) {
        folderToStudent[folderPath] = studentName;
        
        // Initialize the student's file array if needed
        if (!studentFiles[studentName]) {
          studentFiles[studentName] = [];
        }
        
        // Add this folder's files to the student's files
        studentFiles[studentName].push(...folderStructure[folderPath]);
        
        console.log(`Mapped folder "${folderPath}" to student "${studentName}" with ${folderStructure[folderPath].length} files`);
      }
    }
    
    // Handle files in the root folder (if any)
    if (folderStructure['root']) {
      folderStructure['root'].forEach(file => {
        // Try to extract student name from filename
        const fileName = file.name;
        let studentName = '';
        
        if (fileName.includes('_assignsubmission_')) {
          studentName = fileName.split('_assignsubmission_')[0];
        } else if (fileName.includes('_onlinetext_')) {
          studentName = fileName.split('_onlinetext_')[0];
        }
        
        if (studentName) {
          if (!studentFiles[studentName]) {
            studentFiles[studentName] = [];
          }
          studentFiles[studentName].push(file);
          console.log(`Added root file "${fileName}" to student "${studentName}"`);
        } else {
          console.warn(`Could not determine student name for root file: ${fileName}`);
        }
      });
    }
    
    // Log summary of student files
    const studentCount = Object.keys(studentFiles).length;
    console.log(`Grouped files by student: ${studentCount} students found`);
    
    return studentFiles;
  };

  return {
    isSupportedFileType,
    extractTextWithCache,
    processFolderFiles,
    organizeFilesByFolder,
    groupFilesByStudent
  };
}