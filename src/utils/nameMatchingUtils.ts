
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
    
    // 4. First name only match (useful for unique first names like "Esi" or "Jediah")
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
        
        // If multiple matches, look for the closest one
        if (matches.length > 1) {
          // Try to disambiguate by looking at other parts of the name
          for (const match of matches) {
            if (studentInfo.fullName.includes(match.lastName || '')) {
              console.log(`✓ MATCH FOUND [First + Partial Last]: "${firstNameToMatch}" + partial "${match.lastName}" = "${match.fullName}"`);
              return match;
            }
          }
        }
      }
      return null;
    },
    
    // 5. Match by name parts
    () => {
      if (studentInfo.fullName.includes(' ')) {
        const studentNameParts = studentInfo.fullName.toLowerCase().split(' ');
        
        let bestMatch = null;
        let bestMatchScore = 0;
        
        gradebookStudents.forEach(student => {
          const gradebookNameParts = student.fullName.toLowerCase().split(' ');
          let matchScore = 0;
          
          // Count how many parts match between the two names
          studentNameParts.forEach(part => {
            if (gradebookNameParts.includes(part)) {
              matchScore++;
            }
          });
          
          if (matchScore > bestMatchScore) {
            bestMatchScore = matchScore;
            bestMatch = student;
          }
        });
        
        if (bestMatch && bestMatchScore > 0) {
          console.log(`✓ MATCH FOUND [Name Parts]: "${studentInfo.fullName}" matches parts of "${bestMatch.fullName}" with score ${bestMatchScore}`);
          return bestMatch;
        }
      }
      return null;
    },
    
    // 6. Fuzzy matching (for handling typos, abbreviations)
    () => {
      // Clean up the names by removing spaces, punctuation, etc.
      const normalizedStudentName = studentInfo.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let bestMatch = null;
      let bestMatchScore = 0;
      
      gradebookStudents.forEach(student => {
        const normalizedGradebookName = student.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
        let matchScore = 0;
        
        // Check for substring match in either direction
        if (normalizedGradebookName.includes(normalizedStudentName)) {
          matchScore = normalizedStudentName.length / normalizedGradebookName.length;
        } else if (normalizedStudentName.includes(normalizedGradebookName)) {
          matchScore = normalizedGradebookName.length / normalizedStudentName.length;
        } else {
          // Calculate Levenshtein distance for names that don't contain each other
          const distance = levenshteinDistance(normalizedStudentName, normalizedGradebookName);
          const maxLength = Math.max(normalizedStudentName.length, normalizedGradebookName.length);
          if (maxLength > 0) {
            matchScore = 1 - (distance / maxLength);
          }
        }
        
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatch = student;
        }
      });
      
      // Only consider it a match if the score is above a certain threshold
      // Lower the threshold slightly to catch more potential matches
      if (bestMatch && bestMatchScore > 0.5) {
        console.log(`✓ MATCH FOUND [Fuzzy]: "${studentInfo.fullName}" fuzzy matches "${bestMatch.fullName}" with score ${bestMatchScore.toFixed(2)}`);
        return bestMatch;
      }
      return null;
    },
    
    // 7. Initial match (for cases like "E. Smith" matching "Emma Smith")
    () => {
      // Extract potential initials from the student name
      const nameParts = studentInfo.fullName.split(' ');
      const initials: string[] = [];
      nameParts.forEach(part => {
        if (part.length === 1 || (part.length === 2 && part.endsWith('.'))) {
          initials.push(part.replace('.', '').toLowerCase());
        }
      });
      
      if (initials.length > 0) {
        // Look for students whose names have matching initials
        const matches = gradebookStudents.filter(student => {
          const studentNameParts = student.fullName.split(' ');
          
          for (const initial of initials) {
            for (const part of studentNameParts) {
              if (part.toLowerCase().startsWith(initial)) {
                return true;
              }
            }
          }
          return false;
        });
        
        if (matches.length === 1) {
          console.log(`✓ MATCH FOUND [Initials]: "${studentInfo.fullName}" initial match "${matches[0].fullName}"`);
          return matches[0];
        }
      }
      return null;
    },
    
    // 8. Special case for unique names (like "Esi" or "Jediah")
    () => {
      const uniqueNames = ['esi', 'jediah', 'beatrice', 'miaoen', 'hayeon'];
      
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
    .replace(/_file_.*$/, '');
  
  // Extract student ID if present (usually after an underscore)
  const idMatch = cleanName.match(/_(\d+)$/);
  
  // Remove the ID part for the name
  if (idMatch) {
    cleanName = cleanName.replace(/_\d+$/, '');
  }
  
  // Replace underscores and hyphens with spaces
  cleanName = cleanName.replace(/[_-]/g, ' ').trim();
  
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
  const matrix: number[][] = [];
  
  // Initialize the matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[a.length][b.length];
}
