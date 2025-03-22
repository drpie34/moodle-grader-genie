
/**
 * Column detection utilities for CSV files
 */

/**
 * Find the column index based on an array of possible variations
 * Case-insensitive and handles partial matches
 */
export function findColumnIndex(headers: string[], variations: string[]): number {
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
 * Find the first name column index from headers
 */
export function findFirstNameColumn(headers: string[]): number {
  // First try exact matching
  let firstNameIndex = headers.findIndex(h => 
    h.toLowerCase() === 'first name' || 
    h.toLowerCase() === 'firstname'
  );
  
  // If exact matching fails, try more flexible matching
  if (firstNameIndex === -1) {
    firstNameIndex = findColumnIndex(headers, [
      'first name', 'firstname', 'given name', 'givenname', 'first', 'forename',
      'prénom', 'nombre', 'vorname', 'imię', '名', 'fname'
    ]);
  }
  
  return firstNameIndex;
}

/**
 * Find the last name column index from headers
 */
export function findLastNameColumn(headers: string[]): number {
  // First try exact matching
  let lastNameIndex = headers.findIndex(h => 
    h.toLowerCase() === 'last name' || 
    h.toLowerCase() === 'lastname'
  );
  
  // If exact matching fails, try more flexible matching
  if (lastNameIndex === -1) {
    lastNameIndex = findColumnIndex(headers, [
      'last name', 'lastname', 'surname', 'family name', 'familyname', 'last', 
      'nom', 'apellido', 'nachname', 'nazwisko', '姓', 'lname'
    ]);
  }
  
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
