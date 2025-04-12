
/**
 * Moodle-specific CSV export utilities
 */

import { StudentGrade } from '@/hooks/use-grading-workflow';

export interface MoodleGradebookFormat {
  headers: string[];
  assignmentColumn: string;
  feedbackColumn: string;
}

/**
 * Generate a CSV file for Moodle based on graded submissions
 * Preserves the exact format of the original CSV file, only updating grades and feedback
 */
export function generateMoodleCSV(grades: StudentGrade[], format: MoodleGradebookFormat): string {
  // Extract format information
  const { headers, assignmentColumn, feedbackColumn } = format;
  
  // Validate format information
  if (!headers || !headers.length) {
    console.error('CSV Export: Missing headers in format:', format);
    throw new Error('Missing headers in gradebook format');
  }
  
  if (!assignmentColumn) {
    console.error('CSV Export: Missing assignment column in format:', format);
    throw new Error('Missing assignment column in gradebook format');
  }
  
  // Log headers to ensure they are being preserved exactly
  console.log('CSV Export: Using exact headers from original gradebook:', headers);
  console.log(`CSV Export: Assignment column: "${assignmentColumn}", Feedback column: "${feedbackColumn}"`);
  
  // Create header row - using the exact headers from the original gradebook
  const headerRow = headers.join(',');
  
  // Create data rows - preserving all original data
  const dataRows = grades.map(grade => {
    // Start with the original row if available - this preserves all original content
    if (!grade.originalRow) {
      console.error('CSV Export: Missing originalRow data for student:', grade.fullName);
      return headers.map(() => '').join(','); // Return empty row as fallback
    }
    
    const rowData: Record<string, string> = { ...grade.originalRow };
    
    // Update only the assignment grade column if it exists and grade is provided
    if (assignmentColumn && grade.grade !== undefined && grade.grade !== null) {
      console.log(`CSV Export: Setting grade "${grade.grade}" for student "${grade.fullName}" in column "${assignmentColumn}"`);
      rowData[assignmentColumn] = grade.grade.toString();
    } else if (assignmentColumn && grade.grade === null && grade.status === "No Submission") {
      console.log(`CSV Export: Clearing grade for student "${grade.fullName}" with no submission`);
      rowData[assignmentColumn] = ''; // Empty string for no submission
    }
    
    // Update only the feedback column if it exists and feedback is provided
    if (feedbackColumn && grade.feedback) {
      console.log(`CSV Export: Setting feedback for student "${grade.fullName}" in column "${feedbackColumn}"`);
      // Wrap feedback in quotes and escape any quotes inside
      rowData[feedbackColumn] = `"${grade.feedback.replace(/"/g, '""')}"`;
    }
    
    // Construct the row based on EXACT original headers - this ensures column order is preserved
    return headers.map(header => {
      const value = rowData[header] !== undefined ? rowData[header] : '';
      // If the value contains commas or quotes, wrap it in quotes and escape internal quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  // Log a sample row to verify export format
  if (dataRows.length > 0) {
    console.log('CSV Export: Sample row:', dataRows[0]);
  }
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download generated CSV content as a file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
