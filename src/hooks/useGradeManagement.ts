import { useState } from "react";
import { toast } from "sonner";
import { AssignmentFormData } from "@/components/assignment/AssignmentFormTypes";
import { gradeWithOpenAI } from "@/utils/gradingUtils";
import { StudentGrade } from "./use-grading-workflow";
import type { FileProcessingResult } from "./useFileProcessing";

/**
 * Custom hook for student grade management and grading operations
 */
export function useGradeManagement() {
  const [isProcessingGrades, setIsProcessingGrades] = useState(false);
  
  /**
   * Update a specific student's grade
   */
  const updateStudentGrade = (
    grades: StudentGrade[], 
    index: number, 
    grade: number, 
    feedback: string
  ): StudentGrade[] => {
    const updatedGrades = [...grades];
    updatedGrades[index] = {
      ...updatedGrades[index],
      grade,
      feedback,
      edited: true
    };
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('moodle_grader_grades', JSON.stringify(updatedGrades));
    } catch (error) {
      console.error("Error saving updated grades to localStorage:", error);
    }
    
    toast.success("Feedback approved");
    return updatedGrades;
  };

  /**
   * Mark all grades as edited/approved
   */
  const approveAllGrades = (grades: StudentGrade[]): StudentGrade[] => {
    const updatedGrades = grades.map(grade => ({ ...grade, edited: true }));
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('moodle_grader_grades', JSON.stringify(updatedGrades));
    } catch (error) {
      console.error("Error saving approved grades to localStorage:", error);
    }
    
    toast.success("All feedback approved");
    return updatedGrades;
  };

  /**
   * Check if all grades have been reviewed before proceeding
   */
  const canProceedToDownload = (grades: StudentGrade[]): boolean => {
    const pendingReviews = grades.filter(grade => !grade.edited).length;
    
    if (pendingReviews > 0) {
      toast.warning(`You still have ${pendingReviews} unreviewed grades. Please review all grades before proceeding.`);
      return false;
    }
    
    return true;
  };

  /**
   * Get the API key from storage
   */
  const getApiKey = (): string | null => {
    // Check if user opted to use server API key
    const useServerKey = localStorage.getItem("use_server_api_key");
    if (useServerKey === "true") {
      console.log("Using server API key mode");
      return "server"; // Special marker for server-side API key
    }
    
    const personalKey = localStorage.getItem("openai_api_key");
    console.log("Using personal API key:", personalKey ? "Yes (key found)" : "No (no key found)");
    return personalKey;
  };

  /**
   * Process a student submission with OpenAI
   */
  const processSubmissionWithAI = async (
    studentInfo: any,
    result: FileProcessingResult,
    assignmentData: AssignmentFormData,
    originalRow?: Record<string, string>
  ): Promise<StudentGrade> => {
    // Handle empty submissions - don't send to OpenAI
    if (result.hasEmptySubmission || 
        result.submissionText === "[EMPTY_SUBMISSION]" || 
        result.submissionText === "[NO_SUBMISSION]") {
      console.log(`Empty submission detected for ${studentInfo.fullName} - not sending to OpenAI`);
      
      return {
        identifier: studentInfo.identifier,
        fullName: studentInfo.fullName,
        firstName: studentInfo.firstName || "",
        lastName: studentInfo.lastName || "",
        email: studentInfo.email || `${studentInfo.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        status: "No Submission",
        grade: null as any, // Use null to prevent displaying a 0
        feedback: "", // No feedback for empty submissions
        file: result.submissionFile,
        edited: true, // Mark as edited to prevent prompts
        originalRow: originalRow || {},
        contentPreview: "No submission content available for this student."
      };
    }
    
    // Check for unsupported file type warning
    const isUnsupportedFile = result.submissionText.includes('[UNSUPPORTED_FILE_TYPE:') && 
                              !result.isImageFile;
                              
    if (isUnsupportedFile) {
      console.warn(`Unsupported file detected for ${studentInfo.fullName}`);
      // Extract the warning message
      const fileTypeWarning = result.submissionText.match(/\[UNSUPPORTED_FILE_TYPE:.*?\]/)?.[0] || 'Unsupported file type detected';
      
      return {
        identifier: studentInfo.identifier,
        fullName: studentInfo.fullName,
        firstName: studentInfo.firstName || "",
        lastName: studentInfo.lastName || "",
        email: studentInfo.email || `${studentInfo.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        status: "Manual Review Required",
        grade: null as any, // Use null to prevent displaying a 0
        feedback: `${fileTypeWarning} Please review this submission manually. This automated message was generated because the submission contains a file type that cannot be automatically processed.`,
        file: result.submissionFile,
        edited: false, // Needs review
        originalRow: originalRow || {},
        contentPreview: result.submissionText
      };
    }

    try {
      console.log(`Grading submission for ${studentInfo.fullName} with OpenAI`);
      
      // Special handling for image submissions - direct upload to OpenAI
      const isDirectImageSubmission = result.isImageFile || result.submissionText === '[IMAGE_SUBMISSION]';
      
      if (isDirectImageSubmission) {
        console.log(`Using direct image upload for submission from ${studentInfo.fullName}`);
      }
      
      // Pass the file along for image submissions
      const gradingResult = await gradeWithOpenAI(
        result.submissionText, 
        assignmentData, 
        getApiKey() || "",
        assignmentData.gradingScale,
        isDirectImageSubmission ? result.submissionFile : undefined
      );
      
      console.log(`Grading result for ${studentInfo.fullName}: Grade ${gradingResult.grade}, Feedback length: ${gradingResult.feedback.length} chars`);
      
      return {
        identifier: studentInfo.identifier,
        fullName: studentInfo.fullName,
        firstName: studentInfo.firstName || "",
        lastName: studentInfo.lastName || "",
        email: studentInfo.email || `${studentInfo.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        status: "Graded",
        grade: gradingResult.grade,
        feedback: gradingResult.feedback,
        file: result.submissionFile,
        edited: false,
        originalRow: originalRow || {},
        contentPreview: result.submissionText.slice(0, 200) + (result.submissionText.length > 200 ? '...' : '')
      };
    } catch (error) {
      console.error(`Error grading submission for ${studentInfo.fullName}:`, error);
      
      return {
        identifier: studentInfo.identifier,
        fullName: studentInfo.fullName,
        firstName: studentInfo.firstName || "",
        lastName: studentInfo.lastName || "",
        email: studentInfo.email || `${studentInfo.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        status: "Error",
        grade: null as any, // Use null instead of 0 to prevent displaying a grade
        feedback: `Error grading submission: ${error instanceof Error ? error.message : 'Unknown error'}. Please grade manually.`,
        file: result.submissionFile,
        edited: false,
        originalRow: originalRow || {},
        contentPreview: result.submissionText.slice(0, 200) + (result.submissionText.length > 200 ? '...' : '')
      };
    }
  };

  /**
   * Merge AI-generated grades with Moodle gradebook data
   */
  const mergeGradebookData = (
    aiGrades: StudentGrade[], 
    moodleGrades: StudentGrade[],
    assignmentData: AssignmentFormData | null
  ): StudentGrade[] => {
    if (!moodleGrades || moodleGrades.length === 0) {
      return aiGrades;
    }
    
    const mergedGrades = [...moodleGrades];
    console.log("Initial gradebook students before merging:", mergedGrades.map(g => g.fullName));
    
    // First, create a set of all student names that were processed (had submissions)
    const processedStudentNames = new Set(aiGrades.map(g => g.fullName.toLowerCase()));
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
    aiGrades.forEach(aiGrade => {
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
    
    return mergedGrades;
  };

  return {
    isProcessingGrades,
    setIsProcessingGrades,
    updateStudentGrade,
    approveAllGrades,
    canProceedToDownload,
    getApiKey,
    processSubmissionWithAI,
    mergeGradebookData
  };
}