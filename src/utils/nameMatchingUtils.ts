
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
  console.log(`Available gradebook students (${gradebookStudents.length}):`);
  gradebookStudents.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i}: ${s.fullName} (First: ${s.firstName || 'N/A'}, Last: ${s.lastName || 'N/A'})`);
  });
  if (gradebookStudents.length > 10) {
    console.log(`  ... and ${gradebookStudents.length - 10} more students`);
  }
  
  // Try different matching strategies in order of precision
  const matchingStrategies = [
    exactNameMatcher,
    firstLastNameMatcher,
    lastFirstNameMatcher,
    namePartsMatcher,
    uniqueFirstNameMatcher,
    uniqueLastNameMatcher,
    hyphenatedNameMatcher,
    uniqueNameMatcher,
    fuzzyNameMatcher
  ];
  
  // Try each strategy in sequence until we find a match
  for (const strategy of matchingStrategies) {
    const match = strategy(studentInfo, gradebookStudents);
    if (match) {
      return match;
    }
  }
  
  console.log(`✗ NO MATCH FOUND for "${studentInfo.fullName}" in gradebook`);
  return null;
}

// Exact full name match strategy
function exactNameMatcher(studentInfo: StudentInfo, gradebookStudents: StudentInfo[]): StudentInfo | null {
  console.log(`Trying exact name matcher for "${studentInfo.fullName}"`);
  
  const match = gradebookStudents.find(student => 
    student.fullName.toLowerCase() === studentInfo.fullName.toLowerCase()
  );
  
  if (match) {
    console.log(`✓ MATCH FOUND [Exact]: "${studentInfo.fullName}" = "${match.fullName}"`);
    return match;
  }
  
  // Try with trimmed values
  const trimmedStudentName = studentInfo.fullName.trim().toLowerCase();
  const trimMatch = gradebookStudents.find(student => 
    student.fullName.trim().toLowerCase() === trimmedStudentName
  );
  
  if (trimMatch) {
    console.log(`✓ MATCH FOUND [Exact-Trimmed]: "${studentInfo.fullName}" = "${trimMatch.fullName}"`);
    return trimMatch;
  }
  
  return null;
}

// First + Last name matcher strategy
function firstLastNameMatcher(studentInfo: StudentInfo, gradebookStudents: StudentInfo[]): StudentInfo | null {
  if (studentInfo.firstName && studentInfo.lastName) {
    console.log(`Trying first+last name matcher for "${studentInfo.firstName} ${studentInfo.lastName}"`);
    
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
}

// "Last, First" format matcher strategy
function lastFirstNameMatcher(studentInfo: StudentInfo, gradebookStudents: StudentInfo[]): StudentInfo | null {
  if (studentInfo.fullName.includes(',')) {
    const parts = studentInfo.fullName.split(',').map(p => p.trim());
    if (parts.length === 2) {
      const lastName = parts[0];
      const firstName = parts[1];
      
      console.log(`Trying last,first name matcher for "${lastName}, ${firstName}"`);
      
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
}

// Name parts matching strategy
function namePartsMatcher(studentInfo: StudentInfo, gradebookStudents: StudentInfo[]): StudentInfo | null {
  console.log(`Trying name parts matcher for "${studentInfo.fullName}"`);
  
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
}

// First name only match strategy
function uniqueFirstNameMatcher(studentInfo: StudentInfo, gradebookStudents: StudentInfo[]): StudentInfo | null {
  // Extract first name from full name if not explicitly provided
  const firstNameToMatch = studentInfo.firstName || studentInfo.fullName.split(' ')[0];
  
  if (firstNameToMatch && firstNameToMatch.length > 2) {
    console.log(`Trying unique first name matcher for "${firstNameToMatch}"`);
    
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
}

// Last name only match strategy
function uniqueLastNameMatcher(studentInfo: StudentInfo, gradebookStudents: StudentInfo[]): StudentInfo | null {
  const lastNameToMatch = studentInfo.lastName || 
                          (studentInfo.fullName.includes(' ') ? 
                          studentInfo.fullName.split(' ').pop() : '');
  
  if (lastNameToMatch && lastNameToMatch.length > 2) {
    console.log(`Trying unique last name matcher for "${lastNameToMatch}"`);
    
    const matches = gradebookStudents.filter(student => {
      const studentLastName = student.lastName || 
                             (student.fullName.includes(' ') ? 
                             student.fullName.split(' ').pop() : '');
      return studentLastName?.toLowerCase() === lastNameToMatch.toLowerCase();
    });
    
    if (matches.length === 1) {
      console.log(`✓ MATCH FOUND [Last Name Only]: "${lastNameToMatch}" = "${matches[0].fullName}"`);
      return matches[0];
    } else if (matches.length > 1) {
      console.log(`Found ${matches.length} matches for last name "${lastNameToMatch}" - not unique`);
    }
  }
  return null;
}

// Hyphenated names matcher strategy
function hyphenatedNameMatcher(studentInfo: StudentInfo, gradebookStudents: StudentInfo[]): StudentInfo | null {
  if (studentInfo.fullName.includes('-')) {
    // Try matching by replacing hyphens with spaces
    const nameWithoutHyphens = studentInfo.fullName.replace(/-/g, ' ');
    
    console.log(`Trying hyphen-space matcher: "${studentInfo.fullName}" → "${nameWithoutHyphens}"`);
    
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
    
    console.log(`Trying space-hyphen matcher: "${studentInfo.fullName}" → "${nameWithHyphens}"`);
    
    const match = gradebookStudents.find(student => 
      student.fullName.toLowerCase() === nameWithHyphens.toLowerCase()
    );
    
    if (match) {
      console.log(`✓ MATCH FOUND [Space-Hyphen]: "${studentInfo.fullName}" = "${match.fullName}" (after replacing spaces with hyphens)`);
      return match;
    }
  }
  
  return null;
}

// Unique name matcher strategy
function uniqueNameMatcher(studentInfo: StudentInfo, gradebookStudents: StudentInfo[]): StudentInfo | null {
  const uniqueNames = ['esi', 'jediah', 'beatrice', 'miaoen', 'hayeon', 'lainey', 'bri', 'jenna', 'wade', 'king', 'zhou', 'yang', 'vanderleest', 'utama', 'moore', 'entsir'];
  
  for (const uniqueName of uniqueNames) {
    if (studentInfo.fullName.toLowerCase().includes(uniqueName)) {
      console.log(`Trying unique name matcher for "${uniqueName}" in "${studentInfo.fullName}"`);
      
      const matches = gradebookStudents.filter(student => 
        student.fullName.toLowerCase().includes(uniqueName)
      );
      
      if (matches.length === 1) {
        console.log(`✓ MATCH FOUND [Unique Name]: "${studentInfo.fullName}" contains unique name "${uniqueName}", matched with "${matches[0].fullName}"`);
        return matches[0];
      } else if (matches.length > 1) {
        console.log(`Found ${matches.length} matches for unique name "${uniqueName}" - not unique enough`);
      }
    }
  }
  
  return null;
}

// Fuzzy name matcher strategy
function fuzzyNameMatcher(studentInfo: StudentInfo, gradebookStudents: StudentInfo[]): StudentInfo | null {
  console.log(`Trying fuzzy name matcher for "${studentInfo.fullName}"`);
  
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
  
  if (bestMatch) {
    console.log(`Best fuzzy match for "${studentInfo.fullName}" was "${bestMatch.fullName}" with score ${bestMatchScore.toFixed(2)}, but below threshold (0.35)`);
  }
  
  return null;
}

/**
 * Clean up Moodle folder name to extract actual student name
 */
function cleanUpMoodleName(name: string): string {
  // Debugging original name for comparison
  console.log(`Cleaning up Moodle name: "${name}"`);
  
  // Extract name from Moodle standard format: "Name_12345_assignsubmission_xxx"
  const moodlePattern = /^(.+?)_(\d+)_assignsubmission_/;
  const moodleMatch = name.match(moodlePattern);
  
  if (moodleMatch) {
    // Use the first capture group which contains the student name
    let cleanName = moodleMatch[1];
    console.log(`  → Moodle pattern matched, extracted: "${cleanName}"`);
    
    // Replace underscores and hyphens with spaces
    cleanName = cleanName.replace(/[_\-]/g, ' ').trim();
    return cleanName;
  }
  
  // If it doesn't match the standard Moodle pattern, use original approach
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
  
  console.log(`  → General cleaning resulted in: "${cleanName}"`);
  return cleanName;
}

/**
 * Helper function to calculate Levenshtein distance between two strings
 * Used for fuzzy name matching
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
