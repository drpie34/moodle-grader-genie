
/**
 * CSV utility functions for importing and exporting grade data
 */

// Re-export all the CSV utilities from a single entry point
export * from './parseCSV';
export * from './columnDetection';
export * from './moodleParser';
export * from './moodleExport';

// Export the MoodleGradebookFormat type for consumers
export interface MoodleGradebookFormat {
  headers: string[];
  assignmentColumn: string;
  feedbackColumn: string;
}
