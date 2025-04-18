
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, AlertCircle, Info, FileText, Bug } from "lucide-react";
import { AssignmentFormData } from "./assignment/AssignmentFormTypes";
import StudentGradeRow from "./grading/StudentGradeRow";
import StudentPreviewDialog from "./grading/StudentPreviewDialog";
import GradingApiDebug from "./GradingApiDebug";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { StudentGrade } from "@/hooks/use-grading-workflow";

interface GradingPreviewProps {
  files: File[];
  assignmentData: AssignmentFormData;
  grades: StudentGrade[];
  onUpdateGrade: (index: number, grade: number, feedback: string) => void;
  onApproveAll: () => void;
}

const GradingPreview: React.FC<GradingPreviewProps> = ({
  files,
  assignmentData,
  grades,
  onUpdateGrade,
  onApproveAll,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showNameDetails, setShowNameDetails] = useState(false);
  const [showApiDebug, setShowApiDebug] = useState(false);

  const openStudentPreview = (index: number) => {
    setSelectedStudent(index);
  };

  const closeStudentPreview = () => {
    setSelectedStudent(null);
  };

  const pendingReviews = grades.filter(grade => !grade.edited).length;
  const gradedCount = grades.filter(grade => grade.file && grade.grade > 0).length;
  const ungradedCount = grades.filter(grade => !grade.file || grade.grade === 0).length;
  
  const hasInvalidStudentNames = grades.some(grade => 
    grade.fullName.toLowerCase().includes("onlinetext") || 
    grade.fullName.toLowerCase().includes("assignsubmission")
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">
          Review AI-Generated Grades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium">{assignmentData.assignmentName}</h3>
            <p className="text-sm text-muted-foreground">{assignmentData.courseName}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Only show API debug button if enabled in settings */}
            {localStorage.getItem("show_api_prompt_button") === "true" && (
              <Button
                onClick={() => setShowApiDebug(true)}
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 mr-1 text-muted-foreground hover:text-foreground"
              >
                <Bug className="h-4 w-4" />
                <span className="text-xs">View API Prompt</span>
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {pendingReviews} of {grades.length} pending review
            </span>
            <Button 
              onClick={onApproveAll} 
              variant="outline" 
              size="sm"
              disabled={pendingReviews === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve All
            </Button>
          </div>
        </div>
        
        {gradedCount === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No graded submissions found</AlertTitle>
            <AlertDescription>
              No student submissions could be graded. This could be because the system couldn't match student names from the 
              submission folders with names in the gradebook, or the folders didn't contain valid submission files.
            </AlertDescription>
          </Alert>
        )}
        
        {hasInvalidStudentNames && (
          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertTitle>
              Possible name matching issues detected
              <Badge variant="outline" className="ml-2 border-amber-500 text-amber-500">Warning</Badge>
            </AlertTitle>
            <AlertDescription>
              Some submissions have invalid student names (like "onlinetext" or "assignsubmission"). 
              This usually happens when the folder structure doesn't include proper student names.
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDiagnostics(!showDiagnostics)}>
                  {showDiagnostics ? "Hide Diagnostics" : "Show Diagnostics"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowNameDetails(!showNameDetails)}>
                  {showNameDetails ? "Hide Name Details" : "Show Student Name Details"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {showNameDetails && (
          <div className="rounded-md bg-muted p-4 text-sm space-y-2">
            <h4 className="font-medium flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Student Name Details
            </h4>
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1">Full Name</th>
                    <th className="text-left p-1">First Name</th>
                    <th className="text-left p-1">Last Name</th>
                    <th className="text-left p-1">Has Submission</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((grade, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="p-1">{grade.fullName}</td>
                      <td className="p-1">{grade.firstName || 'N/A'}</td>
                      <td className="p-1">{grade.lastName || 'N/A'}</td>
                      <td className="p-1">{grade.file ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {showDiagnostics && (
          <div className="rounded-md bg-muted p-4 text-sm space-y-2">
            <h4 className="font-medium">File Diagnostics:</h4>
            <div className="max-h-40 overflow-y-auto">
              <ul className="list-disc ml-5 space-y-1">
                {files.slice(0, 10).map((file, index) => (
                  <li key={index} className="text-xs">
                    {file.webkitRelativePath || file.name}
                  </li>
                ))}
                {files.length > 10 && <li className="text-xs italic">...and {files.length - 10} more files</li>}
              </ul>
            </div>
            
            <h4 className="font-medium mt-3">Gradebook Names:</h4>
            <div className="max-h-40 overflow-y-auto">
              <ul className="list-disc ml-5 space-y-1">
                {grades.slice(0, 10).map((grade, index) => (
                  <li key={index} className="text-xs">
                    {grade.fullName} {grade.file ? "(has submission)" : "(no submission)"}
                  </li>
                ))}
                {grades.length > 10 && <li className="text-xs italic">...and {grades.length - 10} more students</li>}
              </ul>
            </div>
          </div>
        )}
        
        <div className="border rounded-md">
          <div className="bg-muted px-4 py-2 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium">
              <div className="col-span-3">Student</div>
              <div className="col-span-2">Grade</div>
              <div className="col-span-5">Feedback Preview</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
          </div>
          
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {grades.map((student, index) => (
              <StudentGradeRow 
                key={index}
                student={student}
                index={index}
                maxPoints={assignmentData.gradingScale}
                onReview={openStudentPreview}
              />
            ))}
          </div>
        </div>

        <StudentPreviewDialog
          open={selectedStudent !== null}
          onClose={closeStudentPreview}
          student={selectedStudent !== null ? grades[selectedStudent] : null}
          studentIndex={selectedStudent}
          maxPoints={assignmentData.gradingScale}
          onUpdateGrade={onUpdateGrade}
        />
        
        {/* API Debug Modal */}
        <GradingApiDebug
          open={showApiDebug}
          onClose={() => setShowApiDebug(false)}
        />
      </CardContent>
    </Card>
  );
};

export default GradingPreview;
