
/**
 * Type definitions for workflow components
 */

export interface GradebookInfo {
  headers: string[];
  assignmentColumn: string;
  feedbackColumn: string;
}

export interface StudentData {
  fullName: string;
  firstName: string;
  lastName: string;
  email?: string;
  identifier: string;
}

export interface FolderStructure {
  [folder: string]: File[];
}
