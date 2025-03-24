/**
 * Moodle-specific CSV parsing utilities
 * Simplified version that focuses on CSV files only
 */

import { StudentGrade } from '@/hooks/use-grading-workflow';
import { parseCSVContent, parseCSVRow, dumpStringBinary } from './parseCSV';
import { 
  findAssignmentColumn, 
  findFeedbackColumn, 
  findFirstNameColumn, 
  findLastNameColumn, 
  findFullNameColumn,
  findIdColumn,
  findEmailColumn,
  findColumnIndexOriginal
} from './columnDetection';
import * as XLSX from 'xlsx';

/**
 * Detect file type and parse accordingly
 */
export async function parseGradebookFile(file: File): Promise<any> {
  console.log("\n========== DETECTING FILE FORMAT ==========");
  console.log(`File name: ${file.name}`);
  console.log(`File size: ${file.size} bytes`);
  console.log(`File type: ${file.type}`);
  
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  console.log(`File extension: ${fileExt}`);
  
  // Check if it's an Excel file
  if (fileExt === 'xlsx' || fileExt === 'xls' || file.type.includes('excel') || 
      file.type.includes('spreadsheet') || file.type.includes('officedocument')) {
    console.log("Detected Excel file format, using XLSX parser");
    return await parseExcelFile(file);
  } 
  
  // Fallback to CSV parsing
  console.log("Using CSV parser for file");
  return await parseMoodleCSV(file);
}

/**
 * Parse Excel file (XLSX, XLS) from Moodle gradebook export
 */
