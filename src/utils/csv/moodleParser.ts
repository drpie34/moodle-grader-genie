
/**
 * Moodle-specific CSV parsing utilities
 */

import { StudentGrade } from '@/hooks/use-grading-workflow';
import { parseCSVContent, parseCSVRow } from './parseCSV';
import { 
  findAssignmentColumn, 
  findFeedbackColumn, 
  findFirstNameColumn, 
  findLastNameColumn, 
  findFullNameColumn,
  findIdColumn,
  findEmailColumn 
} from './columnDetection';

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
        
        // Log the first 500 characters of CSV for debugging
        console.log("\nCSV raw data preview (first 500 chars):", csvData.substring(0, 500).replace(/\n/g, "\\n"));
        
        // Parse the CSV content
        const { headers, rows: dataRows } = parseCSVContent(csvData);
        
        console.log("\nProcessed CSV Headers:", headers);
        console.log(`Total data rows in CSV: ${dataRows.length}`);
        
        // Print each header with index for better debugging
        console.log("\nDetailed header index mapping:");
        headers.forEach((header, index) => {
          console.log(`Header [${index}]: "${header}" (${header.length} chars)`);
        });
        
        // Find the first and last name columns - with extensive logging
        console.log("\nDetecting name columns...");
        const firstNameIndex = findFirstNameColumn(headers);
        const lastNameIndex = findLastNameColumn(headers);
        
        console.log(`\nFirst name column index: ${firstNameIndex}, header: "${firstNameIndex !== -1 ? headers[firstNameIndex] : 'not found'}"`);
        console.log(`Last name column index: ${lastNameIndex}, header: "${lastNameIndex !== -1 ? headers[lastNameIndex] : 'not found'}"`);
        
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
 * Upload a Moodle gradebook CSV file and parse it
 */
export async function uploadMoodleGradebook(file: File): Promise<any> {
  console.log(`Starting to parse Moodle gradebook: ${file.name} (${file.size} bytes)`);
  try {
    const result = await parseMoodleCSV(file);
    console.log("Moodle gradebook parsing completed successfully:", result);
    return result;
  } catch (error) {
    console.error("Error parsing Moodle gradebook:", error);
    throw error;
  }
}
