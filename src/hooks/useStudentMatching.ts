import type { StudentGrade } from "./use-grading-workflow";

/**
 * Finds the best matching student in a list of students based on name similarity
 */
export function findBestStudentMatch(
  sourceStudent: { 
    fullName: string; 
    firstName?: string; 
    lastName?: string; 
  }, 
  targetStudents: StudentGrade[]
): StudentGrade | null {
  if (!sourceStudent.fullName || targetStudents.length === 0) {
    return null;
  }

  // Normalize the source student name
  const sourceFullName = sourceStudent.fullName.toLowerCase().trim();
  const sourceFirstName = sourceStudent.firstName?.toLowerCase().trim() || '';
  const sourceLastName = sourceStudent.lastName?.toLowerCase().trim() || '';

  // First pass: look for exact matches
  const exactMatch = targetStudents.find(student => 
    student.fullName.toLowerCase().trim() === sourceFullName
  );

  if (exactMatch) {
    console.log(`Found exact fullname match for "${sourceStudent.fullName}": "${exactMatch.fullName}"`);
    return exactMatch;
  }

  // Second pass: check first name + last name combinations if available
  if (sourceFirstName && sourceLastName) {
    const namePartsMatch = targetStudents.find(student => {
      const targetFirstName = student.firstName?.toLowerCase().trim() || '';
      const targetLastName = student.lastName?.toLowerCase().trim() || '';
      
      return (targetFirstName === sourceFirstName && targetLastName === sourceLastName);
    });

    if (namePartsMatch) {
      console.log(`Found first+last name match for "${sourceStudent.fullName}": "${namePartsMatch.fullName}"`);
      return namePartsMatch;
    }
  }

  // Third pass: try to match first name or last name independently
  if (sourceFirstName || sourceLastName) {
    const partialNameMatch = targetStudents.find(student => {
      const targetFirstName = student.firstName?.toLowerCase().trim() || '';
      const targetLastName = student.lastName?.toLowerCase().trim() || '';
      
      return (sourceFirstName && targetFirstName === sourceFirstName) || 
             (sourceLastName && targetLastName === sourceLastName);
    });

    if (partialNameMatch) {
      console.log(`Found partial name match for "${sourceStudent.fullName}": "${partialNameMatch.fullName}"`);
      return partialNameMatch;
    }
  }

  // Fourth pass: more flexible matching with similarity
  let bestMatch: StudentGrade | null = null;
  let highestScore = 0;

  for (const student of targetStudents) {
    const targetFullName = student.fullName.toLowerCase().trim();
    let score = calculateNameSimilarityScore(sourceFullName, targetFullName);

    // Also check first name and last name if available
    if (sourceFirstName && sourceLastName && student.firstName && student.lastName) {
      const firstNameScore = calculateNameSimilarityScore(
        sourceFirstName, 
        student.firstName.toLowerCase().trim()
      );
      
      const lastNameScore = calculateNameSimilarityScore(
        sourceLastName, 
        student.lastName.toLowerCase().trim()
      );
      
      // Weighted combination of full name and first/last name matching
      score = Math.max(score, (firstNameScore * 0.5 + lastNameScore * 0.5));
    }

    if (score > highestScore && score > 0.7) { // Only accept scores above 70% similarity
      highestScore = score;
      bestMatch = student;
    }
  }

  if (bestMatch) {
    console.log(`Found best fuzzy match for "${sourceStudent.fullName}": "${bestMatch.fullName}" (score: ${highestScore.toFixed(2)})`);
    return bestMatch;
  }

  return null; // No acceptable match found
}

/**
 * Calculates a similarity score between two strings
 * Higher score means more similar (1.0 = exact match)
 */
function calculateNameSimilarityScore(str1: string, str2: string): number {
  // Normalize both strings
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0; // Exact match
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Check for substring match
  if (s1.includes(s2) || s2.includes(s1)) {
    // Length of the shorter string divided by the longer string
    return Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
  }
  
  // Calculate Levenshtein distance
  const levDistance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  
  // Convert distance to similarity score
  return 1.0 - (levDistance / maxLength);
}

/**
 * Calculates the Levenshtein distance between two strings
 * Lower distance means more similar
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize the first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return dp[m][n];
}