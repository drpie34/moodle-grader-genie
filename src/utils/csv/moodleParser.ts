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
        const csvData = e.target?.result as string;
        
        // Log the first 500 characters of CSV for debugging
        console.log("CSV preview:", csvData.substring(0, 500));
        
        const { headers, rows: dataRows } = parseCSVContent(csvData);
        
        console.log("Raw CSV Headers:", headers);
        
        // Find the first and last name columns with exact matching
        const firstNameIndex = findFirstNameColumn(headers);
        const lastNameIndex = findLastNameColumn(headers);
        
        console.log(`First name column index: ${firstNameIndex}, header: "${firstNameIndex !== -1 ? headers[firstNameIndex] : 'not found'}"`);
        console.log(`Last name column index: ${lastNameIndex}, header: "${lastNameIndex !== -1 ? headers[lastNameIndex] : 'not found'}"`);
        
        // Print out all headers for diagnosis
        console.log("All CSV headers for diagnosis:");
        headers.forEach((header, index) => {
          console.log(`  [${index}]: "${header}" (lowercase: "${header.toLowerCase()}")`);
        });
        
        // Be more verbose about column detection to help troubleshoot
        if (firstNameIndex === -1) {
          console.log("No first name column found. Available headers are:", headers);
          console.log("First name column variations we looked for: first name, firstname, given name, etc.");
        }
        
        if (lastNameIndex === -1) {
          console.log("No last name column found. Available headers are:", headers);
          console.log("Last name column variations we looked for: last name, lastname, surname, etc.");
        }
        
        // Find important columns in the CSV
        const assignmentColumnIndex = findAssignmentColumn(headers);
        const feedbackColumnIndex = findFeedbackColumn(headers);
        const nameIndex = findFullNameColumn(headers);
        
        const assignmentColumn = assignmentColumnIndex !== -1 ? headers[assignmentColumnIndex] : undefined;
        const feedbackColumn = feedbackColumnIndex !== -1 ? headers[feedbackColumnIndex] : undefined;
        
        console.log(`Found ${dataRows.length} non-empty data rows in CSV`);
        
        const grades = dataRows.map((values, idx) => {
          // Create an object to store the original row values by header
          const originalRow: Record<string, string> = {};
          headers.forEach((header, i) => {
            originalRow[header] = i < values.length ? values[i] || '' : '';
          });
          
          // Get student identifiers
          const idIndex = findIdColumn(headers);
          
          // Extract first and last names, with better handling of missing values
          const firstName = firstNameIndex !== -1 && firstNameIndex < values.length 
            ? values[firstNameIndex].trim() : '';
          const lastName = lastNameIndex !== -1 && lastNameIndex < values.length 
            ? values[lastNameIndex].trim() : '';
          
          // If we have first and last name columns and this is one of the first few rows,
          // log the extracted names to help with debugging
          if ((firstName || lastName) && idx < 5) {
            console.log(`Student ${idx+1} name extraction from gradebook: firstName="${firstName}", lastName="${lastName}"`);
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
          
          // Get email
          const emailIndex = findEmailColumn(headers);
          
          // For debugging: log values for first few students
          if (idx < 2) {
            console.log(`Student ${idx+1} row values:`, values);
            console.log(`Student ${idx+1} name extraction: firstName="${firstName}", lastName="${lastName}", fullName="${fullName}"`);
          }
          
          return {
            identifier: idIndex !== -1 && idIndex < values.length && values[idIndex] ? values[idIndex] : `id_${idx}`,
            fullName: fullName,
            firstName: firstName,
            lastName: lastName,
            email: emailIndex !== -1 && emailIndex < values.length && values[emailIndex] ? values[emailIndex] : 
                   `${fullName.replace(/\s+/g, '.').toLowerCase()}@example.com`,
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
        
        console.log(`Found ${grades.length} students in gradebook`);
        console.log(`Students with first name: ${studentsWithFirstName}/${grades.length}`);
        console.log(`Students with last name: ${studentsWithLastName}/${grades.length}`);
        
        if (firstNameIndex !== -1 && lastNameIndex !== -1) {
          console.log(`✓ First and last name columns found in gradebook: "${headers[firstNameIndex]}" and "${headers[lastNameIndex]}"`);
        } else {
          console.warn("✗ First and last name columns NOT found in gradebook. This may affect matching.");
        }
        
        // Display first few student names for validation
        console.log("First few student names:", grades.slice(0, 5).map(g => g.fullName));
        
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
