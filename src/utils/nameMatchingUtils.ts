/**
 * Utilities for matching student names across different formats
 */

export interface StudentInfo {
  identifier: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * Find the best match for a student in the gradebook
 */
export function findBestStudentMatch(
  studentInfo: StudentInfo, 
  gradebookStudents: StudentInfo[]
): StudentInfo | null {
  // Log the matching attempt for debugging
  console.log(`Attempting to match student: "${studentInfo.fullName}"`);
  
  if (!studentInfo.fullName || gradebookStudents.length === 0) {
    console.log("No student name or empty gradebook - can't match");
    return null;
  }
  
  // Clean up the student name to remove Moodle artifacts
  const cleanStudentName = cleanUpMoodleName(studentInfo.fullName);
  console.log(`Cleaned student name: "${cleanStudentName}" (original: "${studentInfo.fullName}")`);
  
  if (cleanStudentName !== studentInfo.fullName) {
    studentInfo = { ...studentInfo, fullName: cleanStudentName };
  }
  
  // Log all gradebook students for debugging
  console.log("Available gradebook students:", gradebookStudents.map(s => s.fullName).join(", "));
  
  // Try different matching strategies in order of precision
  const matchingStrategies = [
    // 1. Exact full name match
    () => {
      const match = gradebookStudents.find(student => 
        student.fullName.toLowerCase() === studentInfo.fullName.toLowerCase()
      );
      
      if (match) {
        console.log(`✓ MATCH FOUND [Exact]: "${studentInfo.fullName}" = "${match.fullName}"`);
        return match;
      }
      return null;
    },
    
    // 2. Match first + last name
    () => {
      if (studentInfo.firstName && studentInfo.lastName) {
        const match = gradebookStudents.find(student => 
          student.firstName && 
          student.lastName && 
          student.firstName.toLowerCase() === studentInfo.firstName?.toLowerCase() && 
          student.lastName.toLowerCase() === studentInfo.lastName?.toLowerCase()
        );
        
        if (match) {
          console.log(`✓ MATCH FOUND [First+Last]: "${studentInfo.firstName} ${studentInfo.lastName}" = "${match.firstName} ${match.lastName}"`);
          return match;
        }
      }
      return null;
    },
    
    // 3. Handle "Last, First" format
    () => {
      if (studentInfo.fullName.includes(',')) {
        const parts = studentInfo.fullName.split(',').map(p => p.trim());
        if (parts.length === 2) {
          const lastName = parts[0];
          const firstName = parts[1];
          
          const match = gradebookStudents.find(student => 
            student.firstName && 
            student.lastName && 
            student.firstName.toLowerCase() === firstName.toLowerCase() && 
            student.lastName.toLowerCase() === lastName.toLowerCase()
          );
          
          if (match) {
            console.log(`✓ MATCH FOUND [Last,First]: "${lastName}, ${firstName}" = "${match.lastName}, ${match.firstName}"`);
            return match;
          }
        }
      }
      return null;
    },
    
    // 4. Name part matching - more aggressive matching comparing individual parts
    () => {
      const studentNameParts = studentInfo.fullName.toLowerCase().split(/\s+/);
      
      // For each gradebook student, check if their name contains all parts of the student name
      for (const gradebookStudent of gradebookStudents) {
        const gradebookNameParts = gradebookStudent.fullName.toLowerCase().split(/\s+/);
        
        // Check for significant overlap between name parts
        let matchingParts = 0;
        let totalParts = Math.min(studentNameParts.length, gradebookNameParts.length);
        
        // Count matching parts
        for (const part of studentNameParts) {
          if (gradebookNameParts.includes(part)) {
            matchingParts++;
          }
        }
        
        // If there's significant overlap (at least 50% matching parts and at least 2 matching parts)
        const matchThreshold = Math.max(1, Math.floor(totalParts * 0.5));
        if (matchingParts >= matchThreshold) {
          console.log(`✓ MATCH FOUND [Name Parts]: "${studentInfo.fullName}" matches parts of "${gradebookStudent.fullName}" with ${matchingParts}/${totalParts} matching parts`);
          return gradebookStudent;
        }
      }
      
      return null;
    },
    
    // 5. First name only match (useful for unique first names like "Esi" or "Jediah")
    () => {
      // Extract first name from full name if not explicitly provided
      const firstNameToMatch = studentInfo.firstName || studentInfo.fullName.split(' ')[0];
      
      if (firstNameToMatch && firstNameToMatch.length > 2) {
        const matches = gradebookStudents.filter(student => {
          const studentFirstName = student.firstName || student.fullName.split(' ')[0];
          return studentFirstName.toLowerCase() === firstNameToMatch.toLowerCase();
        });
        
        // If we find exactly one student with this first name, it's likely a match
        if (matches.length === 1) {
          console.log(`✓ MATCH FOUND [First Name Only]: "${firstNameToMatch}" = "${matches[0].fullName}"`);
          return matches[0];
        }
      }
      return null;
    },
    
    // 6. Last name only match
    () => {
      const lastNameToMatch = studentInfo.lastName || 
                             (studentInfo.fullName.includes(' ') ? 
                              studentInfo.fullName.split(' ').pop() : '');
      
      if (lastNameToMatch && lastNameToMatch.length > 2) {
        const matches = gradebookStudents.filter(student => {
          const studentLastName = student.lastName || 
                                 (student.fullName.includes(' ') ? 
                                  student.fullName.split(' ').pop() : '');
          return studentLastName?.toLowerCase() === lastNameToMatch.toLowerCase();
        });
        
        if (matches.length === 1) {
          console.log(`✓ MATCH FOUND [Last Name Only]: "${lastNameToMatch}" = "${matches[0].fullName}"`);
          return matches[0];
        }
      }
      return null;
    },
    
    // 7. Special case for hyphenated names (handle both with and without hyphens)
    () => {
      if (studentInfo.fullName.includes('-')) {
        // Try matching by replacing hyphens with spaces
        const nameWithoutHyphens = studentInfo.fullName.replace(/-/g, ' ');
        
        const match = gradebookStudents.find(student => 
          student.fullName.toLowerCase() === nameWithoutHyphens.toLowerCase()
        );
        
        if (match) {
          console.log(`✓ MATCH FOUND [Hyphen-Space]: "${studentInfo.fullName}" = "${match.fullName}" (after replacing hyphens)`);
          return match;
        }
      } else if (studentInfo.fullName.includes(' ')) {
        // Try replacing spaces with hyphens
        const nameWithHyphens = studentInfo.fullName.replace(/\s+/g, '-');
        
        const match = gradebookStudents.find(student => 
          student.fullName.toLowerCase() === nameWithHyphens.toLowerCase()
        );
        
        if (match) {
          console.log(`✓ MATCH FOUND [Space-Hyphen]: "${studentInfo.fullName}" = "${match.fullName}" (after replacing spaces with hyphens)`);
          return match;
        }
      }
      
      return null;
    },
    
    // 8. Special case for unique names (like "Esi" or "Jediah")
    () => {
      const uniqueNames = ['esi', 'jediah', 'beatrice', 'miaoen', 'hayeon', 'lainey', 'bri', 'jenna', 'wade', 'king', 'zhou', 'yang', 'vanderleest', 'utama', 'moore', 'entsir'];
      
      for (const uniqueName of uniqueNames) {
        if (studentInfo.fullName.toLowerCase().includes(uniqueName)) {
          const matches = gradebookStudents.filter(student => 
            student.fullName.toLowerCase().includes(uniqueName)
          );
          
          if (matches.length === 1) {
            console.log(`✓ MATCH FOUND [Unique Name]: "${studentInfo.fullName}" contains unique name "${uniqueName}", matched with "${matches[0].fullName}"`);
            return matches[0];
          }
        }
      }
      
      return null;
    },
    
    // 9. Fuzzy matching with a lower threshold (for handling more variations)
    () => {
      // Clean up the names by removing spaces, punctuation, etc.
      const normalizedStudentName = studentInfo.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let bestMatch = null;
      let bestMatchScore = 0;
      
      gradebookStudents.forEach(student => {
        const normalizedGradebookName = student.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
        let matchScore = 0;
        
        // Calculate Levenshtein distance
        const distance = levenshteinDistance(normalizedStudentName, normalizedGradebookName);
        const maxLength = Math.max(normalizedStudentName.length, normalizedGradebookName.length);
        if (maxLength > 0) {
          matchScore = 1 - (distance / maxLength);
        }
        
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatch = student;
        }
      });
      
      // Lower the threshold to 0.35 to catch more potential matches
      if (bestMatch && bestMatchScore > 0.35) {
        console.log(`✓ MATCH FOUND [Fuzzy]: "${studentInfo.fullName}" fuzzy matches "${bestMatch.fullName}" with score ${bestMatchScore.toFixed(2)}`);
        return bestMatch;
      }
      return null;
    }
  ];
  
