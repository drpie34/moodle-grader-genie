
import React from "react";
import FileUploader from "@/components/FileUploader";
import { Button } from "@/components/ui/button";

interface UploadStepProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onContinue: () => void;
}

const UploadStep: React.FC<UploadStepProps> = ({ 
  files, 
  onFilesSelected, 
  onContinue 
}) => {
  return (
    <div className="space-y-8 animate-scale-in">
      <FileUploader onFilesSelected={onFilesSelected} />
      
      <div className="flex justify-end">
        <Button
          onClick={onContinue}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
          disabled={files.length === 0}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default UploadStep;
