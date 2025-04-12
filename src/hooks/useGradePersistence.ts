import { useEffect, useState } from "react";
import React from "react";
import { toast } from "sonner";
import { AssignmentFormData } from "@/components/assignment/AssignmentFormTypes";
import { cacheFileMetadata, getCachedFileMetadata } from "@/utils/fileUtils";
import { StudentGrade } from "./use-grading-workflow";

/**
 * Custom hook for managing state persistence between sessions
 */
export function useGradePersistence() {
  // Get saved step from localStorage, with default to step 1
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

  // Track the highest step the user has reached
  const [highestStepReached, setHighestStepReached] = useState<number>(() => {
    // Try to load highest step from localStorage
    const saved = localStorage.getItem('moodle_grader_highest_step');
    return saved ? parseInt(saved, 10) : 1;
  });

  // Update highestStepReached whenever currentStep increases
  const updateHighestStep = (currentStep: number) => {
    if (currentStep > highestStepReached) {
      setHighestStepReached(currentStep);
      localStorage.setItem('moodle_grader_highest_step', currentStep.toString());
      console.log(`Updated highest step reached to ${currentStep}`);
    }
  };

  /**
   * Save the entire workflow state to localStorage
   */
  const saveWorkflowState = async (
    currentStep: number,
    files: File[],
    assignmentData: AssignmentFormData | null,
    grades: StudentGrade[]
  ) => {
    try {
      console.group("Saving Workflow State");
      
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
        await cacheFileMetadata(files).catch(err => console.error("Failed to cache file metadata:", err));
      } else {
        console.warn("No files to save");
      }
      
      // Save highest step reached
      localStorage.setItem('moodle_grader_highest_step', highestStepReached.toString());
      
      // Update localStorage with current step for potential refresh recovery
      localStorage.setItem('moodle_grader_current_step', currentStep.toString());
      console.groupEnd();
    } catch (error) {
      console.error("Error saving workflow state:", error);
    }
  };

  /**
   * Load assignment data from localStorage
   */
  const loadAssignmentData = (): AssignmentFormData | null => {
    try {
      const savedData = localStorage.getItem('moodle_grader_assignment_data');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error("Error loading assignment data:", error);
    }
    return null;
  };

  /**
   * Load grades from localStorage
   */
  const loadGrades = (): StudentGrade[] => {
    try {
      const savedGrades = localStorage.getItem('moodle_grader_grades');
      if (savedGrades) {
        return JSON.parse(savedGrades);
      }
    } catch (error) {
      console.error("Error loading grades:", error);
    }
    return [];
  };

  /**
   * Check for previously uploaded files
   * Returns info about previously uploaded files if they exist
   */
  const checkPreviousFiles = async (): Promise<{
    hasPreviousFiles: boolean;
    fileCount: number;
    filePaths: string[];
  }> => {
    const fileCount = sessionStorage.getItem('moodle_grader_file_count');
    
    if (!fileCount) {
      return { hasPreviousFiles: false, fileCount: 0, filePaths: [] };
    }
    
    try {
      // Check if reset was triggered
      const wasReset = sessionStorage.getItem('moodle_grader_reset_timestamp');
      if (wasReset) {
        // Clear the reset marker after checking it
        sessionStorage.removeItem('moodle_grader_reset_timestamp');
        return { hasPreviousFiles: false, fileCount: 0, filePaths: [] };
      }
      
      // Try to get more detailed file information from cache
      let filePaths: string[] = [];
      
      // First try to load from IndexedDB
      try {
        const metadata = await getCachedFileMetadata();
        if (metadata && metadata.length > 0) {
          filePaths = metadata.map(meta => meta.path || meta.name).slice(0, 5);
          return {
            hasPreviousFiles: true,
            fileCount: parseInt(fileCount, 10),
            filePaths
          };
        }
      } catch (dbError) {
        console.error("Error accessing cached file metadata:", dbError);
      }
      
      // Fall back to sessionStorage
      const savedPaths = sessionStorage.getItem('moodle_grader_file_paths');
      if (savedPaths) {
        filePaths = JSON.parse(savedPaths);
      }
      
      return {
        hasPreviousFiles: true,
        fileCount: parseInt(fileCount, 10),
        filePaths
      };
    } catch (error) {
      console.error("Error checking previous files:", error);
      return { hasPreviousFiles: false, fileCount: 0, filePaths: [] };
    }
  };

  /**
   * Notify the user about previously uploaded files
   */
  const notifyPreviousFiles = (previousFileInfo: {
    fileCount: number,
    filePaths: string[]
  }) => {
    // Check if reset was triggered (don't show message after reset)
    const wasReset = sessionStorage.getItem('moodle_grader_reset_timestamp');
    if (wasReset) return;
    
    if (previousFileInfo.fileCount > 0) {
      const fileInfo = previousFileInfo.filePaths.slice(0, 3);
      const moreFiles = previousFileInfo.fileCount > 3 ? ` and ${previousFileInfo.fileCount - 3} more` : '';
      
      // Show toast with detailed information - using string format instead of JSX
      toast.info(`Previous files found: ${fileInfo.join(', ')}${moreFiles}. Please re-upload your files to continue.`);
    }
  };

  /**
   * Reset all persisted state - used for the "Start Over" button
   */
  const resetAllState = () => {
    // Clear all localStorage and sessionStorage data
    localStorage.removeItem('moodle_grader_assignment_data');
    localStorage.removeItem('moodle_grader_grades');
    localStorage.removeItem('moodle_grader_current_step');
    localStorage.removeItem('moodle_grader_highest_step');
    
    // Clear session storage immediate markers
    sessionStorage.removeItem('moodle_grader_file_count');
    sessionStorage.removeItem('moodle_grader_file_paths');
    
    // Set a reset timestamp to help components know we just reset
    sessionStorage.setItem('moodle_grader_reset_timestamp', Date.now().toString());
  };

  return {
    getSavedStep,
    highestStepReached,
    updateHighestStep,
    saveWorkflowState,
    loadAssignmentData,
    loadGrades,
    checkPreviousFiles,
    notifyPreviousFiles,
    resetAllState
  };
}