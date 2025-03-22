
/**
 * Utilities for handling CSV files, particularly for Moodle gradebook integration
 */

/**
 * Parses a Moodle CSV file and returns structured data
 */
export function parseMoodleCSV(csvContent: string) {
  const rows = csvContent.split('\n');
  
  // Extract header row to determine format
  const headerRow = rows[0];
  const isStandardMoodleFormat = headerRow.includes('Identifier') && headerRow.includes('Full name');
  
  // Skip header row
  const dataRows = rows.slice(1).filter(row => row.trim() !== '');
  
  if (isStandardMoodleFormat) {
    return dataRows.map(row => {
      // This is a simple CSV parser that handles quoted values
      // In a real implementation, we would use a more robust CSV parser
      const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
      const values: string[] = [];
      let match;
      
      while ((match = regex.exec(row)) !== null) {
        // If the captured group is the quoted one
        const value = match[1] !== undefined 
          ? match[1].replace(/""/g, '"')  // Replace double quotes with single quotes
          : match[2];                      // Use the unquoted value
        values.push(value || '');
      }
      
      return {
        identifier: values[0] || '',
        fullName: values[1] || '',
        email: values[2] || '',
        status: values[3] || '',
        grade: parseInt(values[4], 10) || 0,
        feedback: values[5] || ''
      };
    });
  } else {
    // For non-standard formats, try to extract key information
    return dataRows.map((row, index) => {
      const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      
      // Attempt to identify columns - this is a simplistic approach
      const idField = values[0] || '';
      const nameField = values.find(v => v.includes(' ')) || `Student ${index + 1}`;
      const emailField = values.find(v => v.includes('@')) || `student${index + 1}@example.com`;
      
      return {
        identifier: idField,
        fullName: nameField,
        email: emailField,
        status: 'Needs Grading',
        grade: 0,
        feedback: ''
      };
    });
  }
}

/**
 * Generates a Moodle-compatible CSV file from an array of student grades
 */
export function generateMoodleCSV(grades: any[]): string {
  // Generate header row
  const csvHeader = "Identifier,Full name,Email address,Status,Grade,Feedback comments\n";
  
  // Generate a row for each student grade
  const csvRows = grades.map(grade => {
    const feedback = grade.feedback.replace(/"/g, '""'); // Escape double quotes
    
    return `${grade.identifier},"${grade.fullName}",${grade.email},${grade.status},${grade.grade},"${feedback}"`;
  }).join("\n");
  
  return csvHeader + csvRows;
}

/**
 * Creates and downloads a CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Upload and parse a Moodle gradebook file
 * Now supports multiple file formats
 */
export async function uploadMoodleGradebook(file: File): Promise<any[]> {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    // For now, we'll handle all formats as text files
    // In a production app, we would use specialized libraries for Excel formats
    const fileContent = await extractTextFromTXT(file);
    
    // Check if it's a CSV or TSV file
    if (fileContent.includes(',') || fileContent.includes('\t')) {
      return parseMoodleCSV(fileContent);
    } else {
      throw new Error('File format not recognized. Please upload a CSV file or Excel spreadsheet.');
    }
  } catch (error) {
    console.error('Error parsing Moodle gradebook:', error);
    throw new Error(`Failed to parse gradebook file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from TXT file
 */
export async function extractTextFromTXT(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string || '';
      resolve(text);
    };
    reader.readAsText(file);
  });
}
