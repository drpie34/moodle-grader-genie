
/**
 * Parses a Moodle CSV file and returns structured data
 */
export function parseMoodleCSV(csvContent: string) {
  const rows = csvContent.split('\n');
  
  // Skip header row
  const dataRows = rows.slice(1).filter(row => row.trim() !== '');
  
  return dataRows.map(row => {
    // This is a simple CSV parser that handles quoted values
    // In a real implementation, we would use a more robust CSV parser
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
    const values: string[] = [];
    let match;
    
    while ((match = regex.exec(row)) !== null) {
      // If the captured group is the quoted one
      const value = match[1] !== undefined 
        ? match[1].replace(/""/g, '"')  // Replace double quotes with single quotes
        : match[2];                      // Use the unquoted value
      values.push(value || '');
    }
    
    return {
      identifier: values[0] || '',
      fullName: values[1] || '',
      email: values[2] || '',
      status: values[3] || '',
      grade: parseInt(values[4], 10) || 0,
      feedback: values[5] || ''
    };
  });
}

/**
 * Generates a Moodle-compatible CSV file from an array of student grades
 */
export function generateMoodleCSV(grades: any[]): string {
  // Generate header row
  const csvHeader = "Identifier,Full name,Email address,Status,Grade,Feedback comments\n";
  
  // Generate a row for each student grade
  const csvRows = grades.map(grade => {
    const feedback = grade.feedback.replace(/"/g, '""'); // Escape double quotes
    
    return `${grade.identifier},"${grade.fullName}",${grade.email},${grade.status},${grade.grade},"${feedback}"`;
  }).join("\n");
  
  return csvHeader + csvRows;
}

/**
 * Creates and downloads a CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Process a ZIP file to extract its contents
 * This is a placeholder - in a real implementation this would actually extract the ZIP
 */
export function processZipFile(zipFile: File): Promise<File[]> {
  // In a real implementation, this would extract the ZIP file content
  // For now, just return an empty promise
  return Promise.resolve([]);
}
