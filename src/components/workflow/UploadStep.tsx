
import React, { useState } from "react";
import FileUploader from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { uploadMoodleGradebook } from "@/utils/csvUtils";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";

interface UploadStepProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onMoodleGradebookUploaded: (data: any) => void;
  onContinue: () => void;
}

const UploadStep: React.FC<UploadStepProps> = ({ 
  files, 
  onFilesSelected, 
  onMoodleGradebookUploaded,
  onContinue 
}) => {
  const [moodleFile, setMoodleFile] = useState<File | null>(null);
  const [isProcessingGradebook, setIsProcessingGradebook] = useState(false);
  const [gradebookSuccess, setGradebookSuccess] = useState(false);

  const handleMoodleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setMoodleFile(file);
    setIsProcessingGradebook(true);
    setGradebookSuccess(false);
    
    try {
      // Parse the Moodle gradebook file
      const gradebookData = await uploadMoodleGradebook(file);
      onMoodleGradebookUploaded(gradebookData);
      setGradebookSuccess(true);
      toast.success("Moodle gradebook uploaded successfully");
    } catch (error) {
      console.error("Error processing Moodle file:", error);
      toast.error("Error processing Moodle file. Please check the format.");
      setGradebookSuccess(false);
    } finally {
      setIsProcessingGradebook(false);
    }
  };

  return (
    <div className="space-y-8 animate-scale-in">
      <div className="space-y-6">
        <Card className="p-4 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-medium">Step 1: Upload Moodle Gradebook</h3>
              </div>
              {gradebookSuccess && (
                <span className="text-xs text-green-600 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Gradebook uploaded
                </span>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              Begin by uploading your Moodle gradebook export. This ensures student information is correctly matched 
              with their submissions and the downloaded file will exactly match your Moodle format.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="file"
                id="moodleFile"
                onChange={handleMoodleFileUpload}
                accept=".csv,.txt,.xlsx,.xls,.xml,.ods"
                className="text-sm"
                disabled={isProcessingGradebook}
              />
              {moodleFile && (
                <div className="text-xs text-muted-foreground">
                  Using format from: {moodleFile.name}
                </div>
              )}
              {isProcessingGradebook && (
                <div className="text-xs text-muted-foreground flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent mr-1"></div>
                  Processing...
                </div>
              )}
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium">Step 2: Upload Student Submissions</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Now upload your student submissions (ZIP file from Moodle or individual files). 
              The system will match student folders with the names in your gradebook.
            </p>
            
            <FileUploader onFilesSelected={onFilesSelected} />
          </div>
        </Card>
      </div>
      
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
