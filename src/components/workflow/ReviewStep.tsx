
import React from "react";
import GradingPreview from "@/components/GradingPreview";
import { Button } from "@/components/ui/button";
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
  return (
    <div className="space-y-6 animate-scale-in">
      {isProcessing ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">Processing Files</h3>
          <p className="text-muted-foreground">
            Processing your files with the OpenAI API. This may take a few moments...
          </p>
        </div>
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
          >
            Continue to Download
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewStep;
