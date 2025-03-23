/**
 * Utilities for handling files and extracting student information
 */

import { StudentInfo } from './nameMatchingUtils';
import { extractTextFromPDF } from './pdfUtils';
import { extractTextFromDOCX } from './docxUtils';
import { parseCSVContent, isLikelyExcelFile } from './csv/parseCSV';
import * as XLSX from 'xlsx';

/**
 * Extract student information from a filename
 */
export function extractStudentInfoFromFilename(fileName: string, folderPath?: string): StudentInfo {
  try {
    // Prioritize folder path for student name extraction since it typically contains the student name
    const sourcePath = folderPath || fileName;
    
    if (!sourcePath) {
      return { identifier: '', fullName: '' };
    }
    
    // Log the path we're processing
    console.log(`Extracting student info from: "${sourcePath}"`);
    
    // Remove common Moodle suffixes and prefixes
    let cleanName = sourcePath
      .replace(/^.*[\/\\]/, '') // Remove any directory path before the filename
      .replace(/_assignsubmission_.*$/, '')
      .replace(/_onlinetext_.*$/, '')
      .replace(/_file_.*$/, '')
      .replace(/^\d+SP\s+/, ''); // Remove semester prefix like "25SP "
      
    // Look for Moodle ID pattern (typically after the student name)
    const idMatch = cleanName.match(/_(\d+)$/);
    const studentId = idMatch ? idMatch[1] : '';
    
    // Remove the ID part for the name
    if (studentId) {
      cleanName = cleanName.replace(/_\d+$/, '');
    }
    
    // Replace separators with spaces
    cleanName = cleanName.replace(/[_\-]/g, ' ').trim();
    
    // Try to extract course info
    if (cleanName.match(/^[A-Z]{3}-\d{3}/)) {
      // This looks like a course code (e.g., "SOC-395-A"), remove it
      cleanName = cleanName.replace(/^[A-Z]{3}-\d{3}-[A-Z]\s*/, '');
      // Also remove anything after a dash followed by numbers (assignment info)
      cleanName = cleanName.replace(/-\d+.*$/, '').trim();
    }
    
    // Handle "Last, First" format if present
    let firstName = '';
    let lastName = '';
    
    if (cleanName.includes(',')) {
      const parts = cleanName.split(',').map(p => p.trim());
      if (parts.length === 2) {
        firstName = parts[1];
        lastName = parts[0];
        cleanName = `${firstName} ${lastName}`;
      }
    } else if (cleanName.includes(' ')) {
      // Simple first/last name extraction for "First Last" format
      const parts = cleanName.split(' ');
      firstName = parts[0];
      lastName = parts[parts.length - 1];
    }
    
    // Generate email based on first and last name if both are present
    let email = '';
    if (firstName && lastName) {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    } else {
      email = `${cleanName.replace(/\s+/g, '.').toLowerCase()}@example.com`;
    }
    
    console.log(`Extracted student info: name="${cleanName}", ID=${studentId || 'none'}, First="${firstName || 'unknown'}", Last="${lastName || 'unknown'}"`);
    
    return {
      identifier: studentId || cleanName.replace(/\s+/g, '').toLowerCase(),
      fullName: cleanName,
      firstName: firstName,
      lastName: lastName,
      email: email
    };
  } catch (error) {
    console.error("Error extracting student info from filename:", error);
    return { identifier: '', fullName: '' };
  }
}

/**
 * Find the best submission file to grade from a list of files
 */
export function findBestSubmissionFile(files: File[]): File | null {
  if (!files || files.length === 0) {
    return null;
  }
  
  // Prioritize files that are not "onlinetext" or HTML files
  const nonHtmlFiles = files.filter(file => !file.name.includes('onlinetext') && !file.type.includes('html'));
  if (nonHtmlFiles.length > 0) {
    // If there are multiple non-HTML files, you might want to add more sophisticated logic
    // such as prioritizing certain file extensions (e.g., .pdf, .docx)
    return nonHtmlFiles[0];
  }
  
  // If no non-HTML files are found, fall back to "onlinetext" or HTML files
  const htmlFiles = files.filter(file => file.name.includes('onlinetext') || file.type.includes('html'));
  if (htmlFiles.length > 0) {
    return htmlFiles[0];
  }
  
  // If no "onlinetext" or HTML files are found, return the first file in the array
  return files[0];
}

