import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractTextFromFile, extractTextFromHTML, findBestSubmissionFile, extractStudentInfoFromFilename, isEmptySubmission, CONTENT_MARKERS, cacheFileMetadata, getCachedFileMetadata, clearFileCache } from "@/utils/fileUtils";
import { uploadMoodleGradebook, generateMoodleCSV } from "@/utils/csv";
import { gradeWithOpenAI } from "@/utils/gradingUtils";
import { isImageFile } from "@/utils/imageUtils";
import type { AssignmentFormData } from "@/components/assignment/AssignmentFormTypes";
import { findBestStudentMatch } from "@/utils/nameMatchingUtils";

export interface StudentGrade {
  identifier: string;
  fullName: string;
  email: string;
  status: string;
  grade: number;
  feedback: string;
  file?: File;
  edited?: boolean;
  originalRow?: Record<string, string>; // Store the original CSV row format
  firstName?: string; // Added for better name matching
  lastName?: string;  // Added for better name matching
  contentPreview?: string; // Preview of the submission content
}

export interface MoodleGradebookData {
  headers: string[];
  grades: StudentGrade[];
  assignmentColumn?: string; // The column name for the assignment grade
  feedbackColumn?: string;   // The column name for the feedback
}

export function useGradingWorkflow() {
  // Try to restore current step from localStorage on initial load
  const getSavedStep = (): number => {
    try {
      const savedStep = localStorage.getItem('moodle_grader_current_step');
      if (savedStep) {
        const step = parseInt(savedStep, 10);
        // Validate step is between 1-4
        if (step >= 1 && step <= 4) {
          console.log(`Restoring to saved step: ${step}`);
          return step;
        }
      }
    } catch (error) {
      console.error("Error restoring step from localStorage:", error);
    }
    return 1; // Default to step 1
  };

  const [currentStep, setCurrentStep] = useState(getSavedStep());
  const [files, setFiles] = useState<File[]>([]);
  const [assignmentData, setAssignmentData] = useState<AssignmentFormData | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [sampleDataLoaded, setSampleDataLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [moodleGradebook, setMoodleGradebook] = useState<MoodleGradebookData | null>(null);
  const [folderStructure, setFolderStructure] = useState<{[key: string]: File[]}>({});
  
  const preloadedGrades = (data: MoodleGradebookData) => {
    const firstNameColumn = data.headers.findIndex(h => 
      h.toLowerCase().includes('first name') || h.toLowerCase() === 'first' || h.toLowerCase() === 'firstname'
    );
    
    const lastNameColumn = data.headers.findIndex(h => 
      h.toLowerCase().includes('last name') || h.toLowerCase() === 'last' || h.toLowerCase() === 'lastname' || h.toLowerCase() === 'surname'
    );
    
    if (firstNameColumn !== -1 || lastNameColumn !== -1) {
      data.grades = data.grades.map(grade => {
        const originalRow = grade.originalRow || {};
        
        if (firstNameColumn !== -1) {
          grade.firstName = originalRow[data.headers[firstNameColumn]] || '';
        }
        
        if (lastNameColumn !== -1) {
          grade.lastName = originalRow[data.headers[lastNameColumn]] || '';
        }
        
        if (grade.firstName && grade.lastName) {
          grade.fullName = `${grade.firstName} ${grade.lastName}`;
        }
        
        return grade;
      });
    }
    
    setMoodleGradebook(data);
    console.log("Preloaded Moodle gradebook data:", data);
    console.log("Student names in gradebook:", data.grades.map(g => g.fullName));
    
    if (firstNameColumn !== -1 || lastNameColumn !== -1) {
      console.log("First/Last names extracted:", data.grades.map(g => ({
        fullName: g.fullName,
        firstName: g.firstName,
        lastName: g.lastName
      })));
    }
  };
  
  const organizeFilesByFolder = () => {
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
   * (e.g., both onlinetext and file submission folders)
   */
  const groupFilesByStudent = (folderStructure: { [key: string]: File[] }) => {
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
    
    Object.entries(studentFiles).forEach(([student, files]) => {
      console.log(`Student "${student}" has ${files.length} files: ${files.map(f => f.name).join(', ')}`);
    });
    
    return studentFiles;
  };
  
  const textExtractionCache = new Map<string, string>();
  
  // Check if file is a supported type
  const isSupportedFileType = (file: File): boolean => {
    const supportedTypes = [
      // Document formats
      '.pdf', '.docx', '.doc', '.txt', '.html', '.htm', 
      'application/pdf', 'text/plain', 'text/html', 
      'application/vnd.openxmlformats-officedocument', 'application/msword',
      // Special case for Moodle online text
      'onlinetext',
      // Now we also support images
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif',
      'image/'
    ];
    
    // Check if file name or type contains any of the supported types
    return supportedTypes.some(type => 
      file.name.toLowerCase().includes(type) || (file.type && file.type.toLowerCase().includes(type))
    );
  };

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
  
  const processFolderInBatches = async (
    folderFiles: File[], 
    folderName: string, 
    studentInfo: any,
    batchSize = 3
  ) => {
    console.log(`Processing files for "${studentInfo.fullName}" (${folderFiles.length} files)`);
    
    // Log all files found for this student
    const fileDetails = folderFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      isImage: isImageFile(f),
      path: f.webkitRelativePath || f.name
    }));
    
    // Store debug information
    const debugInfo = {
      student: studentInfo.fullName,
      files: fileDetails,
      timestamp: new Date().toISOString(),
      processedAt: Date.now()
    };
    
    // Add to window debug object if debugging is enabled
    if (localStorage.getItem("enable_file_debug") === "true") {
      // Initialize debug object if needed
      if (!window._fileProcessingDebug) {
        window._fileProcessingDebug = {
          timestamp: new Date().toISOString(),
          summary: "File processing debug information",
          perStudentFiles: {}
        };
      }
      
      // Make sure perStudentFiles exists
      if (!window._fileProcessingDebug.perStudentFiles) {
        window._fileProcessingDebug.perStudentFiles = {};
      }
      
      // Add this student's debug info with key properties for UI display
      window._fileProcessingDebug.perStudentFiles[studentInfo.fullName] = {
        filesFound: fileDetails.length,
        processedAt: Date.now(),
        ...debugInfo
      };
    }
    
    // Find the best file to use - this prioritizes non-HTML files using our improved function
    const bestFile = findBestSubmissionFile(folderFiles);
    
    if (!bestFile) {
      console.log(`No files found for ${studentInfo.fullName}`);
      return { 
        submissionText: CONTENT_MARKERS.NO_SUBMISSION,
        submissionFile: null,
        hasEmptySubmission: true
      };
    }
    
    console.log(`Selected best file for ${studentInfo.fullName}: ${bestFile.name} (${bestFile.type}, ${bestFile.size} bytes)`);
    
    // Add selected file to debug info
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
    // This is more accurate than trying to extract text first
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
    
    // For non-image files, extract text as before
    try {
      const text = await extractTextWithCache(bestFile);
      console.log(`Extracted ${text.length} chars from ${bestFile.name}`);
      
      // Update debug info
      debugInfo.extractedTextLength = text.length;
      debugInfo.textPreview = text.substring(0, 150) + (text.length > 150 ? '...' : '');
      
      // Only consider completely empty content as truly empty
      // Even 1 character submissions should be graded
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
  
  // Load saved data from localStorage on component mount and whenever step changes
  useEffect(() => {
    try {
      // Always try to load any saved state when step changes
      console.log(`Step changed to ${currentStep}, checking for saved state`);
      
      // Try to load assignment data when entering step 2 or later
      if (currentStep >= 2 && !assignmentData) {
        const savedAssignmentData = localStorage.getItem('moodle_grader_assignment_data');
        if (savedAssignmentData) {
          setAssignmentData(JSON.parse(savedAssignmentData));
          console.log("Restored assignment data from localStorage for step", currentStep);
        }
      }
      
      // Try to load grades when entering step 3 or later
      if (currentStep >= 3 && grades.length === 0) {
        const savedGrades = localStorage.getItem('moodle_grader_grades');
        if (savedGrades) {
          setGrades(JSON.parse(savedGrades));
          setSampleDataLoaded(true);
          console.log("Restored grades from localStorage for step", currentStep);
        }
      }
      
      // Also check for file uploads
      const fileCount = sessionStorage.getItem('moodle_grader_file_count');
      if (currentStep >= 2 && fileCount && files.length === 0) {
        console.log(`Session storage shows ${fileCount} files were uploaded but none are loaded`);
        
        // Try to load file metadata from IndexedDB
        getCachedFileMetadata().then(metadata => {
          if (metadata && metadata.length > 0) {
            console.log(`Found ${metadata.length} cached file metadata entries`);
            
            // We can't restore actual File objects, but we can show useful information
            const fileInfo = metadata.map(meta => `${meta.name} (${Math.round(meta.size/1024)} KB)`).slice(0, 3);
            const moreFiles = metadata.length > 3 ? ` and ${metadata.length - 3} more` : '';
            
            // Show toast with detailed information
            toast.info(
              <div className="space-y-1">
                <p>Previous files found: {fileInfo.join(', ')}{moreFiles}</p>
                <p className="text-xs">Please re-upload your files to continue.</p>
              </div>
            );
          } else if (parseInt(fileCount) > 0) {
            // Fallback message if no metadata but we know there were files
            toast.info(`You had ${fileCount} files uploaded previously. Please re-upload them to continue.`);
          }
        }).catch(error => {
          console.error("Error retrieving file metadata:", error);
          
          // Fallback message
          if (parseInt(fileCount) > 0) {
            toast.info(`You had ${fileCount} files uploaded previously. Please re-upload them to continue.`);
          }
        });
      }
    } catch (error) {
      console.error("Error restoring data from localStorage:", error);
    }
  }, [currentStep, assignmentData, grades.length, files.length]);

  // Initialize debug object for file processing
  useEffect(() => {
    // @ts-ignore - Add debugging object to window
    window._fileProcessingDebug = {
      studentFiles: {},
      folderStructure: {},
      selectedFiles: {},
      timestamp: new Date().toISOString(),
      summary: "File processing debug information"
    };
  }, []);

  // Update folder structure when files change
  useEffect(() => {
    if (files.length > 0) {
      // First organize by folder
      const structure = organizeFilesByFolder();
      setFolderStructure(structure);
      
      // Then organize by student name - this helps us handle files across multiple folders
      const studentFiles = groupFilesByStudent(structure);
      
      // Store in the debug object
      // @ts-ignore - Add to window object for debugging
      window._fileProcessingDebug.folderStructure = structure;
      // @ts-ignore
      window._fileProcessingDebug.studentFiles = studentFiles;
      
      console.log("Files organized by student:", Object.keys(studentFiles));
      
      // Save files to sessionStorage (we can't store File objects in localStorage)
      // Instead, we'll just save the count to know files were uploaded
      sessionStorage.setItem('moodle_grader_file_count', files.length.toString());
    }
  }, [files]);
  
  useEffect(() => {
    const processFilesWithAI = async () => {
      // Check if using server API key
      const usingServerKey = localStorage.getItem("use_server_api_key") === "true";
      const hasApiKey = getApiKey() || usingServerKey;
      
      if (currentStep === 3 && assignmentData && files.length > 0 && hasApiKey && !sampleDataLoaded && !isProcessing) {
        setIsProcessing(true);
        
        const filesByFolder = folderStructure;
        const folderCount = Object.keys(filesByFolder).length;
        
        toast.info(`Processing ${folderCount} ${folderCount === 1 ? 'folder' : 'folders'} with AI...`);
        
        try {
          console.log('All folders to process:', Object.keys(filesByFolder));
          console.log('Number of folders found:', Object.keys(filesByFolder).length);
          
          if (Object.keys(filesByFolder).length <= 1 && filesByFolder['root']) {
            console.warn('WARNING: No folder structure detected in files. Student name matching may not work correctly.');
            toast.warning('No folder structure detected in files. Student matching may not work correctly.');
          }
          
          const processedGrades: StudentGrade[] = [];
          let processedCount = 0;
          
          if (moodleGradebook) {
            console.log('MATCHING DEBUG - Moodle gradebook students:');
            moodleGradebook.grades.forEach((student, idx) => {
              console.log(`[${idx}] ${student.fullName} (${typeof student.fullName})${student.firstName ? ` - First: ${student.firstName}, Last: ${student.lastName}` : ''}`);
            });
          }
          
          // Get student files grouped across folders
          const studentFiles = groupFilesByStudent(filesByFolder);
          
          // Store for debugging
          // @ts-ignore
          window._fileProcessingDebug.currentStudentFiles = studentFiles;
          // @ts-ignore
          window._fileProcessingDebug.processStartTime = new Date().toISOString();
          
          const concurrencyLimit = 5;
          const students = Object.keys(studentFiles);
          
          console.log(`Processing ${students.length} students with concurrency limit ${concurrencyLimit}`);
          
          for (let i = 0; i < students.length; i += concurrencyLimit) {
            const batch = students.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(async (studentName) => {
              const studentAllFiles = studentFiles[studentName];
              if (studentAllFiles.length === 0) return null;
              
              console.log(`\nPROCESSING STUDENT: "${studentName}" with ${studentAllFiles.length} files`);
              
              // Get best file info for debugging
              const fileDetails = studentAllFiles.map(f => ({
                name: f.name, 
                type: f.type, 
                size: f.size,
                isImage: isImageFile(f),
                path: f.webkitRelativePath || f.name
              }));
              
              console.log(`Files for ${studentName}:`, fileDetails);
              
              // Extract student info from name - needed for the gradebook
              const studentInfo = {
                fullName: studentName,
                firstName: '',
                lastName: '',
                email: `${studentName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                identifier: studentName.replace(/\s+/g, '_').toLowerCase()
              };
              
              // Split name into first/last if possible
              if (studentName.includes(' ')) {
                const nameParts = studentName.split(' ');
                studentInfo.firstName = nameParts[0];
                studentInfo.lastName = nameParts.slice(1).join(' ');
              }
              
              console.log(`Student info for ${studentName}:`, studentInfo);
              
              // Process all the student's files to find the best one
              const { submissionText, submissionFile, hasEmptySubmission, isImageFile: isImage } = 
                await processFolderInBatches(studentAllFiles, studentName, studentInfo);
              
              if (submissionFile) {
                let studentName = studentInfo.fullName;
                let studentEmail = studentInfo.email || '';
                let studentIdentifier = studentInfo.identifier;
                let originalRow = {};
                let firstName = '';
                let lastName = '';
                let matchFound = false;
                
                let matchingMoodleStudent = null;
                if (moodleGradebook && moodleGradebook.grades.length > 0) {
                  console.log(`MATCHING - Trying to match "${studentInfo.fullName}" with students in gradebook`);
                  
                  matchingMoodleStudent = findBestStudentMatch(studentInfo, moodleGradebook.grades);
                  
                  if (matchingMoodleStudent) {
                    matchFound = true;
                    console.log(`SUCCESS: Matched "${studentInfo.fullName}" to gradebook student "${matchingMoodleStudent.fullName}"`);
                    studentName = matchingMoodleStudent.fullName;
                    studentEmail = matchingMoodleStudent.email || '';
                    studentIdentifier = matchingMoodleStudent.identifier;
                    firstName = matchingMoodleStudent.firstName || '';
                    lastName = matchingMoodleStudent.lastName || '';
                    originalRow = matchingMoodleStudent.originalRow || {};
                  } else {
                    console.log(`NO MATCH FOUND for "${studentInfo.fullName}" in gradebook`);
                    
                    if (studentInfo.fullName.toLowerCase().includes('esi')) {
                      const esiMatch = moodleGradebook.grades.find(grade => 
                        grade.fullName.toLowerCase().includes('esi')
                      );
                      
                      if (esiMatch) {
                        console.log(`SPECIAL CASE: Found Esi by partial name match: "${esiMatch.fullName}"`);
                        matchFound = true;
                        studentName = esiMatch.fullName;
                        studentEmail = esiMatch.email || '';
                        studentIdentifier = esiMatch.identifier;
                        firstName = esiMatch.firstName || '';
                        lastName = esiMatch.lastName || '';
                        originalRow = esiMatch.originalRow || {};
                      }
                    }
                    
                    if (studentInfo.fullName.toLowerCase().includes('jediah')) {
                      const jediahMatch = moodleGradebook.grades.find(grade => 
                        grade.fullName.toLowerCase().includes('jediah')
                      );
                      
                      if (jediahMatch) {
                        console.log(`SPECIAL CASE: Found Jediah by partial name match: "${jediahMatch.fullName}"`);
                        matchFound = true;
                        studentName = jediahMatch.fullName;
                        studentEmail = jediahMatch.email || '';
                        studentIdentifier = jediahMatch.identifier;
                        firstName = jediahMatch.firstName || '';
                        lastName = jediahMatch.lastName || '';
                        originalRow = jediahMatch.originalRow || {};
                      }
                    }
                  }
                }
                
                try {
                  console.log(`Processing submission for ${studentName} (${submissionText.length} chars)`);
                  console.log(`Submission preview for ${studentName}: "${submissionText.substring(0, 200)}..."`);
                  
                  // Handle empty submissions - don't send them to OpenAI at all
                  if (hasEmptySubmission || submissionText === CONTENT_MARKERS.EMPTY_SUBMISSION || submissionText === CONTENT_MARKERS.NO_SUBMISSION) {
                    console.log(`Empty submission detected for ${studentName} - not sending to OpenAI`);
                    
                    // Always mark truly empty submissions as "No Submission" with no grade
                    console.log(`Marking empty submission as "No Submission" for ${studentName}`);
                    processedGrades.push({
                      identifier: studentIdentifier,
                      fullName: studentName,
                      firstName: firstName,
                      lastName: lastName,
                      email: studentEmail,
                      status: "No Submission",
                      grade: null as any, // Use null to prevent displaying a 0
                      feedback: "", // No feedback for empty submissions
                      file: submissionFile,
                      edited: true, // Mark as edited to prevent prompts
                      originalRow: originalRow,
                      contentPreview: "No submission content available for this student."
                    });
                    return; // Skip the rest of the processing
                  }
                  
                  // Check if the submission contains a truly unsupported file type warning
                  const isUnsupportedFile = submissionText.includes('[UNSUPPORTED_FILE_TYPE:') && 
                                            !isImageFile(submissionFile);
                  
                  if (isUnsupportedFile) {
                    console.warn(`Unsupported file detected for ${studentName}`);
                    // Extract the warning message
                    const fileTypeWarning = submissionText.match(/\[UNSUPPORTED_FILE_TYPE:.*?\]/)?.[0] || 'Unsupported file type detected';
                    
                    processedGrades.push({
                      identifier: studentIdentifier,
                      fullName: studentName,
                      firstName: firstName,
                      lastName: lastName,
                      email: studentEmail,
                      status: "Manual Review Required",
                      grade: null as any, // Use null to prevent displaying a 0
                      feedback: `${fileTypeWarning} Please review this submission manually. This automated message was generated because the submission contains a file type that cannot be automatically processed.`,
                      file: submissionFile,
                      edited: false, // Needs review
                      originalRow: originalRow,
                      contentPreview: submissionText
                    });
                  } else {
                    console.log(`Grading submission for ${studentName} with OpenAI`);
                    
                    // Special handling for image submissions - direct upload to OpenAI
                    const isDirectImageSubmission = isImage || 
                                                   (isImageFile(submissionFile) && submissionText === '[IMAGE_SUBMISSION]');
                    
                    if (isDirectImageSubmission) {
                      console.log(`Using direct image upload for submission from ${studentName}`);
                      // @ts-ignore - Update debug info
                      if (window._fileProcessingDebug?.perStudentFiles?.[studentName]) {
                        // @ts-ignore
                        window._fileProcessingDebug.perStudentFiles[studentName].processingMethod = "direct-image-upload";
                        // @ts-ignore
                        window._fileProcessingDebug.perStudentFiles[studentName].imageProcessingStarted = new Date().toISOString();
                      }
                    }
                    
                    // Pass the file along for image submissions
                    const gradingResult = await gradeWithOpenAI(
                      submissionText, 
                      assignmentData, 
                      getApiKey() || "",
                      assignmentData.gradingScale,
                      isDirectImageSubmission ? submissionFile : undefined
                    );
                    
                    console.log(`Grading result for ${studentName}: Grade ${gradingResult.grade}, Feedback length: ${gradingResult.feedback.length} chars`);
                    
                    processedGrades.push({
                      identifier: studentIdentifier,
                      fullName: studentName,
                      firstName: firstName,
                      lastName: lastName,
                      email: studentEmail,
                      status: "Graded",
                      grade: gradingResult.grade,
                      feedback: gradingResult.feedback,
                      file: submissionFile,
                      edited: false,
                      originalRow: originalRow,
                      contentPreview: submissionText.slice(0, 200) + (submissionText.length > 200 ? '...' : '')
                    });
                  }
                } catch (error) {
                  console.error(`Error grading submission for ${studentName}:`, error);
                  processedGrades.push({
                    identifier: studentIdentifier,
                    fullName: studentName,
                    firstName: firstName,
                    lastName: lastName,
                    email: studentEmail,
                    status: "Error",
                    grade: null as any, // Use null instead of 0 to prevent displaying a grade
                    feedback: "Error grading submission. Please grade manually.",
                    file: submissionFile,
                    edited: false,
                    originalRow: originalRow,
                    contentPreview: submissionText.slice(0, 200) + (submissionText.length > 200 ? '...' : '')
                  });
                }
              }
              
              processedCount++;
              return processedCount;
            });
            
            const batchResults = await Promise.all(batchPromises);
            const completedCount = batchResults.filter(result => result !== null).length;
            toast.info(`Processed ${processedCount}/${Object.keys(filesByFolder).length} submissions`);
          }
          
          // Deduplicate processed grades before merging
          // This prevents duplicate entries from online text + file submission folders
          console.log("DEDUPLICATION - Before:", processedGrades.length, "processed grades");
          
          // Use a Map to deduplicate by student identifier
          const uniqueGrades = new Map<string, StudentGrade>();
          
          // First pass: add all grades to the map
          processedGrades.forEach(grade => {
            const key = grade.identifier || grade.fullName.toLowerCase();
            
            // If this student already exists, keep the entry with more content
            if (uniqueGrades.has(key)) {
              const existing = uniqueGrades.get(key)!;
              const existingContentLength = existing.contentPreview?.length || 0;
              const newContentLength = grade.contentPreview?.length || 0;
              
              // Only replace if the new entry has more content
              if (newContentLength > existingContentLength) {
                console.log(`DEDUPLICATION - Replacing entry for ${grade.fullName} with more content`);
                uniqueGrades.set(key, grade);
              }
            } else {
              uniqueGrades.set(key, grade);
            }
          });
          
          // Convert back to array
          const deduplicatedGrades = Array.from(uniqueGrades.values());
          console.log("DEDUPLICATION - After:", deduplicatedGrades.length, "unique grades");
          console.log("FINISHED PROCESSING - Processed Grades:", deduplicatedGrades.map(g => g.fullName));
          
          if (moodleGradebook && moodleGradebook.grades.length > 0) {
            const mergedGrades = [...moodleGradebook.grades];
            console.log("Initial gradebook students before merging:", mergedGrades.map(g => g.fullName));
            
            // First, create a set of all student names that were processed (had submissions)
            const processedStudentNames = new Set(deduplicatedGrades.map(g => g.fullName.toLowerCase()));
            console.log("Students with processed submissions:", Array.from(processedStudentNames));
            
            // Mark students with no submissions at all
            mergedGrades.forEach((gradebookStudent, index) => {
              const hasSubmission = processedStudentNames.has(gradebookStudent.fullName.toLowerCase());
              
              if (!hasSubmission) {
                console.log(`No submission found for student: ${gradebookStudent.fullName} - marking as "No Submission" with null grade`);
                mergedGrades[index] = {
                  ...mergedGrades[index],
                  status: "No Submission",
                  grade: null, // Important: Use null, not 0, for no submissions
                  feedback: "",
                  file: null as any,
                  contentPreview: "No submission found for this student",
                  edited: true // Mark as edited to prevent further prompts
                };
              }
            });
            
            // Now merge in the processed grades for students with submissions
            deduplicatedGrades.forEach(aiGrade => {
              console.log(`Merging grade for ${aiGrade.fullName}`);
              
              const moodleIndex = mergedGrades.findIndex(grade => 
                grade.fullName.toLowerCase() === aiGrade.fullName.toLowerCase()
              );
              
              if (moodleIndex >= 0) {
                console.log(`Found matching student in merged grades at index ${moodleIndex}`);
                
                // Check if student has empty submission and if we should skip it
                const hasEmptySubmission = !aiGrade.contentPreview || aiGrade.contentPreview.trim().length < 10;
                const shouldSkip = assignmentData?.skipEmptySubmissions && hasEmptySubmission;
                
                if (shouldSkip || hasEmptySubmission) {
                  console.log(`Empty submission detected for ${aiGrade.fullName}`);
                  
                  // If skipEmptySubmissions is true, mark it as "No Submission" with null grade and no feedback
                  if (shouldSkip) {
                    console.log(`Skipping empty submission for ${aiGrade.fullName}`);
                    mergedGrades[moodleIndex] = {
                      ...mergedGrades[moodleIndex],
                      status: "No Submission",
                      grade: null, // Use null instead of 0 for empty submissions
                      feedback: "", // Clear any feedback
                      file: aiGrade.file,
                      contentPreview: aiGrade.contentPreview,
                      edited: true // Mark as edited to prevent further prompts
                    };
                  } else {
                    // If skipEmptySubmissions is false, still mark as empty but use AI grading
                    console.log(`Grading empty submission for ${aiGrade.fullName}`);
                    mergedGrades[moodleIndex] = {
                      ...mergedGrades[moodleIndex],
                      status: "Empty Submission",
                      grade: aiGrade.grade,
                      feedback: aiGrade.feedback,
                      file: aiGrade.file,
                      contentPreview: aiGrade.contentPreview,
                      edited: false
                    };
                  }
                } else {
                  // Normal submission with content
                  mergedGrades[moodleIndex] = {
                    ...mergedGrades[moodleIndex],
                    grade: aiGrade.grade,
                    feedback: aiGrade.feedback,
                    file: aiGrade.file,
                    contentPreview: aiGrade.contentPreview,
                    edited: false
                  };
                }
              } else {
                console.log(`No matching student found in merged grades for ${aiGrade.fullName}, adding new entry`);
                mergedGrades.push(aiGrade);
              }
            });
            
            // Add debug info about all student grades
            console.log("FINAL STUDENT GRADES:");
            mergedGrades.forEach(g => {
              console.log(`- ${g.fullName}: ${g.status}, grade=${g.grade === null ? 'null' : g.grade}, hasFile=${!!g.file}`);
            });
            
            setGrades(mergedGrades);
          } else {
            setGrades(deduplicatedGrades);
          }
          
          setSampleDataLoaded(true);
          toast.success("All files processed successfully!");
        } catch (error) {
          console.error("Error processing files:", error);
          toast.error("Error processing files. Please check your API key and try again.");
          
          fetchSampleData();
        } finally {
          setIsProcessing(false);
        }
      } else if (currentStep === 3 && assignmentData && files.length > 0 && !sampleDataLoaded) {
        // Only use sample data if neither personal nor server API key is available
        const usingServerKey = localStorage.getItem("use_server_api_key") === "true";
        if (!getApiKey() && !usingServerKey) {
          fetchSampleData();
        }
      }
    };
    
    processFilesWithAI();
  }, [currentStep, assignmentData, files, sampleDataLoaded, isProcessing, moodleGradebook, folderStructure]);

  const getApiKey = (): string | null => {
    // Check if user opted to use server API key
    const useServerKey = localStorage.getItem("use_server_api_key");
    if (useServerKey === "true") {
      console.log("Using server API key mode");
      return "server"; // Special marker to indicate we should use the server API key
    }
    
    const personalKey = localStorage.getItem("openai_api_key");
    console.log("Using personal API key:", personalKey ? "Yes (key found)" : "No (no key found)");
    return personalKey;
  };

  const fetchSampleData = () => {
    if (!sampleDataLoaded) {
      fetch('/sample_moodle_grades.csv')
        .then(response => response.text())
        .then(csvData => {
          const rows = csvData.split('\n');
          const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          
          const gradeColumnIndex = headers.findIndex(h => 
            h.toLowerCase().includes('grade') || h.toLowerCase().includes('mark') || h.toLowerCase().includes('score')
          );
          const feedbackColumnIndex = headers.findIndex(h => 
            h.toLowerCase().includes('feedback') || h.toLowerCase().includes('comment')
          );
          
          const assignmentColumn = gradeColumnIndex !== -1 ? headers[gradeColumnIndex] : 'Grade';
          const feedbackColumn = feedbackColumnIndex !== -1 ? headers[feedbackColumnIndex] : 'Feedback comments';
          
          const parsedGrades = rows.slice(1).filter(row => row.trim()).map((row, idx) => {
            const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            
            const originalRow: Record<string, string> = {};
            headers.forEach((header, i) => {
              originalRow[header] = values[i] || '';
            });
            
            return {
              identifier: values[0] || `id_${idx}`,
              fullName: values[1] || `Student ${idx + 1}`,
              email: values[2] || `student${idx + 1}@example.com`,
              status: 'Needs Grading',
              grade: null, // Use null instead of 0 for initial state
              feedback: '',
              edited: false,
              originalRow
            };
          });
          
          if (moodleGradebook) {
            const mergedGrades = [...moodleGradebook.grades];
            
            mergedGrades.forEach((grade, index) => {
              const maxPoints = assignmentData?.gradingScale || 100;
              grade.grade = Math.floor(Math.random() * (maxPoints * 0.7)) + (maxPoints * 0.3);
              grade.feedback = `This is sample feedback for ${grade.fullName}. In a real scenario, this would be generated by AI based on the submission content.`;
              grade.file = files[index % files.length];
              grade.edited = false;
            });
            
            setGrades(mergedGrades);
          } else {
            const gradesWithFiles = parsedGrades.map((grade, index) => ({
              ...grade,
              file: files[index % files.length],
              edited: false
            }));
            
            setGrades(gradesWithFiles);
            setMoodleGradebook({
              headers,
              grades: gradesWithFiles,
              assignmentColumn,
              feedbackColumn
            });
          }
          
          setSampleDataLoaded(true);
          
          // Show "using sample data" message only if neither personal nor server API key is available
          const usingServerKey = localStorage.getItem("use_server_api_key") === "true";
          if (!getApiKey() && !usingServerKey) {
            toast.info("Using sample data. Add an OpenAI API key for real grading.");
          } else if (usingServerKey) {
            toast.info("Using server API key for grading");
          }
        })
        .catch(error => {
          console.error("Error loading sample data:", error);
          toast.error("Failed to load sample data");
        });
    }
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    // Set files immediately for UI responsiveness
    setFiles(selectedFiles);
    setSampleDataLoaded(false);
    
    // Cache file metadata for state restoration
    try {
      await cacheFileMetadata(selectedFiles);
      console.log(`Cached metadata for ${selectedFiles.length} files`);
    } catch (error) {
      console.error("Error caching file metadata:", error);
    }
  };

  const handleStepOneComplete = () => {
    if (files.length === 0) {
      toast.error("Please upload at least one file to continue");
      return;
    }
    
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAssignmentSubmit = (data: AssignmentFormData) => {
    setAssignmentData(data);
    
    // Store assignment data in localStorage for persistence
    localStorage.setItem('moodle_grader_assignment_data', JSON.stringify(data));
    
    setCurrentStep(3);
    setSampleDataLoaded(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateGrade = (index: number, grade: number, feedback: string) => {
    setGrades(prevGrades => {
      const updatedGrades = [...prevGrades];
      updatedGrades[index] = {
        ...updatedGrades[index],
        grade,
        feedback,
        edited: true
      };
      return updatedGrades;
    });
    
    toast.success("Feedback approved");
  };

  const handleApproveAll = () => {
    setGrades(prevGrades => {
      return prevGrades.map(grade => ({ ...grade, edited: true }));
    });
    
    toast.success("All feedback approved");
  };

  const handleContinueToDownload = () => {
    const pendingReviews = grades.filter(grade => !grade.edited).length;
    
    if (pendingReviews > 0) {
      toast.warning(`You still have ${pendingReviews} unreviewed grades. Please review all grades before proceeding.`);
      return;
    }
    
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setCurrentStep(1);
    setHighestStepReached(1); // Reset this too
    setFiles([]);
    setAssignmentData(null);
    setGrades([]);
    setMoodleGradebook(null);
    setSampleDataLoaded(false);
    
    // Clear all localStorage and sessionStorage data
    localStorage.removeItem('moodle_grader_assignment_data');
    localStorage.removeItem('moodle_grader_grades');
    localStorage.removeItem('moodle_grader_current_step');
    localStorage.removeItem('moodle_grader_highest_step');
    
    // Clear file cache from IndexedDB
    clearFileCache().then(() => {
      console.log("File cache cleared");
      
      // Also clear the sessionStorage immediately so we don't see the "previously uploaded" message
      sessionStorage.removeItem('moodle_grader_file_count');
      sessionStorage.removeItem('moodle_grader_file_paths');
      // Set a reset timestamp to help components know we just reset
      sessionStorage.setItem('moodle_grader_reset_timestamp', Date.now().toString());
    }).catch(error => {
      console.error("Error clearing file cache:", error);
      
      // Even if the IndexedDB clear fails, still clear sessionStorage
      sessionStorage.removeItem('moodle_grader_file_count');
      sessionStorage.removeItem('moodle_grader_file_paths');
      // Set a reset timestamp to help components know we just reset
      sessionStorage.setItem('moodle_grader_reset_timestamp', Date.now().toString());
    });
    
    toast.info("Started a new grading session");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Track the highest step the user has reached
  const [highestStepReached, setHighestStepReached] = useState<number>(() => {
    // Try to load highest step from localStorage
    const saved = localStorage.getItem('moodle_grader_highest_step');
    return saved ? parseInt(saved, 10) : 1;
  });

  // Update highestStepReached whenever currentStep increases
  useEffect(() => {
    if (currentStep > highestStepReached) {
      setHighestStepReached(currentStep);
      localStorage.setItem('moodle_grader_highest_step', currentStep.toString());
      console.log(`Updated highest step reached to ${currentStep}`);
    }
  }, [currentStep, highestStepReached]);

  const handleStepClick = (step: number) => {
    console.group("Step Navigation");
    console.log("Current state:", {
      currentStep,
      targetStep: step,
      highestStepReached,
      filesCount: files.length,
      hasAssignmentData: !!assignmentData,
      gradesCount: grades.length
    });
    
    // Always save current state regardless of whether navigation succeeds
    try {
      // Store all current state in localStorage
      if (assignmentData) {
        const assignmentJson = JSON.stringify(assignmentData);
        localStorage.setItem('moodle_grader_assignment_data', assignmentJson);
        console.log("Saved assignment data to localStorage", 
          {size: assignmentJson.length, sample: assignmentJson.substring(0, 100) + "..."});
      } else {
        console.warn("No assignment data to save");
      }
      
      if (grades.length > 0) {
        const gradesJson = JSON.stringify(grades);
        localStorage.setItem('moodle_grader_grades', gradesJson);
        console.log("Saved grades to localStorage", 
          {count: grades.length, size: gradesJson.length});
      } else {
        console.warn("No grades to save");
      }
      
      if (files.length > 0) {
        sessionStorage.setItem('moodle_grader_file_count', files.length.toString());
        console.log("Saved file count to sessionStorage", {count: files.length});
        
        // Cache file metadata for better state recovery
        cacheFileMetadata(files).catch(err => console.error("Failed to cache file metadata:", err));
      } else {
        console.warn("No files to save");
      }
      
      // Save highest step reached
      localStorage.setItem('moodle_grader_highest_step', highestStepReached.toString());
      
      // Update localStorage with current step for potential refresh recovery
      localStorage.setItem('moodle_grader_current_step', currentStep.toString());
    } catch (error) {
      console.error("Error saving state:", error);
    }
    
    // IMPROVED NAVIGATION LOGIC: Allow going to any step up to the highest previously reached step
    // This means if you've completed step 3 before, you can navigate between steps 1-3 freely
    const isStepAvailable = step <= highestStepReached;
    
    // Only enforce file and assignment data requirements for first-time navigation
    // IMPORTANT: Any step up to and including the highest step reached should be available
    const isGoingBack = step <= currentStep;
    const canGoForward = 
      isGoingBack || // Always allow going backwards or to current step
      step <= highestStepReached || // Already reached this step before
      (step === 2 && files.length > 0) || // First time to step 2, require files
      (step === 3 && assignmentData) ||   // First time to step 3, require assignment data
      (step === 4 && grades.length > 0);  // First time to step 4, require grades
    
    console.log("Navigation check:", {
      currentStep,
      targetStep: step,
      highestStepReached,
      isStepAvailable,
      canGoForward,
      willNavigate: canGoForward
    });
                         
    if (canGoForward) {
      // Always update the current step in localStorage before navigating
      localStorage.setItem('moodle_grader_current_step', step.toString());
      console.log(`Successfully navigating to step ${step}`);
      
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      console.warn(`Navigation to step ${step} blocked - conditions not met`);
      toast.warning("Please complete the current step before proceeding.");
    }
    console.groupEnd();
  }

  return {
    currentStep,
    files,
    assignmentData,
    grades,
    setGrades,
    isProcessing,
    sampleDataLoaded,
    moodleGradebook,
    folderStructure,
    handleFilesSelected,
    handleStepOneComplete,
    handleAssignmentSubmit,
    handleUpdateGrade,
    handleApproveAll,
    handleContinueToDownload,
    handleReset,
    handleStepClick,
    preloadedGrades,
    highestStepReached // Expose this to the component
  };
}
