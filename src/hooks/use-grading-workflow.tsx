import { useState, useEffect } from "react";
import { toast } from "sonner";
import { clearFileCache } from "@/utils/fileUtils";
import { uploadMoodleGradebook, generateMoodleCSV } from "@/utils/csv";
import type { AssignmentFormData } from "@/components/assignment/AssignmentFormTypes";
import { useFileProcessing } from "./useFileProcessing";
import { useGradePersistence } from "./useGradePersistence";
import { useGradeManagement } from "./useGradeManagement";
import { findBestStudentMatch } from "./useStudentMatching";
import { useAuth } from "./auth/use-auth";

export interface StudentGrade {
  identifier: string;
  fullName: string;
  email: string;
  status: string;
  grade: number | null;
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
  const fileProcessing = useFileProcessing();
  const persistence = useGradePersistence();
  const gradeManagement = useGradeManagement();
  const { authState, incrementGradesUsed } = useAuth();

  // Try to restore current step from localStorage on initial load
  const [currentStep, setCurrentStep] = useState(persistence.getSavedStep());
  const [files, setFiles] = useState<File[]>([]);
  const [assignmentData, setAssignmentData] = useState<AssignmentFormData | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [sampleDataLoaded, setSampleDataLoaded] = useState(false);
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
  
  // Update folder structure when files change
  useEffect(() => {
    if (files.length > 0) {
      // First organize by folder
      const structure = fileProcessing.organizeFilesByFolder(files);
      setFolderStructure(structure);
      
      // Store in the debug object
      // @ts-ignore - Add to window object for debugging
      window._fileProcessingDebug = window._fileProcessingDebug || {};
      // @ts-ignore
      window._fileProcessingDebug.folderStructure = structure;
      // @ts-ignore
      window._fileProcessingDebug.studentFiles = fileProcessing.groupFilesByStudent(structure);
      
      // Save files to sessionStorage (we can't store File objects in localStorage)
      // Instead, we'll just save the count to know files were uploaded
      sessionStorage.setItem('moodle_grader_file_count', files.length.toString());
    }
  }, [files]);
  
  // Load saved data from localStorage on component mount and whenever step changes
  useEffect(() => {
    try {
      // Always try to load any saved state when step changes
      console.log(`Step changed to ${currentStep}, checking for saved state`);
      
      // Try to load assignment data when entering step 2 or later
      if (currentStep >= 2 && !assignmentData) {
        const savedAssignmentData = persistence.loadAssignmentData();
        if (savedAssignmentData) {
          setAssignmentData(savedAssignmentData);
          console.log("Restored assignment data from localStorage for step", currentStep);
        }
      }
      
      // Try to load grades when entering step 3 or later
      if (currentStep >= 3 && grades.length === 0) {
        const savedGrades = persistence.loadGrades();
        if (savedGrades.length > 0) {
          setGrades(savedGrades);
          setSampleDataLoaded(true);
          console.log("Restored grades from localStorage for step", currentStep);
        }
      }
      
      // Also check for file uploads
      const fileCount = sessionStorage.getItem('moodle_grader_file_count');
      if (currentStep >= 2 && fileCount && files.length === 0) {
        console.log(`Session storage shows ${fileCount} files were uploaded but none are loaded`);
        
        // Check for previous files
        persistence.checkPreviousFiles().then(previousFileInfo => {
          if (previousFileInfo.hasPreviousFiles) {
            persistence.notifyPreviousFiles(previousFileInfo);
          }
        });
      }
    } catch (error) {
      console.error("Error restoring data from localStorage:", error);
    }
  }, [currentStep, assignmentData, grades.length, files.length]);

