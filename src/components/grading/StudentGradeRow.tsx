
import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Eye } from "lucide-react";
import type { StudentGrade } from "@/hooks/use-grading-workflow";

interface StudentGradeRowProps {
  student: StudentGrade;
  index: number;
  maxPoints: number;
  onReview: (index: number) => void;
}

const StudentGradeRow: React.FC<StudentGradeRowProps> = ({ 
  student, 
  index, 
  maxPoints,
  onReview 
}) => {
  return (
    <div 
      className={`grid grid-cols-12 gap-4 px-4 py-3 text-sm hover:bg-muted/50 ${
        student.edited ? 'bg-green-50 dark:bg-green-950/20' : ''
      }`}
    >
      <div className="col-span-3 flex flex-col">
        <span className="font-medium">{student.fullName}</span>
        <span className="text-xs text-muted-foreground">{student.email}</span>
      </div>
      <div className="col-span-2 font-medium">
        {student.status === "No Submission" ? (
          <span className="text-slate-400">No Grade</span>
        ) : (
          <span>{student.grade !== null ? `${student.grade}/${maxPoints}` : "No Grade"}</span>
        )}
      </div>
      <div className="col-span-5">
        {student.status === "No Submission" ? (
          <p className="text-slate-400 italic">No submission</p>
        ) : student.status === "Empty Submission" ? (
          <p className="text-amber-600 dark:text-amber-400 font-medium">
            Empty submission: {student.feedback}
          </p>
        ) : (
          <p className="line-clamp-2 text-muted-foreground">
            {student.feedback}
          </p>
        )}
      </div>
      <div className="col-span-2 flex justify-end gap-2">
        {student.edited ? (
          <span className="flex items-center text-green-600 dark:text-green-500">
            <Check className="h-4 w-4 mr-1" />
            Approved
          </span>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onReview(index)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Review
          </Button>
        )}
      </div>
    </div>
  );
};

export default StudentGradeRow;
