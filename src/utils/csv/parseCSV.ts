/**
 * CSV parsing utilities
 */

/**
 * Parse a single CSV row properly handling quoted values
 */
export function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      // If we see a quote, toggle the inQuotes state
      // But if we're in quotes and the next char is also a quote, it's an escaped quote
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // If we see a comma and we're not in quotes, end the current field
      result.push(current);
      current = '';
    } else {
      // Otherwise add the character to the current field
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

/**
 * Parse a CSV file content into rows and columns
 */
export function parseCSVContent(csvData: string): {headers: string[], rows: string[][]} {
  // Split into rows, handling both \r\n and \n line endings
  const rows = csvData.split(/\r?\n/).filter(row => row.trim());
  
  // Parse headers, properly handling quoted values
  const headerRow = rows[0];
  const headers = parseCSVRow(headerRow);
  
  // Process data rows, skipping empty rows
  const dataRows = rows.slice(1).filter(row => row.trim()).map(row => {
    // Split the row, respecting quoted values
    return parseCSVRow(row);
  });
  
  return { headers, rows: dataRows };
}
