
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
    const index = headers.findIndex(h => h.toLowerCase() === variation.toLowerCase());
    if (index !== -1) {
      console.log(`Found exact match: "${headers[index]}" (index: ${index}) matches "${variation}"`);
      return index;
    }
  }
  
  // Then try includes matches (case-insensitive)
  for (const variation of variations) {
    const index = headers.findIndex(h => h.toLowerCase().includes(variation.toLowerCase()));
    if (index !== -1) {
      console.log(`Found partial match: "${headers[index]}" (index: ${index}) includes "${variation}"`);
      return index;
    }
  }
  
  // Finally, check if any header includes any of the variations
  for (const header of headers) {
    const headerLower = header.toLowerCase();
    for (const variation of variations) {
      if (headerLower.includes(variation.toLowerCase())) {
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
  
  // Explicit check for "First name" with space
  const firstNameExactIndex = headers.findIndex(h => 
    h.toLowerCase() === 'first name' || 
    h.toLowerCase() === 'firstname'
  );
  
  if (firstNameExactIndex !== -1) {
    console.log(`Found first name column: "${headers[firstNameExactIndex]}" at index ${firstNameExactIndex}`);
    return firstNameExactIndex;
  }
  
  // If exact matching fails, try more flexible matching
  const firstNameIndex = findColumnIndex(headers, [
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
  
  // Explicit check for "Last name" with space
  const lastNameExactIndex = headers.findIndex(h => 
    h.toLowerCase() === 'last name' || 
    h.toLowerCase() === 'lastname'
  );
  
  if (lastNameExactIndex !== -1) {
    console.log(`Found last name column: "${headers[lastNameExactIndex]}" at index ${lastNameExactIndex}`);
    return lastNameExactIndex;
  }
  
  // If exact matching fails, try more flexible matching
  const lastNameIndex = findColumnIndex(headers, [
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