  // Process grading when advancing to step 3
  useEffect(() => {
    const processFiles = async () => {
      // Check if using server API key
      const hasApiKey = gradeManagement.getApiKey();
      
      // Check if user has reached their limit
      const hasReachedLimit = authState.user && authState.profile && 
        authState.profile.grades_used >= authState.profile.grades_limit;
        
      if (hasReachedLimit) {
        toast.error("You've reached your grading limit. Please upgrade your plan to continue.");
        fetchSampleData(); // Use sample data instead
        return;
      }
      
      if (currentStep === 3 && assignmentData && files.length > 0 && hasApiKey && !sampleDataLoaded && !gradeManagement.isProcessingGrades) {
        gradeManagement.setIsProcessingGrades(true);
        
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
          const studentFiles = fileProcessing.groupFilesByStudent(filesByFolder);
          
          // Store for debugging
          // @ts-ignore
          window._fileProcessingDebug = window._fileProcessingDebug || {};
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
              const processingResult = await fileProcessing.processFolderFiles(studentAllFiles, studentInfo);
              
              if (processingResult.submissionFile) {
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
                  }
                }
                
                // Update student info with matched details if available
                const updatedStudentInfo = {
                  ...studentInfo,
                  fullName: studentName,
                  email: studentEmail,
                  identifier: studentIdentifier,
                  firstName: firstName || studentInfo.firstName,
                  lastName: lastName || studentInfo.lastName
                };
                
                // Process the submission with AI
                const gradeResult = await gradeManagement.processSubmissionWithAI(
                  updatedStudentInfo, 
                  processingResult, 
                  assignmentData, 
                  originalRow as Record<string, string>
                );
                
                processedGrades.push(gradeResult);
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
          
          // Merge with gradebook if available
          const finalGrades = moodleGradebook 
            ? gradeManagement.mergeGradebookData(deduplicatedGrades, moodleGradebook.grades, assignmentData)
            : deduplicatedGrades;
          
          setGrades(finalGrades);
          setSampleDataLoaded(true);
          
          // Save grades to localStorage
          localStorage.setItem('moodle_grader_grades', JSON.stringify(finalGrades));
          
          // Track usage if user is logged in
          if (authState.user && authState.profile) {
            // Count non-null grades
            const validGradesCount = finalGrades.filter(g => g.grade !== null).length;
            if (validGradesCount > 0) {
              incrementGradesUsed(validGradesCount)
                .then(({ error }) => {
                  if (error) {
                    console.error("Failed to update grades usage count:", error);
                  } else {
                    console.log(`Updated usage count: +${validGradesCount} grades`);
                  }
                });
            }
          }
          
          toast.success("All files processed successfully!");
        } catch (error) {
          console.error("Error processing files:", error);
          toast.error("Error processing files. Please check your API key and try again.");
          
          fetchSampleData();
        } finally {
          gradeManagement.setIsProcessingGrades(false);
        }
      } else if (currentStep === 3 && assignmentData && files.length > 0 && !sampleDataLoaded) {
        // Only use sample data if neither personal nor server API key is available
        const usingServerKey = localStorage.getItem("use_server_api_key") === "true";
        if (!gradeManagement.getApiKey() && !usingServerKey) {
          fetchSampleData();
        }
      }
    };
    
    processFiles();
  }, [currentStep, assignmentData, files, sampleDataLoaded, moodleGradebook, folderStructure, gradeManagement.isProcessingGrades]);

  // Update highestStepReached whenever currentStep increases
  useEffect(() => {
    persistence.updateHighestStep(currentStep);
  }, [currentStep]);

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
          if (!gradeManagement.getApiKey() && !usingServerKey) {
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
      await persistence.saveWorkflowState(currentStep, selectedFiles, assignmentData, grades);
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
    setGrades(gradeManagement.updateStudentGrade(grades, index, grade, feedback));
  };

  const handleApproveAll = () => {
    setGrades(gradeManagement.approveAllGrades(grades));
  };

  const handleContinueToDownload = () => {
    if (gradeManagement.canProceedToDownload(grades)) {
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setFiles([]);
    setAssignmentData(null);
    setGrades([]);
    setMoodleGradebook(null);
    setSampleDataLoaded(false);
    
    // Clear all persisted state
    persistence.resetAllState();
    
    // Clear file cache from IndexedDB
    clearFileCache().catch(error => {
      console.error("Error clearing file cache:", error);
    });
    
    toast.info("Started a new grading session");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStepClick = (step: number) => {
    console.group("Step Navigation");
    console.log("Current state:", {
      currentStep,
      targetStep: step,
      highestStepReached: persistence.highestStepReached,
      filesCount: files.length,
      hasAssignmentData: !!assignmentData,
      gradesCount: grades.length
    });
    
    // Always save current state regardless of whether navigation succeeds
    persistence.saveWorkflowState(currentStep, files, assignmentData, grades);
                       
    // IMPROVED NAVIGATION LOGIC: Allow going to any step up to the highest previously reached step
    // This means if you've completed step 3 before, you can navigate between steps 1-3 freely
    const isStepAvailable = step <= persistence.highestStepReached;
    
    // Only enforce file and assignment data requirements for first-time navigation
    // IMPORTANT: Any step up to and including the highest step reached should be available
    const isGoingBack = step <= currentStep;
    const canGoForward = 
      isGoingBack || // Always allow going backwards or to current step
      step <= persistence.highestStepReached || // Already reached this step before
      (step === 2 && files.length > 0) || // First time to step 2, require files
      (step === 3 && assignmentData) ||   // First time to step 3, require assignment data
      (step === 4 && grades.length > 0);  // First time to step 4, require grades
    
    console.log("Navigation check:", {
      currentStep,
      targetStep: step,
      highestStepReached: persistence.highestStepReached,
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
    isProcessing: gradeManagement.isProcessingGrades,
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
    highestStepReached: persistence.highestStepReached // Expose this to the component
  };
}