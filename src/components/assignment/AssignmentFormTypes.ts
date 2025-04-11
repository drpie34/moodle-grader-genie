
export interface AssignmentFormData {
  assignmentName: string;
  courseName: string;
  assignmentInstructions: string;
  rubric: string;
  academicLevel: string;
  gradingScale: number;
  gradingStrictness: number;
  gradingMode: string;
  feedbackLength: number;
  feedbackFormality: number;
  instructorTone: string;
  additionalInstructions: string;
  skipEmptySubmissions: boolean; // New field for skipping students with no submissions
}
