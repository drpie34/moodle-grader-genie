
/**
 * Moodle-specific CSV parser
 */

import { parseCSV, extractStudentGrades } from './parseCSV';
import { StudentGrade } from '@/hooks/use-grading-workflow';

export interface MoodleGradebookData {
  headers: string[];
  grades: StudentGrade[];
  assignmentColumn?: string;
  feedbackColumn?: string;
  hasFirstLastColumns?: boolean;
}

/**
 * Upload and process a Moodle gradebook CSV file
 */
export async function uploadMoodleGradebook(file: File): Promise<MoodleGradebookData> {
  try {
    console.log(`Processing Moodle gradebook file: ${file.name} (${file.type}, ${file.size} bytes)`);
    
    // Read the file content
    const fileText = await readFileAsText(file);
    if (!fileText) {
      throw new Error("Could not read file content");
    }
    
    // Parse the CSV content
    const parsedCSV = parseCSV(fileText);
    
    // Extract student grades from the parsed CSV
    const { grades, assignmentColumn, feedbackColumn } = extractStudentGrades(parsedCSV);
    
    // Detect if we have separate first and last name columns
    const hasFirstLastColumns = grades.some(grade => grade.firstName && grade.lastName);
    
    // Return the parsed data
    const result: MoodleGradebookData = {
      headers: parsedCSV.headers,
      grades,
      assignmentColumn,
      feedbackColumn,
      hasFirstLastColumns
    };
    
    console.log("Moodle gradebook parsed successfully:", {
      studentCount: grades.length,
      assignmentColumn,
      feedbackColumn,
      hasFirstLastColumns,
      headerCount: parsedCSV.headers.length
    });
    
    return result;
  } catch (error) {
    console.error("Error processing Moodle gradebook:", error);
    throw new Error(`Error processing Moodle gradebook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read a file as text
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("FileReader did not return any content"));
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
}
