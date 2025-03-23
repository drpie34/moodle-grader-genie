
/**
 * Column detection utilities for CSV files
 */

/**
 * Find the column index based on an array of possible variations
 * Case-insensitive and handles partial matches
 */
export function findColumnIndex(headers: string[], variations: string[]): number {
  // Log all headers to debug column matching issues
  console.log("\n========== COLUMN DETECTION ==========");
  console.log("Searching in headers:", headers.map(h => `"${h}"`).join(", "));
  console.log("Looking for variations:", variations.map(v => `"${v}"`).join(", "));
  
  // First try exact matches (case-insensitive)
  for (let i = 0; i < headers.length; i++) {
    const headerLower = headers[i].toLowerCase();
    
    for (const variation of variations) {
      const variationLower = variation.toLowerCase();
      
      if (headerLower === variationLower) {
        console.log(`EXACT MATCH: "${headers[i]}" at index ${i} matches "${variation}" (case-insensitive)`);
        return i;
      }
    }
  }
  
  // Try trimmed exact matches
  for (let i = 0; i < headers.length; i++) {
    const headerLower = headers[i].toLowerCase().trim();
    
    for (const variation of variations) {
      const variationLower = variation.toLowerCase().trim();
      
      if (headerLower === variationLower) {
        console.log(`TRIMMED MATCH: "${headers[i]}" at index ${i} matches "${variation}" (trimmed, case-insensitive)`);
        return i;
      }
    }
  }
  
  // Then try includes matches (case-insensitive)
  for (let i = 0; i < headers.length; i++) {
    const headerLower = headers[i].toLowerCase();
    
    for (const variation of variations) {
      const variationLower = variation.toLowerCase();
      
      if (headerLower.includes(variationLower)) {
        console.log(`PARTIAL MATCH: "${headers[i]}" at index ${i} includes "${variation}"`);
        return i;
      }
    }
  }
  
  console.log(`NO MATCH FOUND for variations: ${variations.join(", ")}`);
  console.log("========== END COLUMN DETECTION ==========\n");
  return -1;
}

/**
 * Fallback to original column detection logic that worked before
 * DIRECT port of the original working code, with no changes
 */
export function findColumnIndexOriginal(headers: string[], variations: string[]): number {
  console.log("\n===== TRYING ORIGINAL COLUMN DETECTION LOGIC =====");
  console.log("Headers:", headers);
  console.log("Variations:", variations);
  
  // First try exact matches (case-insensitive)
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    for (const variation of variations) {
      if (header.toLowerCase() === variation.toLowerCase()) {
        console.log(`ORIGINAL LOGIC - EXACT MATCH: "${header}" at index ${i} matches "${variation}"`);
        return i;
      }
    }
  }
  
  // Then try includes matches (case-insensitive)
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    for (const variation of variations) {
      if (header.toLowerCase().includes(variation.toLowerCase())) {
        console.log(`ORIGINAL LOGIC - PARTIAL MATCH: "${header}" at index ${i} includes "${variation}"`);
        return i;
      }
    }
  }
  
  console.log(`ORIGINAL LOGIC - NO MATCH FOUND for variations: ${variations.join(", ")}`);
  console.log("===== END ORIGINAL COLUMN DETECTION LOGIC =====\n");
  return -1;
}

/**
 * Find the first name column index from headers
 */
