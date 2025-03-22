import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractTextFromFile, extractTextFromHTML, findBestSubmissionFile, extractStudentInfoFromFilename } from "@/utils/fileUtils";
import { parseMoodleCSV, generateMoodleCSV } from "@/utils/csvUtils";
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
  const [currentStep, setCurrentStep] = useState(1);
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
  
  const extractTextWithCache = async (file: File): Promise<string> => {
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
    
    if (textExtractionCache.has(cacheKey)) {
      return textExtractionCache.get(cacheKey) as string;
    }
    
    try {
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
      return "";
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
  
  useEffect(() => {
    if (files.length > 0) {
      const structure = organizeFilesByFolder();
      setFolderStructure(structure);
    }
  }, [files]);
  
  useEffect(() => {
    const processFilesWithAI = async () => {
      if (currentStep === 3 && assignmentData && files.length > 0 && getApiKey() && !sampleDataLoaded && !isProcessing) {
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
                } catch (error) {
                  console.error(`Error grading submission for ${studentName}:`, error);
                  processedGrades.push({
                    identifier: studentIdentifier,
                    fullName: studentName,
                    firstName: firstName,
                    lastName: lastName,
                    email: studentEmail,
                    status: "Error",
                    grade: 0,
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
          
          console.log("FINISHED PROCESSING - Processed Grades:", processedGrades.map(g => g.fullName));
          
          if (moodleGradebook && moodleGradebook.grades.length > 0) {
            const mergedGrades = [...moodleGradebook.grades];
            
            processedGrades.forEach(aiGrade => {
              console.log(`Merging grade for ${aiGrade.fullName}`);
              
              const moodleIndex = mergedGrades.findIndex(grade => 
                grade.fullName.toLowerCase() === aiGrade.fullName.toLowerCase()
              );
              
              if (moodleIndex >= 0) {
                console.log(`Found matching student in merged grades at index ${moodleIndex}`);
                mergedGrades[moodleIndex] = {
                  ...mergedGrades[moodleIndex],
                  grade: aiGrade.grade,
                  feedback: aiGrade.feedback,
                  file: aiGrade.file,
                  contentPreview: aiGrade.contentPreview,
                  edited: false
                };
              } else {
                console.log(`No matching student found in merged grades for ${aiGrade.fullName}, adding new entry`);
                mergedGrades.push(aiGrade);
              }
            });
            
            setGrades(mergedGrades);
          } else {
            setGrades(processedGrades);
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
      } else if (currentStep === 3 && assignmentData && files.length > 0 && !getApiKey() && !sampleDataLoaded) {
        fetchSampleData();
      }
    };
    
    processFilesWithAI();
  }, [currentStep, assignmentData, files, sampleDataLoaded, isProcessing, moodleGradebook, folderStructure]);

  const getApiKey = (): string | null => {
    return localStorage.getItem("openai_api_key");
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
          
          if (!getApiKey()) {
            toast.info("Using sample data. Add an OpenAI API key for real grading.");
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
    if (step < currentStep) {
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
