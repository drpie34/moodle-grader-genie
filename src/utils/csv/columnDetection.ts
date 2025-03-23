
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
  
  // Exact matches with special handling
  for (const variation of variations) {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      
      // Try multiple comparison approaches for maximum compatibility
      // 1. Direct comparison (both lowercase, trimmed)
      const headerLower = header.toLowerCase().trim();
      const variationLower = variation.toLowerCase().trim();
      
      if (headerLower === variationLower) {
        console.log(`EXACT MATCH: "${header}" at index ${i} matches "${variation}" (case-insensitive comparison)`);
        return i;
      }
      
      // 2. Space normalization (replace multiple spaces with single space)
      const headerNormalized = headerLower.replace(/\s+/g, ' ');
      const variationNormalized = variationLower.replace(/\s+/g, ' ');
      
      if (headerNormalized === variationNormalized) {
        console.log(`NORMALIZED MATCH: "${header}" at index ${i} matches "${variation}" (after space normalization)`);
        return i;
      }
    }
  }
  
  // Special case for Moodle exports
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim();
    
    // Moodle exact format matches with variation handling for spaces
    const isMoodleFirstName = 
      header === 'first name' || 
      header === 'firstname' ||
      header === 'first' || 
      header === 'given name' ||
      header === 'givenname';
    
    const isMoodleLastName = 
      header === 'last name' || 
      header === 'lastname' || 
      header === 'last' ||
      header === 'surname' || 
      header === 'family name' ||
      header === 'familyname';
    
    // Direct Moodle format check
    if ((variations.includes('first name') || variations.includes('firstname')) && isMoodleFirstName) {
      console.log(`MOODLE FORMAT MATCH: "${headers[i]}" at index ${i} is a recognized Moodle first name column`);
      return i;
    }
    
    if ((variations.includes('last name') || variations.includes('lastname')) && isMoodleLastName) {
      console.log(`MOODLE FORMAT MATCH: "${headers[i]}" at index ${i} is a recognized Moodle last name column`);
      return i;
    }
  }
  
  // Then try includes matches (case-insensitive)
  for (const variation of variations) {
    const variationLower = variation.toLowerCase().trim();
    
    for (let i = 0; i < headers.length; i++) {
      const headerLower = headers[i].toLowerCase().trim();
      
      if (headerLower.includes(variationLower)) {
        console.log(`PARTIAL MATCH: "${headers[i]}" at index ${i} includes "${variation}"`);
        return i;
      }
    }
  }
  
  // Finally, check if any header includes any of the variations
  for (let i = 0; i < headers.length; i++) {
    const headerLower = headers[i].toLowerCase().trim();
    
    for (const variation of variations) {
      const variationLower = variation.toLowerCase().trim();
      
      if (headerLower.includes(variationLower)) {
        console.log(`REVERSE MATCH: "${headers[i]}" at index ${i} includes "${variation}"`);
        return i;
      }
    }
  }
  
  // Fallback: Make one last attempt with very relaxed matching for common patterns
  if (variations.includes('first name') || variations.includes('firstname')) {
    for (let i = 0; i < headers.length; i++) {
      const headerLower = headers[i].toLowerCase().trim();
      if (headerLower.includes('first') || headerLower.includes('given')) {
        console.log(`FALLBACK MATCH: "${headers[i]}" at index ${i} contains "first" or "given"`);
        return i;
      }
    }
  }
  
  if (variations.includes('last name') || variations.includes('lastname')) {
    for (let i = 0; i < headers.length; i++) {
      const headerLower = headers[i].toLowerCase().trim();
      if (headerLower.includes('last') || headerLower.includes('surname') || headerLower.includes('family')) {
        console.log(`FALLBACK MATCH: "${headers[i]}" at index ${i} contains "last", "surname" or "family"`);
        return i;
      }
    }
  }
  
  console.log(`NO MATCH FOUND for variations: ${variations.join(", ")}`);
  console.log("========== END COLUMN DETECTION ==========\n");
  return -1;
}

/**
 * Find the first name column index from headers
 */
export function findFirstNameColumn(headers: string[]): number {
  console.log("\n========== FIRST NAME COLUMN DETECTION ==========");
  console.log("Attempting to find first name column in:", headers);
  
  // First check for direct matches - most common variations with exact matching
  for (const exactMatch of ['first name', 'firstname', 'first', 'given name', 'givenname']) {
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].toLowerCase().trim() === exactMatch) {
        console.log(`DIRECT MATCH: Found exact first name match "${headers[i]}" at index ${i}`);
        console.log("========== END FIRST NAME DETECTION ==========\n");
        return i;
      }
    }
  }
  
  // Try with non-case-sensitive but exact matches, including extra spaces
  for (let i = 0; i < headers.length; i++) {
    const headerNorm = headers[i].toLowerCase().trim().replace(/\s+/g, ' ');
    
    if (headerNorm === 'first name' || headerNorm === 'firstname' || headerNorm === 'given name') {
      console.log(`NORMALIZED MATCH: Found first name match "${headers[i]}" at index ${i} after normalization`);
      console.log("========== END FIRST NAME DETECTION ==========\n");
      return i;
    }
  }
  
  // Finally, use the helper function with all variations
  const firstNameVariations = [
    'first name', 'firstname', 'given name', 'givenname', 'first', 'forename',
    'prénom', 'nombre', 'vorname', 'imię', '名', 'fname', 'f name', 'f_name'
  ];
  
  const firstNameIndex = findColumnIndex(headers, firstNameVariations);
  
  console.log(`First name column detection result: ${firstNameIndex !== -1 ? `Found at ${firstNameIndex}` : 'Not found'}`);
  console.log("========== END FIRST NAME DETECTION ==========\n");
  
  return firstNameIndex;
}

/**
 * Find the last name column index from headers
 */
export function findLastNameColumn(headers: string[]): number {
  console.log("\n========== LAST NAME COLUMN DETECTION ==========");
  console.log("Attempting to find last name column in:", headers);
  
  // First check for direct matches - most common variations with exact matching
  for (const exactMatch of ['last name', 'lastname', 'last', 'surname', 'family name', 'familyname']) {
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].toLowerCase().trim() === exactMatch) {
        console.log(`DIRECT MATCH: Found exact last name match "${headers[i]}" at index ${i}`);
        console.log("========== END LAST NAME DETECTION ==========\n");
        return i;
      }
    }
  }
  
  // Try with non-case-sensitive but exact matches, including extra spaces
  for (let i = 0; i < headers.length; i++) {
    const headerNorm = headers[i].toLowerCase().trim().replace(/\s+/g, ' ');
    
    if (headerNorm === 'last name' || headerNorm === 'lastname' || headerNorm === 'surname') {
      console.log(`NORMALIZED MATCH: Found last name match "${headers[i]}" at index ${i} after normalization`);
      console.log("========== END LAST NAME DETECTION ==========\n");
      return i;
    }
  }
  
  // Finally, use the helper function with all variations
  const lastNameVariations = [
    'last name', 'lastname', 'surname', 'family name', 'familyname', 'last', 
    'nom', 'apellido', 'nachname', 'nazwisko', '姓', 'lname', 'l name', 'l_name'
  ];
  
  const lastNameIndex = findColumnIndex(headers, lastNameVariations);
  
  console.log(`Last name column detection result: ${lastNameIndex !== -1 ? `Found at ${lastNameIndex}` : 'Not found'}`);
  console.log("========== END LAST NAME DETECTION ==========\n");
  
  return lastNameIndex;
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