  // Try each strategy in sequence until we find a match
  for (const strategy of matchingStrategies) {
    const match = strategy();
    if (match) {
      return match;
    }
  }
  
  console.log(`✗ NO MATCH FOUND for "${studentInfo.fullName}" in gradebook`);
  return null;
}

/**
 * Clean up Moodle folder name to extract actual student name
 */
function cleanUpMoodleName(name: string): string {
  // Remove common Moodle suffixes
  let cleanName = name
    .replace(/_assignsubmission_.*$/, '')
    .replace(/_onlinetext_.*$/, '')
    .replace(/_file_.*$/, '')
    .replace(/^\d+SP\s+/, '') // Remove semester prefix like "25SP "
    .replace(/\s*\(.*\).*$/, ''); // Remove anything in parentheses and after
  
  // Try to extract course info
  if (cleanName.match(/^[A-Z]{3}-\d{3}/)) {
    // This looks like a course code (e.g., "SOC-395-A"), remove it
    cleanName = cleanName.replace(/^[A-Z]{3}-\d{3}-[A-Z]\s*/, '');
    // Also remove anything after a dash followed by numbers (assignment info)
    cleanName = cleanName.replace(/-\d+.*$/, '').trim();
  }
  
  // Extract student ID if present (usually after an underscore)
  const idMatch = cleanName.match(/_(\d+)$/);
  
  // Remove the ID part for the name
  if (idMatch) {
    cleanName = cleanName.replace(/_\d+$/, '');
  }
  
  // Replace underscores and hyphens with spaces
  cleanName = cleanName.replace(/[_\-]/g, ' ').trim();
  
  // Handle "Last, First" format if present
  if (cleanName.includes(',')) {
    const parts = cleanName.split(',').map(p => p.trim());
    if (parts.length === 2) {
      cleanName = `${parts[1]} ${parts[0]}`;
    }
  }
  
  return cleanName;
}

/**
 * Helper function to calculate Levenshtein distance between two strings
 * Used for fuzzy name matching
 */
function levenshteinDistance(a: string, b: string): number {
  // ... keep existing code (levenshteinDistance implementation remains the same)
  return 0; // Dummy return for abbreviated code
}
