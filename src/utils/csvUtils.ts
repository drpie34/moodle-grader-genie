
/**
 * Utilities for handling CSV files, particularly for Moodle gradebook integration
 */
import * as XLSX from 'xlsx';

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
      // This is a more robust CSV parser that handles quoted values
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
  // Generate header row - Strict format required by Moodle
  const csvHeader = "Identifier,Full name,Email address,Status,Grade,Feedback comments\n";
  
  // Generate a row for each student grade with proper escaping
  const csvRows = grades.map(grade => {
    // Ensure proper formatting of fields (especially strings with commas or quotes)
    const identifier = grade.identifier ? `"${grade.identifier.replace(/"/g, '""')}"` : '';
    const fullName = grade.fullName ? `"${grade.fullName.replace(/"/g, '""')}"` : '';
    const email = grade.email ? `"${grade.email.replace(/"/g, '""')}"` : '';
    const status = grade.status ? `"${grade.status.replace(/"/g, '""')}"` : '';
    // Grade is a number, no need to quote
    const gradeValue = isNaN(grade.grade) ? 0 : grade.grade;
    // Feedback should be properly escaped
    const feedback = grade.feedback ? `"${grade.feedback.replace(/"/g, '""')}"` : '';
    
    return `${identifier},${fullName},${email},${status},${gradeValue},${feedback}`;
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
 * Parse data from various spreadsheet formats
 */
export async function parseSpreadsheetData(file: File): Promise<any[]> {
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  
  if (fileExt === 'csv' || fileExt === 'txt') {
    // Handle CSV or TXT files
    const text = await readTextFile(file);
    return parseMoodleCSV(text);
  } else if (['xlsx', 'xls', 'ods'].includes(fileExt || '')) {
    // Handle Excel and OpenOffice files
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first worksheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to CSV
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    return parseMoodleCSV(csvContent);
  } else if (fileExt === 'xml') {
    // Handle XML files - parse as text and extract data
    const text = await readTextFile(file);
    
    // Very basic XML to data extraction - for complex XML, use a proper XML parser
    const rows: string[] = [];
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    
    // Try to extract rows, assuming a simple structure
    // This is a simplified approach; actual XML parsing depends on the XML schema
    const items = xmlDoc.getElementsByTagName("item") || 
                  xmlDoc.getElementsByTagName("row") || 
                  xmlDoc.getElementsByTagName("student");
    
    if (items.length > 0) {
      // Convert XML elements to CSV-like rows
      Array.from(items).forEach(item => {
        const rowValues: string[] = [];
        Array.from(item.children).forEach(child => {
          rowValues.push(child.textContent || '');
        });
        rows.push(rowValues.join(','));
      });
      
      return parseMoodleCSV("header\n" + rows.join('\n'));
    }
    
    // If no recognizable structure, return empty array
    return [];
  }
  
  // Default case - unrecognized format
  throw new Error('Unsupported file format');
}

/**
 * Upload and parse a Moodle gradebook file
 * Supports multiple file formats: CSV, TXT, Excel (XLSX, XLS), OpenOffice (ODS), XML
 */
export async function uploadMoodleGradebook(file: File): Promise<any[]> {
  try {
    return await parseSpreadsheetData(file);
  } catch (error) {
    console.error('Error parsing Moodle gradebook:', error);
    throw new Error(`Failed to parse gradebook file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from TXT file
 * This is a local utility function that replaces the imported extractTextFromTXT
 */
async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string || '';
      resolve(text);
    };
    reader.readAsText(file);
  });
}
