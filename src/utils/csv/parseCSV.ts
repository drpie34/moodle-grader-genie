
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
  
  // Debug the raw row
  console.log(`Parsing raw CSV row: "${row}"`);
  
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
  
  // Debug the parsed fields with their lengths
  console.log(`Parsed ${result.length} fields:`);
  result.forEach((field, index) => {
    // Create a representation of the field that shows whitespace
    const debugField = field.replace(/\s/g, '·');
    console.log(`  [${index}] Length ${field.length}: "${debugField}" (${field.charCodeAt(0)},${field.charCodeAt(field.length-1)})`);
  });
  
  return result;
}

/**
 * Parse a CSV file content into rows and columns
 */
export function parseCSVContent(csvData: string): {headers: string[], rows: string[][]} {
  console.log("\n========== STARTING CSV PARSING ==========");
  console.log(`Raw CSV data length: ${csvData.length} characters`);
  
  // Check for BOM (Byte Order Mark) which might affect string comparisons
  const hasBOM = csvData.charCodeAt(0) === 0xFEFF;
  if (hasBOM) {
    console.log("WARNING: CSV data has BOM (Byte Order Mark)");
    // Remove BOM
    csvData = csvData.slice(1);
  }
  
  // Log the first 500 characters of the CSV data
  console.log("CSV data preview (first 500 chars):");
  console.log(csvData.substring(0, 500).replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
  
  // Split into rows, handling both \r\n and \n line endings
  const rows = csvData.split(/\r?\n/).filter(row => row.trim());
  
  console.log(`Found ${rows.length} non-empty rows in CSV`);
  
  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Debug the first few rows
  console.log("\nFirst 3 rows of CSV data:");
  rows.slice(0, 3).forEach((row, i) => {
    console.log(`Row ${i}: "${row}"`);
    // Show hex representation of first few characters to detect invisible chars
    const hexChars = Array.from(row.substring(0, 20)).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
    console.log(`Row ${i} hex: ${hexChars}...`);
  });
  
  // Parse headers, properly handling quoted values
  const headerRow = rows[0];
  console.log("\nParsing header row:", headerRow);
  
  const headers = parseCSVRow(headerRow);
  
  // Normalize headers by trimming whitespace
  const normalizedHeaders = headers.map(h => h.trim());
  
  // Debug header comparison between original and normalized
  console.log("\nHeader comparison (original vs. normalized):");
  headers.forEach((header, i) => {
    if (header !== normalizedHeaders[i]) {
      console.log(`Header [${i}] Original: "${header}" (${header.length} chars)`);
      console.log(`Header [${i}] Normalized: "${normalizedHeaders[i]}" (${normalizedHeaders[i].length} chars)`);
    } else {
      console.log(`Header [${i}]: "${header}" (unchanged by normalization)`);
    }
  });
  
  // Detailed log of all headers for debugging
  console.log("\nDetailed header analysis:");
  normalizedHeaders.forEach((header, i) => {
    const charCodes = Array.from(header).map(c => c.charCodeAt(0));
    console.log(`Header ${i}: "${header}" - Char codes: ${charCodes.join(', ')}`);
  });
  
  // Process data rows, skipping empty rows
  const dataRows = rows.slice(1).filter(row => row.trim()).map(row => {
    // Split the row, respecting quoted values
    return parseCSVRow(row);
  });
  
  // Log sample data rows
  if (dataRows.length > 0) {
    console.log("\nSample data from first row:");
    const firstDataRow = dataRows[0];
    normalizedHeaders.forEach((header, i) => {
      const value = i < firstDataRow.length ? firstDataRow[i] : '';
      console.log(`  ${header}: "${value}"`);
    });
  }
  
  console.log("========== FINISHED CSV PARSING ==========\n");
  
  // Return both original and normalized headers
  return { headers: normalizedHeaders, rows: dataRows };
}
