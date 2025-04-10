import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractTextFromFile, extractTextFromHTML, findBestSubmissionFile, extractStudentInfoFromFilename } from "@/utils/fileUtils";
import { uploadMoodleGradebook, generateMoodleCSV } from "@/utils/csv";
import { gradeWithOpenAI } from "@/utils/gradingUtils";
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
  
  const textExtractionCache = new Map<string, string>();
  
  // Check if file is a supported type
  const isSupportedFileType = (file: File): boolean => {
    const supportedTypes = [
      // Document formats
      '.pdf', '.docx', '.doc', '.txt', '.html', '.htm', 
      'application/pdf', 'text/plain', 'text/html', 
      'application/vnd.openxmlformats-officedocument', 'application/msword',
      // Special case for Moodle online text
      'onlinetext'
    ];
    
    // Check if file name or type contains any of the supported types
    return supportedTypes.some(type => 
      file.name.toLowerCase().includes(type) || (file.type && file.type.toLowerCase().includes(type))
    );
  };
  
  // Check if file is likely an image
  const isImageFile = (file: File): boolean => {
    const imageTypes = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif',
      'image/'
    ];
    
    return imageTypes.some(type => 
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
        // Special handling for image files
        if (isImageFile(file)) {
          console.warn(`Image file detected: ${file.name}. These need manual review.`);
          return `[UNSUPPORTED_FILE_TYPE: This appears to be an image (${file.name}). Images cannot be automatically graded and require manual review.]`;
        }
        
        // Handle other unsupported types
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
    const onlineTextFiles = folderFiles.filter(file => file.name.includes('onlinetext') || file.type.includes('html'));
    const otherFiles = folderFiles.filter(file => !file.name.includes('onlinetext') && !file.type.includes('html'));
    
    console.log(`Processing folder "${folderName}" with ${otherFiles.length} regular files and ${onlineTextFiles.length} HTML files`);
    
    let submissionText = '';
    let submissionFile: File | null = null;
    
    for (let i = 0; i < otherFiles.length; i += batchSize) {
      const batch = otherFiles.slice(i, i + batchSize);
      
      const results = await Promise.all(
        batch.map(async file => {
          try {
            const text = await extractTextWithCache(file);
            const meaningful = text.trim().length > 50;
            return { file, text, success: meaningful };
          } catch (error) {
            console.error(`Error extracting text from ${file.name}:`, error);
            return { file, text: '', success: false };
          }
        })
      );
      
      results.sort((a, b) => b.text.length - a.text.length);
      
      const successfulResult = results.find(r => r.success);
      if (successfulResult) {
        submissionText = successfulResult.text;
        submissionFile = successfulResult.file;
        console.log(`Using file "${submissionFile.name}" with ${submissionText.length} chars of text`);
        break;
      }
    }
    
    if ((!submissionText || submissionText.length < 100) && onlineTextFiles.length > 0) {
      console.log(`No substantial content found in regular files, trying ${onlineTextFiles.length} HTML files`);
      
      for (let i = 0; i < onlineTextFiles.length; i += batchSize) {
        const batch = onlineTextFiles.slice(i, i + batchSize);
        
        const results = await Promise.all(
          batch.map(async file => {
            try {
              const text = await extractTextWithCache(file);
              console.log(`HTML file ${file.name} content preview: "${text.substring(0, 100)}..."`);
              return { file, text, success: text.trim().length > 50 };
            } catch (error) {
              console.error(`Error extracting text from ${file.name}:`, error);
              return { file, text: '', success: false };
            }
          })
        );
        
        results.sort((a, b) => b.text.length - a.text.length);
        
        const successfulResult = results.find(r => r.success);
        if (successfulResult) {
          if (!submissionText || successfulResult.text.length > submissionText.length * 1.5) {
            submissionText = successfulResult.text;
            submissionFile = successfulResult.file;
            console.log(`Using HTML file "${submissionFile.name}" with ${submissionText.length} chars of text`);
          }
          break;
        }
      }
    }
    
    if (!submissionFile) {
      const fallbackFile = otherFiles[0] || onlineTextFiles[0];
      if (fallbackFile) {
        submissionFile = fallbackFile;
        try {
          submissionText = await extractTextWithCache(fallbackFile);
          console.log(`Using fallback file "${submissionFile.name}" with ${submissionText.length} chars of text`);
        } catch (error) {
          console.error(`Error extracting text from fallback file ${fallbackFile.name}:`, error);
          submissionText = '';
        }
      }
    }
    
    return { submissionText, submissionFile };
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
        // We can't restore the actual files, but we can inform the user
        if (parseInt(fileCount) > 0) {
          toast.info(`You had ${fileCount} files uploaded previously. Please re-upload them to continue.`);
        }
      }
    } catch (error) {
      console.error("Error restoring data from localStorage:", error);
    }
  }, [currentStep, assignmentData, grades.length, files.length]);

  // Update folder structure when files change
  useEffect(() => {
    if (files.length > 0) {
      const structure = organizeFilesByFolder();
      setFolderStructure(structure);
      
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
          
          const concurrencyLimit = 5;
          const folders = Object.keys(filesByFolder);
          
          for (let i = 0; i < folders.length; i += concurrencyLimit) {
            const batch = folders.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(async (folder) => {
              const folderFiles = filesByFolder[folder];
              if (folderFiles.length === 0) return null;
              
              const firstFile = folderFiles[0];
              const folderName = folder !== 'root' ? folder : '';
              
              console.log(`\nPROCESSING FOLDER: "${folderName}"`);
              console.log(`First file in folder: ${firstFile.name}`);
              console.log(`File has webkitRelativePath: ${!!firstFile.webkitRelativePath}`);
              if (firstFile.webkitRelativePath) {
                console.log(`  webkitRelativePath: ${firstFile.webkitRelativePath}`);
              }
              
              const studentInfo = extractStudentInfoFromFilename(firstFile.name, folderName);
              console.log(`Extracted student info:`, studentInfo);
              
              if (studentInfo.fullName.toLowerCase() === "onlinetext") {
                console.log(`Skipping folder with invalid student name "onlinetext"`);
                return null;
              }
              
              const { submissionText, submissionFile } = await processFolderInBatches(folderFiles, folderName, studentInfo);
              
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
                  console.log(`Grading submission for ${studentName} (${submissionText.length} chars)`);
                  
                  console.log(`Submission preview for ${studentName}: "${submissionText.substring(0, 200)}..."`);
                  
                  // Check if the submission contains an unsupported file type warning
                  const isUnsupportedFile = submissionText.includes('[UNSUPPORTED_FILE_TYPE:');
                  
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
                    const gradingResult = await gradeWithOpenAI(
                      submissionText, 
                      assignmentData, 
                      getApiKey() || "",
                      assignmentData.gradingScale
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
                
                if (shouldSkip) {
                  console.log(`Skipping empty submission for ${aiGrade.fullName}`);
                  mergedGrades[moodleIndex] = {
                    ...mergedGrades[moodleIndex],
                    status: "No Submission",
                    grade: null as any, // Use null instead of 0 for empty submissions
                    feedback: "", // Clear any feedback
                    file: aiGrade.file,
                    contentPreview: aiGrade.contentPreview,
                    edited: true // Mark as edited to prevent further prompts
                  };
                } else {
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
              grade: 0,
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

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setSampleDataLoaded(false);
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
    setFiles([]);
    setAssignmentData(null);
    setGrades([]);
    setMoodleGradebook(null);
    setSampleDataLoaded(false);
    toast.info("Started a new grading session");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStepClick = (step: number) => {
    // Allow navigation to any previously accessed step or forward if we have the necessary data
    const canGoForward = (step === 2 && files.length > 0) || 
                         (step === 3 && assignmentData) ||
                         (step === 4 && grades.length > 0);
                         
    if (step < currentStep || canGoForward) {
      // Store all current state in localStorage before navigating
      if (assignmentData) {
        localStorage.setItem('moodle_grader_assignment_data', JSON.stringify(assignmentData));
        console.log("Saved assignment data to localStorage");
      }
      
      if (grades.length > 0) {
        localStorage.setItem('moodle_grader_grades', JSON.stringify(grades));
        console.log("Saved grades to localStorage");
      }
      
      if (files.length > 0) {
        sessionStorage.setItem('moodle_grader_file_count', files.length.toString());
        console.log("Saved file count to sessionStorage");
      }
      
      // Update localStorage with current step for potential refresh recovery
      localStorage.setItem('moodle_grader_current_step', step.toString());
      
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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
    preloadedGrades
  };
}
