/**
 * CSV file utilities for importing and exporting grade data
 */

import { StudentGrade } from '@/hooks/use-grading-workflow';

export interface MoodleGradebookFormat {
  headers: string[];
  assignmentColumn: string;
  feedbackColumn: string;
}

/**
 * Parse CSV data from a Moodle gradebook export
 */
export async function parseMoodleCSV(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvData = e.target?.result as string;
        const rows = csvData.split('\n');
        const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        // Find important columns in the CSV
        const assignmentColumnIndex = headers.findIndex(h => 
          h.toLowerCase().includes('grade') || 
          h.toLowerCase().includes('mark') || 
          h.toLowerCase().includes('score')
        );
        
        const feedbackColumnIndex = headers.findIndex(h => 
          h.toLowerCase().includes('feedback') || 
          h.toLowerCase().includes('comment')
        );
        
        const assignmentColumn = assignmentColumnIndex !== -1 ? headers[assignmentColumnIndex] : undefined;
        const feedbackColumn = feedbackColumnIndex !== -1 ? headers[feedbackColumnIndex] : undefined;
        
        // Process each student row
        const grades = rows.slice(1)
          .filter(row => row.trim())
          .map((row, idx) => {
            // Split the row, respecting quoted values
            const values = parseCSVRow(row);
            
            // Create an object to store the original row values by header
            const originalRow: Record<string, string> = {};
            headers.forEach((header, i) => {
              originalRow[header] = values[i] || '';
            });
            
            // Get first and last name if available
            const firstNameIndex = headers.findIndex(h => 
              h.toLowerCase().includes('first name') || 
              h.toLowerCase() === 'first' || 
              h.toLowerCase() === 'firstname'
            );
            
            const lastNameIndex = headers.findIndex(h => 
              h.toLowerCase().includes('last name') || 
              h.toLowerCase() === 'last' || 
              h.toLowerCase() === 'lastname' || 
              h.toLowerCase() === 'surname'
            );
            
            // Get student identifiers
            const idIndex = headers.findIndex(h => 
              h.toLowerCase().includes('id') || 
              h.toLowerCase() === 'identifier' || 
              h.toLowerCase() === 'username'
            );
            
            // Get fullname
            const nameIndex = headers.findIndex(h => 
              h.toLowerCase().includes('full name') || 
              h.toLowerCase() === 'fullname' || 
              h.toLowerCase() === 'name'
            );
            
            // Get email
            const emailIndex = headers.findIndex(h => 
              h.toLowerCase().includes('email')
            );
            
            const firstName = firstNameIndex !== -1 ? values[firstNameIndex] : '';
            const lastName = lastNameIndex !== -1 ? values[lastNameIndex] : '';
            
            // Determine the full name
            let fullName = '';
            if (nameIndex !== -1 && values[nameIndex]) {
              // If there's a full name column, use it
              fullName = values[nameIndex];
            } else if (firstName && lastName) {
              // Otherwise construct it from first and last name
              fullName = `${firstName} ${lastName}`;
            } else {
              // Fallback
              fullName = `Student ${idx + 1}`;
            }
            
            return {
              identifier: idIndex !== -1 ? values[idIndex] : `id_${idx}`,
              fullName: fullName,
              firstName: firstName,
              lastName: lastName,
              email: emailIndex !== -1 ? values[emailIndex] : `${fullName.replace(/\s+/g, '.').toLowerCase()}@example.com`,
              status: 'Needs Grading',
              grade: 0,
              feedback: '',
              edited: false,
              originalRow
            };
          });
        
        resolve({
          headers,
          grades,
          assignmentColumn,
          feedbackColumn
        });
      } catch (error) {
        console.error('Error parsing CSV:', error);
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Upload a Moodle gradebook CSV file and parse it
 */
export async function uploadMoodleGradebook(file: File): Promise<any> {
  return parseMoodleCSV(file);
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
    const rowData: Record<string, string> = { ...grade.originalRow } || {};
    
    // Ensure the grade is properly formatted - convert to a number and then to string
    if (assignmentColumn && grade.grade !== undefined) {
      rowData[assignmentColumn] = grade.grade.toString();
    }
    
    // Add feedback to the appropriate column
    if (feedbackColumn && grade.feedback) {
      // Wrap feedback in quotes and escape any quotes inside
      rowData[feedbackColumn] = `"${grade.feedback.replace(/"/g, '""')}"`;
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

/**
 * Parse a single CSV row properly handling quoted values
 */
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      // If we see a quote, toggle the inQuotes state
      // But if we're in quotes and the next char is also a quote, it's an escaped quote
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // If we see a comma and we're not in quotes, end the current field
      result.push(current);
      current = '';
    } else {
      // Otherwise add the character to the current field
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}