export async function parseExcelFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log("\n========== PARSING EXCEL FILE ==========");
        console.log(`Excel file name: ${file.name}`);
        
        // Convert ArrayBuffer to binary string that xlsx can parse
        const data = e.target?.result;
        if (!data) {
          throw new Error("Could not read Excel file data");
        }
        
        // Parse the Excel file using SheetJS
        const workbook = XLSX.read(data, { type: 'array' });
        console.log(`Workbook has ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);
        
        // Usually the first sheet contains the gradebook
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log(`Successfully parsed Excel data with ${jsonData.length} rows`);
        
        if (jsonData.length === 0) {
          throw new Error("Excel file contains no data");
        }
        
        // Extract headers (first row)
        const headers = jsonData[0] as string[];
        console.log("Excel headers:", headers);
        
        // Detailed logging of headers
        console.log("\nDetailed header index mapping:");
        headers.forEach((header, index) => {
          if (typeof header === 'string') {
            console.log(`Header [${index}]: "${header}" (${header.length} chars)`);
            console.log(`  - lowercase: "${header.toLowerCase()}"`);
            console.log(`  - lowercase+trimmed: "${header.toLowerCase().trim()}"`);
          } else {
            // Handle numeric or other types of headers
            console.log(`Header [${index}]: ${header} (non-string type: ${typeof header})`);
          }
        });
        
        // Direct string matching for columns
        console.log("\nDIRECT STRING MATCHING for name columns in Excel:");
        
        let firstNameIndex = -1;
        let lastNameIndex = -1;
        
        const firstNameVariations = ["first name", "firstname", "first", "given name", "givenname"];
        const lastNameVariations = ["last name", "lastname", "last", "surname", "family name", "familyname"];
        
        // Normalize headers to strings for comparison
        const normalizedHeaders = headers.map(h => 
          typeof h === 'string' ? h : String(h)
        );
        
        for (let i = 0; i < normalizedHeaders.length; i++) {
          const headerStr = normalizedHeaders[i];
          const headerLower = typeof headerStr === 'string' ? headerStr.toLowerCase().trim() : '';
          
          // Check for first name
          for (const variation of firstNameVariations) {
            if (headerLower === variation) {
              console.log(`DIRECT MATCH - First name column found at index ${i}: "${headerStr}" matches "${variation}"`);
              firstNameIndex = i;
              break;
            }
          }
          
          // Check for last name
          for (const variation of lastNameVariations) {
            if (headerLower === variation) {
              console.log(`DIRECT MATCH - Last name column found at index ${i}: "${headerStr}" matches "${variation}"`);
              lastNameIndex = i;
              break;
            }
          }
        }
        
        // If direct matching failed, try using the utility functions
        if (firstNameIndex === -1) {
          console.log("\nDirect string matching failed for first name, trying utility function...");
          firstNameIndex = findFirstNameColumn(normalizedHeaders);
        }
        
        if (lastNameIndex === -1) {
          console.log("\nDirect string matching failed for last name, trying utility function...");
          lastNameIndex = findLastNameColumn(normalizedHeaders);
        }
        
        // If still not found, try the original working method from before refactoring
        if (firstNameIndex === -1) {
          console.log("\nFallback to original working method for first name...");
          firstNameIndex = findColumnIndexOriginal(normalizedHeaders, ["first name", "firstname", "first"]);
        }
        
        if (lastNameIndex === -1) {
          console.log("\nFallback to original working method for last name...");
          lastNameIndex = findColumnIndexOriginal(normalizedHeaders, ["last name", "lastname", "last", "surname"]);
        }
        
        // Find other important columns
        const assignmentColumnIndex = findAssignmentColumn(normalizedHeaders);
        const feedbackColumnIndex = findFeedbackColumn(normalizedHeaders);
        const nameIndex = findFullNameColumn(normalizedHeaders);
        const idIndex = findIdColumn(normalizedHeaders);
        const emailIndex = findEmailColumn(normalizedHeaders);
        
        console.log(`\nFinal first name column index: ${firstNameIndex}, header: "${firstNameIndex !== -1 ? normalizedHeaders[firstNameIndex] : 'not found'}"`);
        console.log(`Final last name column index: ${lastNameIndex}, header: "${lastNameIndex !== -1 ? normalizedHeaders[lastNameIndex] : 'not found'}"`);
        
        // Extract data rows (skip header)
        const dataRows = jsonData.slice(1) as any[];
        console.log(`Found ${dataRows.length} data rows in Excel file`);
        
        // Process student data
        const grades = dataRows.map((row, idx) => {
          // Convert row items to strings to ensure consistent handling
          const rowValues = row.map((item: any) => item !== undefined && item !== null ? String(item) : '');
          
          // Create a map of headers to row values
          const originalRow: Record<string, string> = {};
          normalizedHeaders.forEach((header, i) => {
            originalRow[header] = i < rowValues.length ? rowValues[i] || '' : '';
          });
          
          // Extract first and last names
          const firstName = firstNameIndex !== -1 && firstNameIndex < rowValues.length 
            ? rowValues[firstNameIndex].trim() : '';
          const lastName = lastNameIndex !== -1 && lastNameIndex < rowValues.length 
            ? rowValues[lastNameIndex].trim() : '';
          
          // Log extracted names for debugging
          if ((firstName || lastName) && idx < 5) {
            console.log(`\nStudent ${idx+1} name extraction from gradebook:`);
            console.log(`  firstName="${firstName}", lastName="${lastName}"`);
            console.log(`  firstNameIndex=${firstNameIndex}, lastNameIndex=${lastNameIndex}`);
          }
          
          // Determine full name
          let fullName = '';
          if (nameIndex !== -1 && nameIndex < rowValues.length && rowValues[nameIndex]) {
            // If there's a full name column, use it
            fullName = rowValues[nameIndex].trim();
          } else if (firstName && lastName) {
            // Otherwise construct it from first and last name
            fullName = `${firstName} ${lastName}`;
          } else if (firstName) {
            // Just use first name if that's all we have
            fullName = firstName;
          } else if (lastName) {
            // Just use last name if that's all we have
            fullName = lastName;
          } else {
            // Fallback
            fullName = `Student ${idx + 1}`;
          }
          
          // Get identifier and email
          const identifier = idIndex !== -1 && idIndex < rowValues.length ? rowValues[idIndex] : `id_${idx}`;
          const email = emailIndex !== -1 && emailIndex < rowValues.length ? rowValues[emailIndex] : 
                       `${fullName.replace(/\s+/g, '.').toLowerCase()}@example.com`;
          
          // For debugging: log full data for first few students
          if (idx < 5) {
            console.log(`\nStudent ${idx+1} full data:`, {
              identifier,
              fullName,
              firstName,
              lastName,
              email,
              originalRow
            });
          }
          
          return {
            identifier,
            fullName,
            firstName: firstName || '',
            lastName: lastName || '',
            email,
            status: 'Needs Grading',
            grade: 0,
            feedback: '',
            edited: false,
            originalRow
          };
        });
        
        const assignmentColumn = assignmentColumnIndex !== -1 ? normalizedHeaders[assignmentColumnIndex] : undefined;
        const feedbackColumn = feedbackColumnIndex !== -1 ? normalizedHeaders[feedbackColumnIndex] : undefined;
        
        console.log(`\nFound ${grades.length} students in Excel gradebook`);
        console.log("First few student names:", grades.slice(0, 5).map(g => g.fullName));
        console.log("========== FINISHED EXCEL PARSING ==========\n");
        
        resolve({
          headers: normalizedHeaders,
          grades,
          assignmentColumn,
          feedbackColumn,
          hasFirstLastColumns: firstNameIndex !== -1 && lastNameIndex !== -1
        });
        
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('Failed to read Excel file'));
    };
    
    // Read as array buffer for Excel parsing
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse CSV data from a Moodle gradebook export
 */
export async function parseMoodleCSV(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log("\n========== STARTING MOODLE CSV PARSING ==========");
        console.log(`File name: ${file.name}`);
        console.log(`File size: ${file.size} bytes`);
        console.log(`File type: ${file.type}`);
        
        const csvData = e.target?.result as string;
        
        // Check if this is actually an Excel file by looking for telltale binary signature
        if (csvData.startsWith('PK') || /^\s*<\?xml/.test(csvData)) {
          console.log("WARNING: Detected Excel file signature in CSV data. This file may be an Excel file.");
          console.warn("This appears to be an Excel file being read as text. Try using the Excel parser instead.");
          
          // If we detect Excel binary format, reject with informative error
          if (csvData.startsWith('PK') || csvData.includes('[Content_Types].xml')) {
            reject(new Error("This appears to be an Excel file (XLSX). Please use the Excel file format detector."));
            return;
          }
        }
        
        // Dump binary data for debugging
        dumpStringBinary(csvData.substring(0, 200), "CSV RAW DATA");
        
        // Parse the CSV content
        const { headers, rows: dataRows } = parseCSVContent(csvData);
        
        console.log("\nProcessed CSV Headers:", headers);
        console.log(`Total data rows in CSV: ${dataRows.length}`);
        
        // Print each header with index for better debugging
        console.log("\nDetailed header index mapping:");
        headers.forEach((header, index) => {
          console.log(`Header [${index}]: "${header}" (${header.length} chars)`);
          // Also log the header in different formats for debugging
          console.log(`  - lowercase: "${header.toLowerCase()}"`);
          console.log(`  - lowercase+trimmed: "${header.toLowerCase().trim()}"`);
          console.log(`  - original: "${header}"`);
        });
        
        // DIRECT STRING MATCHING for first and last name columns
        // This is a more aggressive approach to find columns
        console.log("\nDIRECT STRING MATCHING for name columns:");
        
        let firstNameIndex = -1;
        let lastNameIndex = -1;
        
        // First attempt: Direct case-insensitive comparison with common variations
        const firstNameVariations = ["first name", "firstname", "first", "given name", "givenname"];
        const lastNameVariations = ["last name", "lastname", "last", "surname", "family name", "familyname"];
        
        for (let i = 0; i < headers.length; i++) {
          const headerLower = headers[i].toLowerCase().trim();
          
          // Check for first name
          for (const variation of firstNameVariations) {
            if (headerLower === variation) {
              console.log(`DIRECT MATCH - First name column found at index ${i}: "${headers[i]}" matches "${variation}"`);
              firstNameIndex = i;
              break;
            }
          }
          
          // Check for last name
          for (const variation of lastNameVariations) {
            if (headerLower === variation) {
              console.log(`DIRECT MATCH - Last name column found at index ${i}: "${headers[i]}" matches "${variation}"`);
              lastNameIndex = i;
              break;
            }
          }
        }
        
        // If direct matching failed, try using the utility functions with extra logging
        if (firstNameIndex === -1) {
          console.log("\nDirect string matching failed for first name, trying utility function...");
          firstNameIndex = findFirstNameColumn(headers);
        }
        
        if (lastNameIndex === -1) {
          console.log("\nDirect string matching failed for last name, trying utility function...");
          lastNameIndex = findLastNameColumn(headers);
        }
        
        // If still not found, try the original working method from before refactoring
        if (firstNameIndex === -1) {
          console.log("\nFallback to original working method for first name...");
          firstNameIndex = findColumnIndexOriginal(headers, ["first name", "firstname", "first"]);
        }
        
        if (lastNameIndex === -1) {
          console.log("\nFallback to original working method for last name...");
          lastNameIndex = findColumnIndexOriginal(headers, ["last name", "lastname", "last", "surname"]);
        }
        
        // Last resort - look at individual characters in case of encoding issues
        if (firstNameIndex === -1 || lastNameIndex === -1) {
          console.log("\nLAST RESORT - Checking for partial matches with individual characters:");
          
          for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            const headerChars = Array.from(header.toLowerCase());
            
            // Check for "first" or "name" but not containing "last"
            if (firstNameIndex === -1) {
              const containsFirst = headerChars.join('').includes('first') || headerChars.join('').includes('name');
              const containsLast = headerChars.join('').includes('last');
              
              if (containsFirst && !containsLast) {
                console.log(`LAST RESORT MATCH - Potential first name column found at index ${i}: "${header}"`);
                firstNameIndex = i;
              }
            }
            
            // Check for "last" or "surname"
            if (lastNameIndex === -1) {
              const containsLast = headerChars.join('').includes('last') || 
                                  headerChars.join('').includes('surname') || 
                                  headerChars.join('').includes('family');
              
              if (containsLast) {
                console.log(`LAST RESORT MATCH - Potential last name column found at index ${i}: "${header}"`);
                lastNameIndex = i;
              }
            }
          }
        }
        
        console.log(`\nFinal first name column index: ${firstNameIndex}, header: "${firstNameIndex !== -1 ? headers[firstNameIndex] : 'not found'}"`);
        console.log(`Final last name column index: ${lastNameIndex}, header: "${lastNameIndex !== -1 ? headers[lastNameIndex] : 'not found'}"`);
        
        // Be more verbose about column detection to help troubleshoot
        if (firstNameIndex === -1) {
          console.log("WARNING: No first name column found. Available headers are:", headers);
          console.log("First name column variations we looked for: first name, firstname, given name, etc.");
        }
        
        if (lastNameIndex === -1) {
          console.log("WARNING: No last name column found. Available headers are:", headers);
          console.log("Last name column variations we looked for: last name, lastname, surname, etc.");
        }
        
        // Find important columns in the CSV
        const assignmentColumnIndex = findAssignmentColumn(headers);
        const feedbackColumnIndex = findFeedbackColumn(headers);
        const nameIndex = findFullNameColumn(headers);
        const idIndex = findIdColumn(headers);
        const emailIndex = findEmailColumn(headers);
        
        const assignmentColumn = assignmentColumnIndex !== -1 ? headers[assignmentColumnIndex] : undefined;
        const feedbackColumn = feedbackColumnIndex !== -1 ? headers[feedbackColumnIndex] : undefined;
        
        console.log(`\nFound ${dataRows.length} non-empty data rows in CSV`);
        
        // Filter out header rows and empty rows that might be present in the CSV
        const actualStudentRows = dataRows.filter(row => {
          // Skip rows that appear to be header rows
          const maybeHeaderRow = row.some(cell => 
            cell.toLowerCase().includes('first name') || 
            cell.toLowerCase().includes('last name') ||
            cell.toLowerCase().includes('email') || 
            cell.toLowerCase().includes('id')
          );
          
          // Skip completely empty rows
          const emptyRow = row.every(cell => !cell.trim());
          
          return !maybeHeaderRow && !emptyRow;
        });
        
        console.log(`After filtering: ${actualStudentRows.length} actual student rows`);
        
        // Log sample rows for debugging
        if (actualStudentRows.length > 0) {
          console.log("\nSample student row data:", actualStudentRows[0]);
        }
        
        const grades = actualStudentRows.map((values, idx) => {
          // Create an object to store the original row values by header
          const originalRow: Record<string, string> = {};
          headers.forEach((header, i) => {
            originalRow[header] = i < values.length ? values[i] || '' : '';
          });
          
          // Extract first and last names, with better handling of missing values
          const firstName = firstNameIndex !== -1 && firstNameIndex < values.length 
            ? values[firstNameIndex].trim() : '';
          const lastName = lastNameIndex !== -1 && lastNameIndex < values.length 
            ? values[lastNameIndex].trim() : '';
          
          // If we have first and last name columns, log the extracted names for first few students
          if ((firstName || lastName) && idx < 5) {
            console.log(`\nStudent ${idx+1} name extraction from gradebook:`);
            console.log(`  firstName="${firstName}", lastName="${lastName}"`);
            console.log(`  firstNameIndex=${firstNameIndex}, lastNameIndex=${lastNameIndex}`);
            if (firstNameIndex !== -1) {
              console.log(`  First name header: "${headers[firstNameIndex]}"`);
            }
            if (lastNameIndex !== -1) {
              console.log(`  Last name header: "${headers[lastNameIndex]}"`);
            }
          }
          
          // Determine the full name
          let fullName = '';
          if (nameIndex !== -1 && nameIndex < values.length && values[nameIndex]) {
            // If there's a full name column, use it
            fullName = values[nameIndex].trim();
          } else if (firstName && lastName) {
            // Otherwise construct it from first and last name
            fullName = `${firstName} ${lastName}`;
          } else if (firstName) {
            // Just use first name if that's all we have
            fullName = firstName;
          } else if (lastName) {
            // Just use last name if that's all we have
            fullName = lastName;
          } else {
            // Fallback
            fullName = `Student ${idx + 1}`;
          }
          
          // Get identifier
          const identifier = idIndex !== -1 && idIndex < values.length ? values[idIndex] : `id_${idx}`;
          
          // Get email
          const email = emailIndex !== -1 && emailIndex < values.length ? values[emailIndex] : 
                       `${fullName.replace(/\s+/g, '.').toLowerCase()}@example.com`;
          
          // For debugging: log full data for first few students
          if (idx < 5) {
            console.log(`\nStudent ${idx+1} full data:`, {
              identifier,
              fullName,
              firstName,
              lastName,
              email,
              originalRow
            });
          }
          
          return {
            identifier,
            fullName,
            firstName: firstName || '',
            lastName: lastName || '',
            email,
            status: 'Needs Grading',
            grade: 0,
            feedback: '',
            edited: false,
            originalRow
          };
        });
        
        // Log more information about the detected students
        const studentsWithFirstName = grades.filter(g => g.firstName).length;
        const studentsWithLastName = grades.filter(g => g.lastName).length;
        
        console.log(`\nFound ${grades.length} students in gradebook`);
        console.log(`Students with first name: ${studentsWithFirstName}/${grades.length}`);
        console.log(`Students with last name: ${studentsWithLastName}/${grades.length}`);
        
        // Display all student names for validation
        console.log("\nAll student names:", grades.map(g => g.fullName));
        console.log("========== FINISHED MOODLE CSV PARSING ==========\n");
        
        resolve({
          headers,
          grades,
          assignmentColumn,
          feedbackColumn,
          hasFirstLastColumns: firstNameIndex !== -1 && lastNameIndex !== -1
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
 * Upload a Moodle gradebook CSV or Excel file and parse it
 */
export async function uploadMoodleGradebook(file: File): Promise<any> {
  console.log(`Starting to parse Moodle gradebook: ${file.name} (${file.size} bytes, type: ${file.type})`);
  try {
    // Use the format detector to determine file type and parse accordingly
    const result = await parseGradebookFile(file);
    console.log("Moodle gradebook parsing completed successfully:", result);
    return result;
  } catch (error) {
    console.error("Error parsing Moodle gradebook:", error);
    throw error;
  }
}
