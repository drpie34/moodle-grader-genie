
/**
 * Column detection utilities for CSV files
 */

/**
 * Find the column index based on an array of possible variations
 * Case-insensitive and handles partial matches
 */
export function findColumnIndex(headers: string[], variations: string[]): number {
  // Log all headers to debug column matching issues
  console.log("Searching in headers:", headers.map(h => `"${h}"`).join(", "));
  console.log("Looking for variations:", variations.map(v => `"${v}"`).join(", "));
  
  // First try exact matches (case-insensitive)
  for (const variation of variations) {
    const index = headers.findIndex(h => 
      h.toLowerCase().trim() === variation.toLowerCase().trim()
    );
    if (index !== -1) {
      console.log(`Found exact match: "${headers[index]}" (index: ${index}) matches "${variation}"`);
      return index;
    }
  }
  
  // Check for column header "First name" and "Last name" with space exactly as is
  // This is a special case for Moodle exports which commonly use these formats
  for (const header of headers) {
    const headerLower = header.toLowerCase().trim();
    if (variations.includes('first name') && headerLower === 'first name') {
      const index = headers.indexOf(header);
      console.log(`Found special case match: "${header}" (index: ${index}) exactly matches "first name"`);
      return index;
    }
    if (variations.includes('last name') && headerLower === 'last name') {
      const index = headers.indexOf(header);
      console.log(`Found special case match: "${header}" (index: ${index}) exactly matches "last name"`);
      return index;
    }
  }
  
  // Then try includes matches (case-insensitive)
  for (const variation of variations) {
    const index = headers.findIndex(h => 
      h.toLowerCase().trim().includes(variation.toLowerCase().trim())
    );
    if (index !== -1) {
      console.log(`Found partial match: "${headers[index]}" (index: ${index}) includes "${variation}"`);
      return index;
    }
  }
  
  // Finally, check if any header includes any of the variations
  for (const header of headers) {
    const headerLower = header.toLowerCase().trim();
    for (const variation of variations) {
      if (headerLower.includes(variation.toLowerCase().trim())) {
        const index = headers.indexOf(header);
        console.log(`Found reverse match: "${header}" (index: ${index}) includes "${variation}"`);
        return index;
      }
    }
  }
  
  console.log(`No match found for variations: ${variations.join(", ")}`);
  return -1;
}

/**
 * Find the first name column index from headers
 */
export function findFirstNameColumn(headers: string[]): number {
  console.log("Attempting to find first name column in:", headers);
  
  // First check for exact match
  let firstNameIndex = -1;
  
  // Direct check for the most common variations
  for (const header of headers) {
    const headerLower = header.toLowerCase().trim();
    if (headerLower === 'first name' || headerLower === 'firstname') {
      console.log(`Found exact first name match: "${header}"`);
      return headers.indexOf(header);
    }
  }
  
  // If not found with direct match, try with the helper function
  firstNameIndex = findColumnIndex(headers, [
    'first name', 'firstname', 'given name', 'givenname', 'first', 'forename',
    'prénom', 'nombre', 'vorname', 'imię', '名', 'fname'
  ]);
  
  console.log(`First name column detection result: ${firstNameIndex !== -1 ? `Found at ${firstNameIndex}` : 'Not found'}`);
  return firstNameIndex;
}

/**
 * Find the last name column index from headers
 */
export function findLastNameColumn(headers: string[]): number {
  console.log("Attempting to find last name column in:", headers);
  
  // First check for exact match
  let lastNameIndex = -1;
  
  // Direct check for the most common variations
  for (const header of headers) {
    const headerLower = header.toLowerCase().trim();
    if (headerLower === 'last name' || headerLower === 'lastname') {
      console.log(`Found exact last name match: "${header}"`);
      return headers.indexOf(header);
    }
  }
  
  // If not found with direct match, try with the helper function
  lastNameIndex = findColumnIndex(headers, [
    'last name', 'lastname', 'surname', 'family name', 'familyname', 'last', 
    'nom', 'apellido', 'nachname', 'nazwisko', '姓', 'lname'
  ]);
  
  console.log(`Last name column detection result: ${lastNameIndex !== -1 ? `Found at ${lastNameIndex}` : 'Not found'}`);
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
  return headers.findIndex(h => h.toLowerCase().includes('email'));
}

/**
 * Find the ID/identifier column index from headers
 */
export function findIdColumn(headers: string[]): number {
  return headers.findIndex(h => 
    h.toLowerCase().includes('id') || 
    h.toLowerCase() === 'identifier' || 
    h.toLowerCase() === 'username'
  );
}
