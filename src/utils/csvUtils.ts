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
        
        // Log the first 500 characters of CSV for debugging
        console.log("CSV preview:", csvData.substring(0, 500));
        
        // Split into rows, handling both \r\n and \n line endings
        const rows = csvData.split(/\r?\n/).filter(row => row.trim());
        
        // Parse headers, properly handling quoted values
        const headerRow = rows[0];
        const headers = parseCSVRow(headerRow);
        
        console.log("Raw CSV Headers:", headers);
        
        // Find the first and last name columns with exact matching
        let firstNameIndex = headers.findIndex(h => 
          h.toLowerCase() === 'first name' || 
          h.toLowerCase() === 'firstname'
        );
        
        let lastNameIndex = headers.findIndex(h => 
          h.toLowerCase() === 'last name' || 
          h.toLowerCase() === 'lastname'
        );
        
        // If exact matching fails, try more flexible matching
        if (firstNameIndex === -1) {
          firstNameIndex = findColumnIndex(headers, [
            'first name', 'firstname', 'given name', 'givenname', 'first', 'forename',
            'prénom', 'nombre', 'vorname', 'imię', '名', 'fname'
          ]);
        }
        
        if (lastNameIndex === -1) {
          lastNameIndex = findColumnIndex(headers, [
            'last name', 'lastname', 'surname', 'family name', 'familyname', 'last', 
            'nom', 'apellido', 'nachname', 'nazwisko', '姓', 'lname'
          ]);
        }
        
        // Find important columns in the CSV with improved detection
        const assignmentColumnIndex = findColumnIndex(headers, [
          'grade', 'mark', 'score', 'points', 'assessment', 'nota',
          'notas', 'puntuación', 'bewertung', 'ocena'
        ]);
        
        const feedbackColumnIndex = findColumnIndex(headers, [
          'feedback', 'comment', 'comments', 'annotation', 'note', 'notes',
          'comentario', 'comentarios', 'anmerkung', 'komentarz', 'remarque'
        ]);
        
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
        
        const assignmentColumn = assignmentColumnIndex !== -1 ? headers[assignmentColumnIndex] : undefined;
        const feedbackColumn = feedbackColumnIndex !== -1 ? headers[feedbackColumnIndex] : undefined;
        
        // Enhanced detection for name columns
        const nameIndex = findColumnIndex(headers, [
          'full name', 'fullname', 'name', 'student', 'participant', 'user',
          'nombre completo', 'vollständiger name', 'imię i nazwisko'
        ]);
        
        // Process each student row, skipping empty rows
        const dataRows = rows.slice(1).filter(row => row.trim());
        console.log(`Found ${dataRows.length} non-empty data rows in CSV`);
        
        const grades = dataRows.map((row, idx) => {
          // Split the row, respecting quoted values
          const values = parseCSVRow(row);
          
          // Create an object to store the original row values by header
          const originalRow: Record<string, string> = {};
          headers.forEach((header, i) => {
            originalRow[header] = i < values.length ? values[i] || '' : '';
          });
          
          // Get student identifiers
          const idIndex = headers.findIndex(h => 
            h.toLowerCase().includes('id') || 
            h.toLowerCase() === 'identifier' || 
            h.toLowerCase() === 'username'
          );
          
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
          const emailIndex = headers.findIndex(h => 
            h.toLowerCase().includes('email')
          );
          
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
 * Find the column index based on an array of possible variations
 * Case-insensitive and handles partial matches
 */
function findColumnIndex(headers: string[], variations: string[]): number {
  // First try exact matches (case-insensitive)
  for (const variation of variations) {
    const index = headers.findIndex(h => h.toLowerCase() === variation);
    if (index !== -1) return index;
  }
  
  // Then try includes matches (case-insensitive)
  for (const variation of variations) {
    const index = headers.findIndex(h => h.toLowerCase().includes(variation));
    if (index !== -1) return index;
  }
  
  // Finally, check if any header includes any of the variations
  for (const header of headers) {
    const headerLower = header.toLowerCase();
    for (const variation of variations) {
      if (headerLower.includes(variation)) {
        return headers.indexOf(header);
      }
    }
  }
  
  return -1;
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
    const rowData: Record<string, string> = grade.originalRow ? { ...grade.originalRow } : {};
    
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
