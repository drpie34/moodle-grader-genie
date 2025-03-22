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
  firstName?: string; // Added for better name matching
  lastName?: string;  // Added for better name matching
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
  
  useEffect(() => {
    const processFilesWithAI = async () => {
      if (currentStep === 3 && assignmentData && files.length > 0 && getApiKey() && !sampleDataLoaded && !isProcessing) {
        setIsProcessing(true);
        toast.info(`Processing ${files.length} files with AI...`);
        
        try {
          const filesByFolder: { [key: string]: File[] } = {};
          
          for (const file of files) {
            const pathParts = file.webkitRelativePath ? 
              file.webkitRelativePath.split('/') : 
              file.name.split('/');
            
            let folderPath = '';
            if (pathParts.length > 1) {
              if (file.webkitRelativePath) {
                folderPath = pathParts.slice(0, -1).join('/');
                if (folderPath.includes('/')) {
                  const folders = folderPath.split('/');
                  folderPath = folders[folders.length - 1];
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
          
          for (const folder in filesByFolder) {
            const folderFiles = filesByFolder[folder];
            if (folderFiles.length === 0) continue;
            
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
              continue;
            }
            
            let submissionText = '';
            let submissionFile: File | null = null;
            
            const onlineTextFiles = folderFiles.filter(file => file.name.includes('onlinetext'));
            const otherFiles = folderFiles.filter(file => !file.name.includes('onlinetext'));
            
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
            
            if (!submissionFile && otherFiles.length > 0) {
              submissionFile = otherFiles[0];
              try {
                submissionText = await extractTextFromFile(submissionFile);
              } catch (error) {
                console.error(`Error extracting text from fallback file ${submissionFile.name}:`, error);
                submissionText = '';
              }
            } else if (!submissionFile && onlineTextFiles.length > 0) {
              submissionFile = onlineTextFiles[0];
              try {
                submissionText = await extractTextFromFile(submissionFile);
              } catch (error) {
                console.error(`Error extracting text from fallback file ${submissionFile.name}:`, error);
                submissionText = '';
              }
            }
            
            if (submissionFile) {
              let studentName = studentInfo.fullName;
              let studentEmail = studentInfo.email;
              let studentIdentifier = studentInfo.identifier;
              let originalRow = {};
              let matchFound = false;
              
              let matchingMoodleStudent = null;
              if (moodleGradebook && moodleGradebook.grades.length > 0) {
                console.log(`MATCHING - Trying to match "${studentInfo.fullName}" with students in gradebook`);
                
                const matchingStrategies = [
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
                  
                  () => {
                    const withFirstLastName = moodleGradebook.grades.find(grade => 
                      grade.firstName && grade.lastName && 
                      `${grade.firstName} ${grade.lastName}`.toLowerCase() === studentInfo.fullName.toLowerCase()
                    );
                    if (withFirstLastName) {
                      console.log(`✓ MATCH FOUND [First+Last]: "${studentInfo.fullName}" = "${withFirstLastName.firstName} ${withFirstLastName.lastName}"`);
                      return withFirstLastName;
                    }
                    return null;
                  },
                  
                  () => {
                    if (studentInfo.fullName.includes(',')) {
                      const parts = studentInfo.fullName.split(',').map(p => p.trim());
                      if (parts.length === 2) {
                        const lastName = parts[0];
                        const firstName = parts[1];
                        
                        const lastFirstMatch = moodleGradebook.grades.find(grade => 
                          grade.firstName && grade.lastName && 
                          grade.firstName.toLowerCase() === firstName.toLowerCase() && 
                          grade.lastName.toLowerCase() === lastName.toLowerCase()
                        );
                        
                        if (lastFirstMatch) {
                          console.log(`✓ MATCH FOUND [Last,First]: "${studentInfo.fullName}" = "${lastFirstMatch.lastName}, ${lastFirstMatch.firstName}"`);
                          return lastFirstMatch;
                        }
                      }
                    }
                    return null;
                  },
                  
                  () => {
                    if (studentInfo.fullName.includes(' ')) {
                      const studentNameParts = studentInfo.fullName.toLowerCase().split(' ');
                      
                      let bestMatch = null;
                      let bestMatchScore = 0;
                      
                      moodleGradebook.grades.forEach(grade => {
                        const gradebookNameParts = grade.fullName.toLowerCase().split(' ');
                        let matchScore = 0;
                        
                        studentNameParts.forEach(part => {
                          if (gradebookNameParts.includes(part)) {
                            matchScore++;
                          }
                        });
                        
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
                  
                  () => {
                    const normalizedStudentName = studentInfo.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    
                    let bestMatch = null;
                    let bestMatchScore = 0;
                    
                    moodleGradebook.grades.forEach(grade => {
                      const normalizedGradebookName = grade.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
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
                    
                    if (bestMatch && bestMatchScore > 0.5) {
                      console.log(`✓ MATCH FOUND [Normalized]: "${studentInfo.fullName}" normalized matches "${bestMatch.fullName}" with score ${bestMatchScore}`);
                      return bestMatch;
                    }
                    return null;
                  },
                  
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
                  
                  () => {
                    if (folderName && folderName !== 'root') {
                      let cleanedFolderName = folderName;
                      
                      cleanedFolderName = cleanedFolderName.replace(/_assignsubmission_.*$/, '');
                      cleanedFolderName = cleanedFolderName.replace(/_onlinetext_.*$/, '');
                      
                      cleanedFolderName = cleanedFolderName.replace(/_\d+$/, '');
                      
                      cleanedFolderName = cleanedFolderName.replace(/[_-]/g, ' ').trim();
                      
                      let bestMatch = null;
                      let bestMatchScore = 0;
                      
                      moodleGradebook.grades.forEach(grade => {
                        if (grade.fullName.toLowerCase() === cleanedFolderName.toLowerCase()) {
                          bestMatch = grade;
                          bestMatchScore = 100;
                        } else if (bestMatchScore < 50) {
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
                  },
                  
                  () => {
                    if (folderName && folderName !== 'root') {
                      const studentNameParts = studentInfo.fullName.split(' ');
                      if (studentNameParts.length >= 2) {
                        const studentFirstName = studentNameParts[0].toLowerCase();
                        const studentLastName = studentNameParts[studentNameParts.length - 1].toLowerCase();
                        
                        const namePartsMatch = moodleGradebook.grades.find(grade => {
                          if (grade.firstName && grade.lastName) {
                            return grade.firstName.toLowerCase() === studentFirstName && 
                                   grade.lastName.toLowerCase() === studentLastName;
                          }
                          
                          const gradeNameParts = grade.fullName.split(' ');
                          if (gradeNameParts.length >= 2) {
                            const gradeFirstName = gradeNameParts[0].toLowerCase();
                            const gradeLastName = gradeNameParts[gradeNameParts.length - 1].toLowerCase();
                            
                            return gradeFirstName === studentFirstName && 
                                   gradeLastName === studentLastName;
                          }
                          
                          return false;
                        });
                        
                        if (namePartsMatch) {
                          console.log(`✓ MATCH FOUND [First+Last Parts]: "${studentFirstName} ${studentLastName}" matches "${namePartsMatch.fullName}"`);
                          return namePartsMatch;
                        }
                      }
                    }
                    return null;
                  }
                ];
                
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
              
              const gradingResult = await gradeWithOpenAI(
                submissionText, 
                assignmentData, 
                getApiKey() || "",
                assignmentData.gradingScale
              );
              
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
              if (processedCount % 5 === 0 || processedCount === Object.keys(filesByFolder).length) {
                toast.info(`Processed ${processedCount}/${Object.keys(filesByFolder).length} submissions`);
              }
            }
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
  }, [currentStep, assignmentData, files, sampleDataLoaded, isProcessing, moodleGradebook]);

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
