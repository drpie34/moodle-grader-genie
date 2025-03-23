
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
 */
export function generateMoodleCSV(grades: StudentGrade[], format: MoodleGradebookFormat): string {
  // If we have the original gradebook format, use it
  const { headers, assignmentColumn, feedbackColumn } = format;
  
  // Create header row
  const headerRow = headers.join(',');
  
  // Create data rows
  const dataRows = grades.map(grade => {
    // Start with the original row if available
    const rowData: Record<string, string> = grade.originalRow ? { ...grade.originalRow } : {};
    
    // Ensure the grade is properly formatted - convert to a number and then to string
    if (assignmentColumn && grade.grade !== undefined) {
      rowData[assignmentColumn] = grade.grade.toString();
    }
    
    // Add feedback to the appropriate column
    if (feedbackColumn && grade.feedback) {
      // Clean up the feedback: remove any "/X" from the beginning
      let cleanedFeedback = grade.feedback.replace(/^\/\d+\s*/, '');
      
      // Wrap feedback in quotes and escape any quotes inside
      rowData[feedbackColumn] = `"${cleanedFeedback.replace(/"/g, '""')}"`;
    }
    
    // Construct the row based on headers
    return headers.map(header => rowData[header] || '').join(',');
  });
  
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
