
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractTextFromFile, findBestSubmissionFile, extractStudentInfoFromFilename } from "@/utils/fileUtils";
import { parseMoodleCSV, generateMoodleCSV } from "@/utils/csvUtils";
import { gradeWithOpenAI } from "@/utils/gradingUtils";
import type { AssignmentFormData } from "@/components/assignment/AssignmentFormTypes";

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
  
  // Preload grades from Moodle gradebook with full format data
  const preloadedGrades = (data: MoodleGradebookData) => {
    setMoodleGradebook(data);
    console.log("Preloaded Moodle gradebook data:", data);
    console.log("Student names in gradebook:", data.grades.map(g => g.fullName));
  };
  
  // Process files with OpenAI when ready
  useEffect(() => {
    const processFilesWithAI = async () => {
      if (currentStep === 3 && assignmentData && files.length > 0 && getApiKey() && !sampleDataLoaded && !isProcessing) {
        setIsProcessing(true);
        toast.info(`Processing ${files.length} files with AI...`);
        
        try {
          // Group files by folder (which usually contains student name)
          const filesByFolder: { [key: string]: File[] } = {};
          
          // First, organize files by their folder paths
          for (const file of files) {
            // Get the folder path or parent directory name
            const pathParts = file.webkitRelativePath ? file.webkitRelativePath.split('/') : file.name.split('/');
            let folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
            
            // If it's a flat structure but has _assignsubmission_ or _onlinetext_ in the name
            // Extract the folder from the filename pattern
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
          
          // Debug logs for folder names
          console.log('All folders to process:', Object.keys(filesByFolder));
          
          // For each folder, find student info and the best submission file
          const processedGrades: StudentGrade[] = [];
          let processedCount = 0;
          
          // More detailed debug logging
          if (moodleGradebook) {
            console.log('MATCHING DEBUG - Moodle gradebook students:');
            moodleGradebook.grades.forEach((student, idx) => {
              console.log(`[${idx}] ${student.fullName} (${typeof student.fullName})`);
            });
          }
          
          for (const folder in filesByFolder) {
            const folderFiles = filesByFolder[folder];
            if (folderFiles.length === 0) continue;
            
            // Extract student info from the folder name first, then fallback to file name
            const firstFile = folderFiles[0];
            const folderName = folder !== 'root' ? folder : '';
            
            console.log(`\nPROCESSING FOLDER: "${folderName}"`);
            
            // Improved student info extraction from folder name
            const studentInfo = extractStudentInfoFromFilename(firstFile.name, folderName);
            console.log(`Extracted student info:`, studentInfo);
            
            // Skip folders that appear to be "onlinetext" without a proper student name
            if (studentInfo.fullName.toLowerCase() === "onlinetext") {
              console.log(`Skipping folder with invalid student name "onlinetext"`);
              continue;
            }
            
            // Find the best file containing the submission content
            let submissionText = '';
            let submissionFile: File | null = null;
            
            // Separate onlinetext files from other files
            const onlineTextFiles = folderFiles.filter(file => file.name.includes('onlinetext'));
            const otherFiles = folderFiles.filter(file => !file.name.includes('onlinetext'));
            
            // First check non-onlinetext files for content
            for (const file of otherFiles) {
              try {
                const text = await extractTextFromFile(file);
                if (text.trim().length > 0) {
                  submissionText = text;
                  submissionFile = file;
                  break;
                }
              } catch (error) {
                console.error(`Error extracting text from ${file.name}:`, error);
              }
            }
            
            // If no content found in non-onlinetext files, check onlinetext HTML files
            if (!submissionText && onlineTextFiles.length > 0) {
              for (const file of onlineTextFiles) {
                try {
                  const text = await extractTextFromFile(file);
                  if (text.trim().length > 0) {
                    submissionText = text;
                    submissionFile = file;
                    break;
                  }
                } catch (error) {
                  console.error(`Error extracting text from ${file.name}:`, error);
                }
              }
            }
            
            // If still no content, use the first non-onlinetext file
            if (!submissionFile && otherFiles.length > 0) {
              submissionFile = otherFiles[0];
              try {
                submissionText = await extractTextFromFile(submissionFile);
              } catch (error) {
                console.error(`Error extracting text from fallback file ${submissionFile.name}:`, error);
                submissionText = '';
              }
            }
            // Last resort: use the first onlinetext file if no other files exist
            else if (!submissionFile && onlineTextFiles.length > 0) {
              submissionFile = onlineTextFiles[0];
              try {
                submissionText = await extractTextFromFile(submissionFile);
              } catch (error) {
                console.error(`Error extracting text from fallback file ${submissionFile.name}:`, error);
                submissionText = '';
              }
            }
            
            if (submissionFile) {
              // Check if there's a matching student in the preloaded Moodle grades
              let studentName = studentInfo.fullName;
              let studentEmail = studentInfo.email;
              let studentIdentifier = studentInfo.identifier;
              let originalRow = {};
              let matchFound = false;
              
              // Try to find a matching student in preloaded grades by name
              let matchingMoodleStudent = null;
              if (moodleGradebook && moodleGradebook.grades.length > 0) {
                console.log(`MATCHING - Trying to match "${studentInfo.fullName}" with students in gradebook`);
                
                // We'll try multiple matching strategies and score them
                const matchingStrategies = [
                  // 1. Exact full name match (case insensitive)
                  () => {
                    const exact = moodleGradebook.grades.find(grade => 
                      grade.fullName.toLowerCase() === studentInfo.fullName.toLowerCase()
                    );
                    if (exact) {
                      console.log(`✓ MATCH FOUND [Exact]: "${studentInfo.fullName}" = "${exact.fullName}"`);
                      return exact;
                    }
                    return null;
                  },
                  
                  // 2. Match first and last name individually
                  () => {
                    if (studentInfo.fullName.includes(' ')) {
                      // Get student name parts
                      const studentNameParts = studentInfo.fullName.toLowerCase().split(' ');
                      
                      // Find best matching student by comparing name parts
                      let bestMatch = null;
                      let bestMatchScore = 0;
                      
                      moodleGradebook.grades.forEach(grade => {
                        const gradebookNameParts = grade.fullName.toLowerCase().split(' ');
                        let matchScore = 0;
                        
                        // Count matching parts between the two names
                        studentNameParts.forEach(part => {
                          if (gradebookNameParts.includes(part)) {
                            matchScore++;
                          }
                        });
                        
                        // Check if this is a better match than we've found so far
                        if (matchScore > bestMatchScore) {
                          bestMatchScore = matchScore;
                          bestMatch = grade;
                        }
                      });
                      
                      if (bestMatch && bestMatchScore > 0) {
                        console.log(`✓ MATCH FOUND [Name Parts]: "${studentInfo.fullName}" matches parts of "${bestMatch.fullName}" with score ${bestMatchScore}`);
                        return bestMatch;
                      }
                    }
                    return null;
                  },
                  
                  // 3. Normalize names and try partial matching
                  () => {
                    const normalizedStudentName = studentInfo.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    
                    // Find best matching student by normalized name similarity
                    let bestMatch = null;
                    let bestMatchScore = 0;
                    
                    moodleGradebook.grades.forEach(grade => {
                      const normalizedGradebookName = grade.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
                      
                      // Check if either name contains the other
                      let matchScore = 0;
                      if (normalizedGradebookName.includes(normalizedStudentName)) {
                        matchScore = normalizedStudentName.length / normalizedGradebookName.length;
                      } else if (normalizedStudentName.includes(normalizedGradebookName)) {
                        matchScore = normalizedGradebookName.length / normalizedStudentName.length;
                      }
                      
                      if (matchScore > bestMatchScore) {
                        bestMatchScore = matchScore;
                        bestMatch = grade;
                      }
                    });
                    
                    if (bestMatch && bestMatchScore > 0.5) {  // Only use if the match is reasonably strong
                      console.log(`✓ MATCH FOUND [Normalized]: "${studentInfo.fullName}" normalized matches "${bestMatch.fullName}" with score ${bestMatchScore}`);
                      return bestMatch;
                    }
                    return null;
                  },
                  
                  // 4. Fuzzy matching - check each word in student name against each word in gradebook names
                  () => {
                    if (studentInfo.fullName) {
                      const studentWords = studentInfo.fullName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                      
                      let bestMatch = null;
                      let bestMatchScore = 0;
                      
                      moodleGradebook.grades.forEach(grade => {
                        const gradeWords = grade.fullName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                        let matchScore = 0;
                        
                        studentWords.forEach(sWord => {
                          gradeWords.forEach(gWord => {
                            // Check if words are similar or contain each other
                            if (sWord === gWord || sWord.includes(gWord) || gWord.includes(sWord)) {
                              matchScore++;
                            }
                          });
                        });
                        
                        if (matchScore > bestMatchScore) {
                          bestMatchScore = matchScore;
                          bestMatch = grade;
                        }
                      });
                      
                      if (bestMatch && bestMatchScore > 0) {
                        console.log(`✓ MATCH FOUND [Fuzzy]: "${studentInfo.fullName}" words match "${bestMatch.fullName}" with score ${bestMatchScore}`);
                        return bestMatch;
                      }
                    }
                    return null;
                  },
                  
                  // 5. Try matching folder name directly against full names
                  () => {
                    if (folderName && folderName !== 'root') {
                      // Clean up folder name - replace underscores and dashes with spaces
                      let cleanedFolderName = folderName;
                      
                      // Remove _assignsubmission_, _onlinetext_, etc.
                      cleanedFolderName = cleanedFolderName.replace(/_assignsubmission_.*$/, '');
                      cleanedFolderName = cleanedFolderName.replace(/_onlinetext_.*$/, '');
                      
                      // Remove ID number if present
                      cleanedFolderName = cleanedFolderName.replace(/_\d+$/, '');
                      
                      // Replace separators with spaces
                      cleanedFolderName = cleanedFolderName.replace(/[_-]/g, ' ').trim();
                      
                      let bestMatch = null;
                      let bestMatchScore = 0;
                      
                      moodleGradebook.grades.forEach(grade => {
                        // Try exact match first
                        if (grade.fullName.toLowerCase() === cleanedFolderName.toLowerCase()) {
                          bestMatch = grade;
                          bestMatchScore = 100; // Perfect match
                        }
                        // Then try contains match
                        else if (bestMatchScore < 50) {
                          const normalizedGrade = grade.fullName.toLowerCase();
                          const normalizedFolder = cleanedFolderName.toLowerCase();
                          
                          if (normalizedGrade.includes(normalizedFolder) || normalizedFolder.includes(normalizedGrade)) {
                            bestMatch = grade;
                            bestMatchScore = 50;
                          }
                        }
                      });
                      
                      if (bestMatch) {
                        console.log(`✓ MATCH FOUND [Folder Name]: "${cleanedFolderName}" matches "${bestMatch.fullName}" with score ${bestMatchScore}`);
                        return bestMatch;
                      }
                    }
                    return null;
                  }
                ];
                
                // Try each matching strategy in order
                for (const strategy of matchingStrategies) {
                  matchingMoodleStudent = strategy();
                  if (matchingMoodleStudent) {
                    matchFound = true;
                    break;
                  }
                }
                
                if (matchingMoodleStudent) {
                  console.log(`SUCCESS: Matched "${studentInfo.fullName}" to gradebook student "${matchingMoodleStudent.fullName}"`);
                  studentName = matchingMoodleStudent.fullName;
                  studentEmail = matchingMoodleStudent.email;
                  studentIdentifier = matchingMoodleStudent.identifier;
                  originalRow = matchingMoodleStudent.originalRow || {};
                } else {
                  console.log(`NO MATCH FOUND for "${studentInfo.fullName}" in gradebook`);
                }
              }
              
              // Process with OpenAI
              const gradingResult = await gradeWithOpenAI(
                submissionText, 
                assignmentData, 
                getApiKey() || "",
                assignmentData.gradingScale // Pass the grading scale to the AI
              );
              
              // Add to processed grades with properly extracted student info
              processedGrades.push({
                identifier: studentIdentifier,
                fullName: studentName,
                email: studentEmail,
                status: "Graded",
                grade: gradingResult.grade,
                feedback: gradingResult.feedback,
                file: submissionFile,
                edited: false,
                originalRow: originalRow
              });
              
              processedCount++;
              // Update progress
              if (processedCount % 5 === 0 || processedCount === Object.keys(filesByFolder).length) {
                toast.info(`Processed ${processedCount}/${Object.keys(filesByFolder).length} submissions`);
              }
            }
          }
          
          console.log("FINISHED PROCESSING - Processed Grades:", processedGrades.map(g => g.fullName));
          
          // If there are preloaded moodle grades, merge them with the AI grades
          if (moodleGradebook && moodleGradebook.grades.length > 0) {
            const mergedGrades = [...moodleGradebook.grades];
            
            // For each processed grade, try to find a matching student in moodleGrades
            processedGrades.forEach(aiGrade => {
              console.log(`Merging grade for ${aiGrade.fullName}`);
              
              const moodleIndex = mergedGrades.findIndex(grade => 
                grade.fullName.toLowerCase() === aiGrade.fullName.toLowerCase()
              );
              
              if (moodleIndex >= 0) {
                console.log(`Found matching student in merged grades at index ${moodleIndex}`);
                // Update the existing grade but keep the original row data
                mergedGrades[moodleIndex] = {
                  ...mergedGrades[moodleIndex],
                  grade: aiGrade.grade,
                  feedback: aiGrade.feedback,
                  file: aiGrade.file,
                  edited: false
                };
              } else {
                // No matching student, add the new grade
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
          
          // Fallback to sample data if processing fails
          fetchSampleData();
        } finally {
          setIsProcessing(false);
        }
      } else if (currentStep === 3 && assignmentData && files.length > 0 && !getApiKey() && !sampleDataLoaded) {
        // If no API key, load sample data
        fetchSampleData();
      }
    };
    
    processFilesWithAI();
  }, [currentStep, assignmentData, files, sampleDataLoaded, isProcessing, moodleGradebook]);

  // Helper to get API key from localStorage
  const getApiKey = (): string | null => {
    return localStorage.getItem("openai_api_key");
  };

  // Fallback function to load sample data
  const fetchSampleData = () => {
    if (!sampleDataLoaded) {
      fetch('/sample_moodle_grades.csv')
        .then(response => response.text())
        .then(csvData => {
          // Parse the CSV to extract headers and keep original format
          const rows = csvData.split('\n');
          const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          
          // Find the grade and feedback column indices
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
            
            // Create an object with the original row data
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
          
          // If we have moodle gradebook data, use it
          if (moodleGradebook) {
            const mergedGrades = [...moodleGradebook.grades];
            
            // Generate random grades and feedback for demonstration
            mergedGrades.forEach((grade, index) => {
              const maxPoints = assignmentData?.gradingScale || 100;
              grade.grade = Math.floor(Math.random() * (maxPoints * 0.7)) + (maxPoints * 0.3); // Random grade between 30% and 100%
              grade.feedback = `This is sample feedback for ${grade.fullName}. In a real scenario, this would be generated by AI based on the submission content.`;
              grade.file = files[index % files.length];
              grade.edited = false;
            });
            
            setGrades(mergedGrades);
          } else {
            // Attach files to grades
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
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAssignmentSubmit = (data: AssignmentFormData) => {
    setAssignmentData(data);
    setCurrentStep(3);
    setSampleDataLoaded(false);
    // Smooth scroll to top
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
    // Check if all grades have been reviewed
    const pendingReviews = grades.filter(grade => !grade.edited).length;
    
    if (pendingReviews > 0) {
      toast.warning(`You still have ${pendingReviews} unreviewed grades. Please review all grades before proceeding.`);
      return;
    }
    
    setCurrentStep(4);
    // Smooth scroll to top
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
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      // Smooth scroll to top
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
