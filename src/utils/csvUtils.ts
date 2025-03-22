
/**
 * Utilities for handling CSV files, particularly for Moodle gradebook integration
 */
import * as XLSX from 'xlsx';

/**
 * Parses a Moodle CSV file and returns structured data
 */
export function parseMoodleCSV(csvContent: string) {
  const rows = csvContent.split('\n');
  
  // Extract header row
  const headerRow = rows[0];
  const headers = parseCSVRow(headerRow);
  
  // Find the grade and feedback column indices
  const identifierIndex = 0; // Usually the first column
  const nameIndex = headers.findIndex(h => 
    h.toLowerCase().includes('full name') || h.toLowerCase().includes('name')
  );
  const emailIndex = headers.findIndex(h => 
    h.toLowerCase().includes('email')
  );
  const gradeColumnIndex = headers.findIndex(h => 
    h.toLowerCase().includes('grade') || h.toLowerCase().includes('mark') || h.toLowerCase().includes('score')
  );
  const feedbackColumnIndex = headers.findIndex(h => 
    h.toLowerCase().includes('feedback') || h.toLowerCase().includes('comment')
  );
  
  // Use default indices if not found
  const effectiveNameIndex = nameIndex !== -1 ? nameIndex : 1;
  const effectiveEmailIndex = emailIndex !== -1 ? emailIndex : 2;
  
  // Skip header row
  const dataRows = rows.slice(1).filter(row => row.trim() !== '');
  
  // Parse each row
  const grades = dataRows.map(row => {
    const values = parseCSVRow(row);
    
    // Create an object with the original row data
    const originalRow: Record<string, string> = {};
    headers.forEach((header, i) => {
      originalRow[header] = values[i] || '';
    });
    
    return {
      identifier: values[identifierIndex] || '',
      fullName: values[effectiveNameIndex] || '',
      email: values[effectiveEmailIndex] || '',
      status: 'Needs Grading',
      grade: 0,
      feedback: '',
      originalRow
    };
  });
  
  return {
    headers,
    grades,
    assignmentColumn: gradeColumnIndex !== -1 ? headers[gradeColumnIndex] : 'Grade',
    feedbackColumn: feedbackColumnIndex !== -1 ? headers[feedbackColumnIndex] : 'Feedback comments'
  };
}

/**
 * Parse a CSV row with proper handling of quoted values
 */
function parseCSVRow(row: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"' && !inQuotes) {
      // Start of quoted value
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        // Double quote inside quoted value - add a single quote
        currentValue += '"';
        i++; // Skip the next quote
      } else {
        // End of quoted value
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(currentValue);
      currentValue = '';
    } else {
      // Regular character
      currentValue += char;
    }
  }
  
  // Add the last value
  values.push(currentValue);
  
  return values;
}

/**
 * Generates a Moodle-compatible CSV file from an array of student grades, preserving original format
 */
export function generateMoodleCSV(grades: any[], moodleFormat: { headers: string[], assignmentColumn: string, feedbackColumn: string }): string {
  // Use the original headers from the uploaded file
  const headers = moodleFormat.headers;
  const headerString = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
  
  // Find the indices for grade and feedback columns
  const gradeColumnIndex = headers.findIndex(h => h === moodleFormat.assignmentColumn);
  const feedbackColumnIndex = headers.findIndex(h => h === moodleFormat.feedbackColumn);
  
  // Generate rows maintaining the original format
  const rows = grades.map(grade => {
    // Start with the original row data
    const rowData = { ...grade.originalRow };
    
    // Update the grade and feedback columns
    if (gradeColumnIndex !== -1) {
      rowData[headers[gradeColumnIndex]] = grade.grade.toString();
    }
    
    if (feedbackColumnIndex !== -1) {
      rowData[headers[feedbackColumnIndex]] = grade.feedback;
    }
    
    // Build the CSV row
    return headers.map(header => {
      const value = rowData[header] || '';
      return `"${value.toString().replace(/"/g, '""')}"`;
    }).join(',');
  }).join('\n');
  
  return headerString + '\n' + rows;
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
export async function parseSpreadsheetData(file: File): Promise<any> {
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
      const headers: string[] = [];
      const dataRows: string[][] = [];
      
      // Extract header names from the first item
      if (items.length > 0) {
        Array.from(items[0].children).forEach(child => {
          headers.push(child.nodeName);
        });
      }
      
      // Extract data from all items
      Array.from(items).forEach(item => {
        const rowValues: string[] = [];
        Array.from(item.children).forEach(child => {
          rowValues.push(child.textContent || '');
        });
        dataRows.push(rowValues);
      });
      
      // Create a CSV string
      const headerRow = headers.join(',');
      const dataRowsText = dataRows.map(row => row.join(',')).join('\n');
      const csvContent = headerRow + '\n' + dataRowsText;
      
      return parseMoodleCSV(csvContent);
    }
    
    // If no recognizable structure, return empty data
    return {
      headers: ['Identifier', 'Full name', 'Email address', 'Status', 'Grade', 'Feedback comments'],
      grades: [],
      assignmentColumn: 'Grade',
      feedbackColumn: 'Feedback comments'
    };
  }
  
  // Default case - unrecognized format
  throw new Error('Unsupported file format');
}

/**
 * Upload and parse a Moodle gradebook file
 * Supports multiple file formats: CSV, TXT, Excel (XLSX, XLS), OpenOffice (ODS), XML
 */
export async function uploadMoodleGradebook(file: File): Promise<any> {
  try {
    return await parseSpreadsheetData(file);
  } catch (error) {
    console.error('Error parsing Moodle gradebook:', error);
    throw new Error(`Failed to parse gradebook file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from TXT file
 * This is a local utility function
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
