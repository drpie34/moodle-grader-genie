
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { AssignmentFormData } from "./assignment/AssignmentFormTypes";
import StudentGradeRow from "./grading/StudentGradeRow";
import StudentPreviewDialog from "./grading/StudentPreviewDialog";
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

  const openStudentPreview = (index: number) => {
    setSelectedStudent(index);
  };

  const closeStudentPreview = () => {
    setSelectedStudent(null);
  };

  const pendingReviews = grades.filter(grade => !grade.edited).length;

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
      </CardContent>
    </Card>
  );
};

export default GradingPreview;