export function findFirstNameColumn(headers: string[]): number {
  console.log("\n========== FIRST NAME COLUMN DETECTION ==========");
  console.log("Headers for first name detection:", headers);
  
  // Try directly with exact matches first for most common variations
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const headerLower = header.toLowerCase().trim();
    
    // Direct matching for common Moodle formats with exact strings
    if (headerLower === "first name" || headerLower === "firstname" || 
        headerLower === "first" || headerLower === "given name" || 
        headerLower === "givenname") {
      console.log(`DIRECT MATCH for first name: "${header}" at index ${i}`);
      return i;
    }
  }
  
  // Try with the original logic that worked before
  const firstNameVariationsOriginal = ['first name', 'firstname', 'first', 'given name'];
  const originalIndex = findColumnIndexOriginal(headers, firstNameVariationsOriginal);
  if (originalIndex !== -1) {
    return originalIndex;
  }
  
  // Extended variations as fallback
  const firstNameVariations = [
    'first name', 'firstname', 'given name', 'givenname', 'first', 'forename',
    'prénom', 'nombre', 'vorname', 'imię', '名', 'fname', 'f name', 'f_name'
  ];
  
  const index = findColumnIndex(headers, firstNameVariations);
  
  if (index === -1) {
    // Last resort - if we have found last name but not first name, look for a column that might be first name
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      // Check if it contains "first" or "name" but not "last"
      if ((header.includes('first') || header.includes('name')) && !header.includes('last')) {
        console.log(`LAST RESORT MATCH for first name: "${headers[i]}" at index ${i}`);
        return i;
      }
    }
  }
  
  console.log(`First name column detection result: ${index !== -1 ? `Found at ${index}` : 'Not found'}`);
  console.log("========== END FIRST NAME DETECTION ==========\n");
  
  return index;
}

/**
 * Find the last name column index from headers
 */
export function findLastNameColumn(headers: string[]): number {
  console.log("\n========== LAST NAME COLUMN DETECTION ==========");
  console.log("Headers for last name detection:", headers);
  
  // Try directly with exact matches first for most common variations
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const headerLower = header.toLowerCase().trim();
    
    // Direct matching for common Moodle formats with exact strings
    if (headerLower === "last name" || headerLower === "lastname" || 
        headerLower === "last" || headerLower === "surname" || 
        headerLower === "family name" || headerLower === "familyname") {
      console.log(`DIRECT MATCH for last name: "${header}" at index ${i}`);
      return i;
    }
  }
  
  // Try with the original logic that worked before
  const lastNameVariationsOriginal = ['last name', 'lastname', 'last', 'surname', 'family name'];
  const originalIndex = findColumnIndexOriginal(headers, lastNameVariationsOriginal);
  if (originalIndex !== -1) {
    return originalIndex;
  }
  
  // Extended variations as fallback
  const lastNameVariations = [
    'last name', 'lastname', 'surname', 'family name', 'familyname', 'last', 
    'nom', 'apellido', 'nachname', 'nazwisko', '姓', 'lname', 'l name', 'l_name'
  ];
  
  const index = findColumnIndex(headers, lastNameVariations);
  
  if (index === -1) {
    // Last resort - if we have found first name but not last name, look for a column that might be last name
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      // Check if it contains "last" or "name" but not "first"
      if ((header.includes('last') || header.includes('name')) && !header.includes('first')) {
        console.log(`LAST RESORT MATCH for last name: "${headers[i]}" at index ${i}`);
        return i;
      }
    }
  }
  
  console.log(`Last name column detection result: ${index !== -1 ? `Found at ${index}` : 'Not found'}`);
  console.log("========== END LAST NAME DETECTION ==========\n");
  
  return index;
}

/**
 * Find the assignment/grade column index from headers
 */
export function findAssignmentColumn(headers: string[]): number {
  return findColumnIndex(headers, [
    'grade', 'mark', 'score', 'points', 'assessment', 'nota',
    'notas', 'puntuación', 'bewertung', 'ocena'
  ]);
}

/**
 * Find the feedback column index from headers
 */
export function findFeedbackColumn(headers: string[]): number {
  return findColumnIndex(headers, [
    'feedback', 'comment', 'comments', 'annotation', 'note', 'notes',
    'comentario', 'comentarios', 'anmerkung', 'komentarz', 'remarque'
  ]);
}

/**
 * Find the full name column index from headers
 */
export function findFullNameColumn(headers: string[]): number {
  return findColumnIndex(headers, [
    'full name', 'fullname', 'name', 'student', 'participant', 'user',
    'nombre completo', 'vollständiger name', 'imię i nazwisko'
  ]);
}

/**
 * Find the email column index from headers
 */
export function findEmailColumn(headers: string[]): number {
  return findColumnIndex(headers, ['email', 'e-mail', 'mail', 'correo', 'email address', 'emailaddress']);
}

/**
 * Find the ID/identifier column index from headers
 */
export function findIdColumn(headers: string[]): number {
  return findColumnIndex(headers, [
    'id', 'identifier', 'username', 'user id', 'userid', 'student id', 'studentid'
  ]);
}