/**
 * Extract text from an HTML file
 */
export async function extractTextFromHTML(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const htmlContent = event.target?.result as string;
      
      // Create a temporary DOM element to parse the HTML content
      const tempElement = document.createElement('div');
      tempElement.innerHTML = htmlContent;
      
      // Extract the text content from the parsed HTML
      const textContent = tempElement.textContent || tempElement.innerText || "";
      
      resolve(textContent);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
}

/**
 * Generic text extraction from various file types
 */
export async function extractTextFromFile(file: File): Promise<string> {
  console.log(`Extracting text from file: "${file.name}" (type: ${file.type})`);
  
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    // Handle PDF files
    if (fileExt === 'pdf' || file.type === 'application/pdf') {
      console.log('Detected PDF file, using PDF extraction');
      const text = await extractTextFromPDF(file);
      console.log(`Extracted ${text.length} characters from PDF`);
      return text;
    }
    
    // Handle DOCX files
    if (fileExt === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('Detected DOCX file, using DOCX extraction');
      const text = await extractTextFromDOCX(file);
      console.log(`Extracted ${text.length} characters from DOCX`);
      return text;
    }
    
    // Handle HTML files
    if (fileExt === 'html' || fileExt === 'htm' || file.type.includes('html')) {
      console.log('Detected HTML file, using HTML extraction');
      return extractTextFromHTML(file);
    }
    
    // Handle text files
    if (fileExt === 'txt' || file.type === 'text/plain') {
      console.log('Detected text file, using plain text extraction');
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }
    
    // Handle CSV files
    if (fileExt === 'csv' || file.type === 'text/csv') {
      console.log('Detected CSV file, using CSV extraction');
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvContent = e.target?.result as string;
          resolve(csvContent);
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }
    
    // Handle Excel files
    if (['xls', 'xlsx'].includes(fileExt || '') || file.type.includes('excel') || file.type.includes('spreadsheetml')) {
      console.log('Detected Excel file, using Excel extraction');
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const csvContent = XLSX.utils.sheet_to_csv(firstSheet);
            resolve(csvContent);
          } catch (error) {
            console.error('Error converting Excel to text:', error);
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    }
    
    // Default to plain text reading for unrecognized formats
    console.warn(`Unrecognized file type for "${file.name}" (${file.type}), defaulting to text extraction`);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  } catch (error) {
    console.error(`Error extracting text from ${file.name}:`, error);
    return `[Error extracting text: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Parse CSV or Excel file to extract gradebook data
 */
export async function parseGradebookFile(file: File): Promise<{ headers: string[], rows: string[][], assignmentColumn?: string, feedbackColumn?: string }> {
  console.log(`Parsing gradebook file: "${file.name}" (type: ${file.type})`);
  
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  
  try {
    // Handle Excel files
    if (['xls', 'xlsx'].includes(fileExt || '') || file.type.includes('excel') || file.type.includes('spreadsheetml')) {
      console.log('Parsing Excel format gradebook file');
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Check if it's a valid Excel file
      if (isLikelyExcelFile(data)) {
        console.log('Confirmed Excel format, processing with xlsx library');
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON to get row data
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        if (jsonData.length > 0) {
          // Extract headers from first row
          const headers = jsonData[0] as string[];
          console.log('Excel headers found:', headers);
          
          // Convert data rows (skip header row)
          const rows = jsonData.slice(1).map(row => {
            // Handle empty cells and convert all values to strings
            return (row as any[]).map(cell => cell !== undefined ? String(cell) : '');
          });
          
          console.log(`Processed ${rows.length} rows from Excel file`);
          return { headers, rows };
        } else {
          throw new Error('Excel file appears to be empty');
        }
      } else {
        console.warn('File has Excel extension but does not appear to be a valid Excel file');
      }
    }
    
    // Handle CSV files
    if (fileExt === 'csv' || file.type === 'text/csv') {
      console.log('Parsing CSV format gradebook file');
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      
      console.log(`Read ${text.length} characters from CSV file`);
      const { headers, rows } = parseCSVContent(text);
      console.log('CSV headers found:', headers);
      console.log(`Processed ${rows.length} rows from CSV file`);
      return { headers, rows };
    }
    
    throw new Error(`Unsupported gradebook file format: ${file.type || fileExt}`);
  } catch (error) {
    console.error('Error parsing gradebook file:', error);
    throw error;
  }
}
