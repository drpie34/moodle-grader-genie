
import Papa from 'papaparse';
import { StudentGrade } from '@/hooks/use-grading-workflow';

// Interface for parsed CSV
export interface ParsedCSVResult {
  headers: string[];
  data: Record<string, string>[];
}

/**
 * Parse a CSV string into headers and data
 */
export function parseCSV(csvContent: string): ParsedCSVResult {
  try {
    console.log("Parsing CSV content, first 100 chars:", csvContent.substring(0, 100));
    
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });
    
    if (result.errors && result.errors.length > 0) {
      console.warn("CSV parse warnings:", result.errors);
    }
    
    const headers = result.meta.fields || [];
    console.log("CSV headers detected:", headers);
    
    return {
      headers,
      data: result.data as Record<string, string>[]
    };
  } catch (error) {
    console.error("Error parsing CSV:", error);
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract student grades from parsed CSV
 */
export function extractStudentGrades(
  csvData: ParsedCSVResult, 
  assignmentColumn?: string,
  feedbackColumn?: string
): { 
  grades: StudentGrade[], 
  assignmentColumn: string | undefined,
  feedbackColumn: string | undefined 
} {
  const { headers, data } = csvData;
  console.log(`Extracting student grades from CSV with ${data.length} rows`);
  
  // Try to find name columns
  const firstNameCol = headers.find(h => 
    /first\s*name/i.test(h) || /forename/i.test(h) || h.toLowerCase() === 'first' || h.toLowerCase() === 'firstname'
  );
  
  const lastNameCol = headers.find(h => 
    /last\s*name/i.test(h) || /surname/i.test(h) || h.toLowerCase() === 'last' || h.toLowerCase() === 'lastname'
  );
  
  const idColumn = headers.find(h => 
    /id/i.test(h) || /student\s*number/i.test(h) || /code/i.test(h)
  );
  
  const emailColumn = headers.find(h => 
    /email/i.test(h) || /e-mail/i.test(h)
  );
  
  // If no specific assignment column is provided, try to find it
  if (!assignmentColumn) {
    // Look for a column that might be the assignment grade
    assignmentColumn = headers.find(h => {
      const lower = h.toLowerCase();
      return (
        /grade/i.test(h) || 
        /mark/i.test(h) || 
        /score/i.test(h) || 
        /points/i.test(h) ||
        /assignment/i.test(h)
      ) && !lower.includes('feedback') && !lower.includes('comment');
    });
  }
  
  // If no specific feedback column is provided, try to find it or create one based on assignment column
  if (!feedbackColumn) {
    feedbackColumn = headers.find(h => {
      const lower = h.toLowerCase();
      return (
        /feedback/i.test(h) || 
        /comment/i.test(h)
      ) || (assignmentColumn && lower.includes(assignmentColumn.toLowerCase()) && (lower.includes('feedback') || lower.includes('comment')));
    });
    
    // If we still don't have a feedback column but we have an assignment column, 
    // we'll assume the feedback goes in "[Assignment Column] (feedback)"
    if (!feedbackColumn && assignmentColumn) {
      feedbackColumn = `${assignmentColumn} (feedback)`;
      console.log(`No explicit feedback column found, using "${feedbackColumn}"`);
    }
  }
  
  console.log(`Name columns: First=${firstNameCol}, Last=${lastNameCol}`);
  console.log(`ID column: ${idColumn}, Email column: ${emailColumn}`);
  console.log(`Assignment column: ${assignmentColumn}, Feedback column: ${feedbackColumn}`);
  
  // Extract grades from the parsed data
  const grades: StudentGrade[] = data.map((row, index) => {
    // Extract name information
    let firstName = firstNameCol ? row[firstNameCol] || '' : '';
    let lastName = lastNameCol ? row[lastNameCol] || '' : '';
    
    // Fallback to using a Name or Full Name column if we couldn't find first/last separately
    const nameColumn = headers.find(h => 
      /^\s*name\s*$/i.test(h) || /full\s*name/i.test(h)
    );
    
    let fullName = '';
    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`;
    } else if (nameColumn && row[nameColumn]) {
      fullName = row[nameColumn];
      
      // Try to extract first/last names from full name
      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        if (!firstName) {
          firstName = nameParts[0];
        }
        if (!lastName) {
          lastName = nameParts[nameParts.length - 1];
        }
      }
    } else {
      // Just use whatever we have
      fullName = [firstName, lastName].filter(Boolean).join(' ') || `Student ${index + 1}`;
    }
    
    // Extract identifier
    const identifier = (idColumn && row[idColumn]) ? row[idColumn] : `id_${index}`;
    
    // Extract email
    const email = (emailColumn && row[emailColumn]) ? row[emailColumn] : '';
    
    // Extract existing grade if available
    let existingGrade = 0;
    if (assignmentColumn && row[assignmentColumn]) {
      const gradeText = row[assignmentColumn].toString().trim();
      if (gradeText && !isNaN(Number(gradeText))) {
        existingGrade = Number(gradeText);
      }
    }
    
    // Extract existing feedback if available
    let existingFeedback = '';
    if (feedbackColumn && row[feedbackColumn]) {
      existingFeedback = row[feedbackColumn].toString().trim();
      // Remove surrounding quotes if present
      existingFeedback = existingFeedback.replace(/^"(.*)"$/, '$1');
    }
    
    return {
      identifier,
      fullName,
      firstName,
      lastName,
      email,
      status: existingGrade > 0 ? 'Already Graded' : 'Needs Grading',
      grade: existingGrade,
      feedback: existingFeedback,
      edited: existingGrade > 0, // Mark as edited if already has a grade
      originalRow: row,  // Store the entire original row for later CSV export
    };
  });
  
  // Debug logging
  console.log(`Extracted ${grades.length} student grades from CSV`);
  if (grades.length > 0) {
    console.log("Sample student data:", grades[0]);
  }
  
  return { 
    grades, 
    assignmentColumn, 
    feedbackColumn
  };
}
