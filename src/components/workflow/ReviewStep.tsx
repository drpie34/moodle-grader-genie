
import React, { useState, useEffect } from "react";
import GradingPreview from "@/components/GradingPreview";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info, FileSpreadsheet, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { StudentGrade } from "@/hooks/use-grading-workflow";
import type { AssignmentFormData } from "@/components/assignment/AssignmentFormTypes";

interface ReviewStepProps {
  files: File[];
  assignmentData: AssignmentFormData;
  grades: StudentGrade[];
  isProcessing: boolean;
  onUpdateGrade: (index: number, grade: number, feedback: string) => void;
  onApproveAll: () => void;
  onContinue: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  files,
  assignmentData,
  grades,
  isProcessing,
  onUpdateGrade,
  onApproveAll,
  onContinue
}) => {
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [folderStructure, setFolderStructure] = useState<string[]>([]);
  
  // Calculate some stats for the troubleshooting section
  const gradedSubmissions = grades.filter(g => g.file && g.grade > 0).length;
  const totalStudents = grades.length;
  const missingSubmissions = grades.filter(g => !g.file).length;
  
  // Get folder structure for troubleshooting
  useEffect(() => {
    const folders = files
      .filter(file => file.webkitRelativePath)
      .map(file => file.webkitRelativePath.split('/')[0])
      .filter((folder, index, self) => self.indexOf(folder) === index);
    
    console.log("Files available:", files.length);
    console.log("Detected folders:", folders);
    console.log("Student grades setup:", grades.map(g => `${g.fullName} (${g.file ? 'has file' : 'no file'})`).slice(0, 5));
    
    setFolderStructure(folders);
  }, [files]);
  
  return (
    <div className="space-y-6 animate-scale-in">
      {isProcessing ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">Processing Files</h3>
          <p className="text-muted-foreground">
            Processing your files with AI... This may take a few moments...
          </p>
        </div>
      ) : grades.length === 0 ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No submissions found</AlertTitle>
          <AlertDescription>
            No student submissions could be processed. This may happen if all files were empty or in an unsupported format.
            Please go back to the upload step and check your files.
          </AlertDescription>
        </Alert>
      ) : gradedSubmissions === 0 ? (
        <>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No graded submissions found</AlertTitle>
            <AlertDescription>
              The system couldn't match any student submissions with student names in the gradebook.
              This usually happens when the folder names don't match the student names in the gradebook.
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                >
                  {showTroubleshooting ? "Hide Troubleshooting" : "Show Troubleshooting"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          
          {showTroubleshooting && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium flex items-center">
                    <Info className="h-5 w-5 mr-2 text-blue-500" />
                    Troubleshooting Student Name Matching
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    The system is trying to match the folder names in your ZIP file with student names in the gradebook.
                    Here's a summary of what we found:
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-200 pl-4 py-2">
                    <h4 className="text-sm font-medium flex items-center">
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-500" />
                      Gradebook Information
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Found {totalStudents} students in the gradebook.
                    </p>
                    <div className="mt-2 max-h-28 overflow-y-auto">
                      <p className="text-xs font-medium mb-1">Sample student names from gradebook:</p>
                      <ul className="text-xs list-disc pl-5">
                        {grades.slice(0, 5).map((grade, idx) => (
                          <li key={idx}>{grade.fullName}</li>
                        ))}
                        {grades.length > 5 && <li className="italic">...and {grades.length - 5} more</li>}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-amber-200 pl-4 py-2">
                    <h4 className="text-sm font-medium flex items-center">
                      <FolderOpen className="h-4 w-4 mr-2 text-amber-500" />
                      Submission Folder Names
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Found {folderStructure.length} folders in the uploaded submission.
                    </p>
                    <div className="mt-2 max-h-28 overflow-y-auto">
                      <p className="text-xs font-medium mb-1">Sample folder names:</p>
                      <ul className="text-xs list-disc pl-5">
                        {folderStructure.slice(0, 5).map((folder, idx) => (
                          <li key={idx}>{folder}</li>
                        ))}
                        {folderStructure.length > 5 && <li className="italic">...and {folderStructure.length - 5} more</li>}
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-md bg-amber-50 p-3">
                  <div className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 mr-2" />
                    <div className="text-xs text-amber-800">
                      <p className="font-medium">Recommendation:</p>
                      <p>Check that the folder names in your ZIP file match the student names in your gradebook.</p>
                      <p className="mt-1">Common reasons for matching failures:</p>
                      <ul className="list-disc ml-5 mt-1">
                        <li>Different name formats (e.g., "Last, First" vs "First Last")</li>
                        <li>Special characters or capitalization differences</li>
                        <li>Extra text in folder names that confuses the matching algorithm</li>
                        <li>Missing student names in folder structure (check if folders use "onlinetext" without student names)</li>
                      </ul>
                      
                      <div className="mt-3 p-2 bg-white rounded border border-amber-200">
                        <p className="font-medium">Detailed Debug Information:</p>
                        <pre className="whitespace-pre-wrap text-xs mt-1 max-h-32 overflow-y-auto">
                          {`Total files: ${files.length}
Number of students: ${grades.length}
Files with valid paths: ${files.filter(f => f.webkitRelativePath).length}
Files without paths: ${files.filter(f => !f.webkitRelativePath).length}
Students with submissions: ${grades.filter(g => g.file).length}
Students missing submissions: ${grades.filter(g => !g.file).length}
`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <GradingPreview 
            files={files}
            assignmentData={assignmentData}
            grades={grades}
            onUpdateGrade={onUpdateGrade}
            onApproveAll={onApproveAll}
          />
        </>
      ) : (
        <GradingPreview 
          files={files}
          assignmentData={assignmentData}
          grades={grades}
          onUpdateGrade={onUpdateGrade}
          onApproveAll={onApproveAll}
        />
      )}
      
      {!isProcessing && (
        <div className="flex justify-end">
          <Button
            onClick={onContinue}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
            disabled={grades.length === 0}
          >
            Continue to Download
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewStep;
