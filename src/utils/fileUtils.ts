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

import { extractTextFromPDF } from './pdfUtils';
import { extractTextFromDOCX } from './docxUtils';
import { extractTextFromImage } from './imageUtils';
import { processZipFile as extractFilesFromZip } from './zipUtils';

/**
 * Process a file to extract text content based on its type
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type || getFileTypeFromExtension(file.name);
  
  // Handle different file types
  if (fileType.includes('pdf')) {
    return extractTextFromPDF(file);
  } else if (fileType.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
    return extractTextFromDOCX(file);
  } else if (fileType.includes('text/plain') || file.name.endsWith('.txt')) {
    return extractTextFromTXT(file);
  } else if (fileType.includes('image/')) {
    return extractTextFromImage(file);
  } else {
    // Default: try to read as text
    return extractTextFromTXT(file);
  }
}

/**
 * Get file type from extension when mime type is not available
 */
function getFileTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'txt': return 'text/plain';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
}

/**
 * Extract text from TXT file
 */
async function extractTextFromTXT(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string || '';
      resolve(text);
    };
    reader.readAsText(file);
  });
}

/**
 * Process a ZIP file to extract its contents
 */
export async function processZipFile(zipFile: File): Promise<File[]> {
  return extractFilesFromZip(zipFile);
}

/**
 * Send data to OpenAI for grading
 */
export async function gradeWithOpenAI(
  text: string, 
  assignmentData: any, 
  apiKey: string
): Promise<{ grade: number; feedback: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that grades student assignments. 
                      The assignment is for ${assignmentData.courseName}, 
                      titled "${assignmentData.assignmentName}". 
                      The academic level is ${assignmentData.academicLevel}. 
                      Use a ${assignmentData.gradingScale}-point scale with 
                      ${assignmentData.gradingStrictness}/10 strictness. 
                      
                      Assignment instructions: ${assignmentData.assignmentInstructions}
                      
                      Rubric: ${assignmentData.rubric || 'No specific rubric provided.'}`
          },
          {
            role: 'user',
            content: `Here is the student's submission: \n\n${text}\n\nPlease grade this submission and provide feedback. Return your response in JSON format with two fields: "grade" (a number) and "feedback" (a string with your comments).`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse the JSON response
    try {
      // The model should return JSON, but it might include markdown formatting
      // Let's try to extract just the JSON part
      const jsonMatch = content.match(/```json\n([\s\S]*)\n```/) || 
                        content.match(/```\n([\s\S]*)\n```/) || 
                        content.match(/{[\s\S]*}/);
      
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      const result = JSON.parse(jsonString);
      
      return {
        grade: Number(result.grade),
        feedback: result.feedback
      };
    } catch (e) {
      // If parsing fails, extract grade and feedback manually
      // This is a fallback in case the model doesn't return proper JSON
      const gradeMatch = content.match(/grade["\s:]+(\d+)/i);
      const grade = gradeMatch ? parseInt(gradeMatch[1], 10) : 0;
      
      // Remove any JSON-like formatting and just use the content as feedback
      const feedback = content.replace(/{|}|"grade":|"feedback":|"/g, '');
      
      return { grade, feedback };
    }
  } catch (error) {
    console.error('Error grading with OpenAI:', error);
    return {
      grade: 0,
      feedback: `Error grading assignment: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
