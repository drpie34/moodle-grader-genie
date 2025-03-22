
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractTextFromFile, findBestSubmissionFile } from "@/utils/fileUtils";
import { parseMoodleCSV } from "@/utils/csvUtils";
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
}

export function useGradingWorkflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [assignmentData, setAssignmentData] = useState<AssignmentFormData | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [sampleDataLoaded, setSampleDataLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Process files with OpenAI when ready
  useEffect(() => {
    const processFilesWithAI = async () => {
      if (currentStep === 3 && assignmentData && files.length > 0 && getApiKey() && !sampleDataLoaded && !isProcessing) {
        setIsProcessing(true);
        toast.info(`Processing ${files.length} files with AI...`);
        
        try {
          // Group files by student ID (simplified approach)
          const filesByStudent: { [key: string]: File[] } = {};
          
          for (const file of files) {
            // Extract a student identifier from the filename
            // This is a simplified approach - may need to be adjusted based on actual naming conventions
            const studentId = file.name.split('_')[0];
            
            if (!filesByStudent[studentId]) {
              filesByStudent[studentId] = [];
            }
            
            filesByStudent[studentId].push(file);
          }
          
          // For each student, find the best submission file and process it
          const processedGrades: StudentGrade[] = [];
          let processedCount = 0;
          
          for (const studentId in filesByStudent) {
            const studentFiles = filesByStudent[studentId];
            
            // Separate onlinetext files from other files
            const onlineTextFiles = studentFiles.filter(file => file.name.includes('onlinetext'));
            const otherFiles = studentFiles.filter(file => !file.name.includes('onlinetext'));
            
            // Find the best file containing the submission content
            let submissionText = '';
            let submissionFile: File | null = null;
            
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
              // Process with OpenAI
              const studentName = submissionFile.name.split('.')[0].replace(/_/g, ' ');
              
              const gradingResult = await gradeWithOpenAI(submissionText, assignmentData, getApiKey() || "");
              
              // Add to processed grades
              processedGrades.push({
                identifier: studentId,
                fullName: studentName,
                email: `${studentId}@example.com`,
                status: "Graded",
                grade: gradingResult.grade,
                feedback: gradingResult.feedback,
                file: submissionFile,
                edited: false
              });
              
              processedCount++;
              // Update progress
              if (processedCount % 5 === 0 || processedCount === Object.keys(filesByStudent).length) {
                toast.info(`Processed ${processedCount}/${Object.keys(filesByStudent).length} submissions`);
              }
            }
          }
          
          setGrades(processedGrades);
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
  }, [currentStep, assignmentData, files, sampleDataLoaded, isProcessing]);

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
          const parsedGrades = parseMoodleCSV(csvData);
          
          // Attach files to grades
          const gradesWithFiles = parsedGrades.map((grade, index) => ({
            ...grade,
            file: files[index % files.length],
            edited: false
          }));
          
          setGrades(gradesWithFiles);
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
    handleFilesSelected,
    handleStepOneComplete,
    handleAssignmentSubmit,
    handleUpdateGrade,
    handleApproveAll,
    handleContinueToDownload,
    handleReset,
    handleStepClick
  };
}
