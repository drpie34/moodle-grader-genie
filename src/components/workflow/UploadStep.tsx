
import React, { useState } from "react";
import FileUploader from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { uploadMoodleGradebook } from "@/utils/csvUtils";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, CheckCircle, AlertCircle, Info, Folder } from "lucide-react";
import SubmissionPreview from "./SubmissionPreview";

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
  const [folderStructure, setFolderStructure] = useState<{[folder: string]: File[]}>({});
  const [gradebookStudents, setGradebookStudents] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

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
      console.log("Moodle gradebook data:", gradebookData); // Debug log
      
      // Extract student names for preview matching
      const studentNames = gradebookData.grades.map(g => g.fullName);
      setGradebookStudents(studentNames);
      
      // Log if first/last name columns were found
      const hasFirstName = gradebookData.grades.some(g => g.firstName);
      const hasLastName = gradebookData.grades.some(g => g.lastName);
      
      if (hasFirstName && hasLastName) {
        console.log("First and last name columns found in gradebook");
        toast.info("First and last name columns detected in gradebook");
      } else {
        console.log("First and last name columns NOT found in gradebook");
      }
    } catch (error) {
      console.error("Error processing Moodle file:", error);
      toast.error("Error processing Moodle file. Please check the format.");
      setGradebookSuccess(false);
    } finally {
      setIsProcessingGradebook(false);
    }
  };

  const handleFolderStructureDetected = (structure: {[folder: string]: File[]}) => {
    setFolderStructure(structure);
    console.log("Folder structure detected:", Object.keys(structure));
  };
  
  const handleFilesSelected = (selectedFiles: File[]) => {
    onFilesSelected(selectedFiles);
  };

  // Calculate how many files have folder paths (to show in UI)
  const filesWithFolderPaths = files.filter(file => 
    file.webkitRelativePath && file.webkitRelativePath.includes('/')
  ).length;
  
  const handleContinueClick = () => {
    if (files.length === 0) {
      toast.error("Please upload at least one file to continue");
      return;
    }
    
    if (filesWithFolderPaths > 0 || Object.keys(folderStructure).length > 1) {
      setShowPreview(true);
    } else {
      // If there's no folder structure to preview, just continue
      onContinue();
    }
  };

  return (
    <div className="space-y-8 animate-scale-in">
      {!showPreview ? (
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
              
              <div className="rounded-md bg-blue-50 p-3 mb-2">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium">Important for student matching:</p>
                    <p>The system matches student names from folders in your submission ZIP file with names in the gradebook. 
                    The folder names <strong>MUST</strong> contain student names that match the student names in the gradebook.</p>
                    <p className="mt-1"><strong>For best results:</strong></p>
                    <ul className="list-disc ml-5 mt-1">
                      <li>Make sure your gradebook has both first and last name columns if possible</li>
                      <li>The system will try to match names in multiple formats (First Last, Last First, etc.)</li>
                    </ul>
                    <p className="mt-1"><strong>Example folder names that work well:</strong></p>
                    <ul className="list-disc ml-5 mt-1">
                      <li>Jane Smith_12345_assignsubmission_file</li>
                      <li>Smith, Jane_12345_assignsubmission_file</li>
                      <li>SMITH_JANE_12345_assignsubmission_file</li>
                    </ul>
                  </div>
                </div>
              </div>
              
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
                Now upload your student submissions. For best results, use the "upload folder" button to 
                preserve the folder structure with student names that can be matched with the gradebook.
              </p>
              
              <div className="rounded-md bg-blue-50 p-3 mb-2">
                <div className="flex items-start">
                  <Folder className="h-4 w-4 text-blue-500 mt-0.5 mr-2" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium">Using the "Upload Folder" Option (Recommended):</p>
                    <p>This option preserves the folder structure that contains student names which are essential for matching.
                    Select the parent folder that contains all student folders.</p>
                    <p className="mt-1 font-medium">Folder Structure Example:</p>
                    <pre className="bg-white/50 p-1 rounded mt-1">
                      MainFolder/<br/>
                      ├── Jane Smith_12345_assignsubmission_file/<br/>
                      │   └── essay.pdf<br/>
                      ├── John Doe_67890_assignsubmission_file/<br/>
                      │   └── assignment.docx<br/>
                    </pre>
                  </div>
                </div>
              </div>
              
              {files.length > 0 && (
                <div className="rounded-md bg-muted p-3 mb-2">
                  <div className="flex items-start">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 mr-2" />
                    <div className="text-xs">
                      <p><span className="font-medium">Upload Status:</span> {files.length} files selected</p>
                      <p><span className="font-medium">Files with folder structure:</span> {filesWithFolderPaths}</p>
                      {filesWithFolderPaths === 0 && Object.keys(folderStructure).length <= 1 && (
                        <p className="text-amber-600 mt-1">
                          ⚠️ No folder structure detected! Student matching may not work correctly.
                          Try using the "Upload Folder" button instead of individual files.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="rounded-md bg-amber-50 p-3 mb-2">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 mr-2" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium">Important note about student submissions:</p>
                    <p>For best results, upload the parent folder that contains all student submission folders or a ZIP file 
                    exported directly from Moodle with all student submissions.</p>
                    <p className="mt-1"><strong>Common Issue:</strong> If you're seeing submissions for "Onlinetext" instead of actual student names, 
                    check that your folder structure includes student names in the folder paths before "onlinetext" or "file".</p>
                  </div>
                </div>
              </div>
              
              <FileUploader 
                onFilesSelected={handleFilesSelected} 
                onFolderStructureDetected={handleFolderStructureDetected}
              />
            </div>
          </Card>
        </div>
      ) : (
        <SubmissionPreview 
          files={files}
          folderStructure={folderStructure}
          gradebookStudents={gradebookStudents}
          onContinue={onContinue}
        />
      )}
      
      {!showPreview && (
        <div className="flex justify-end">
          <Button
            onClick={handleContinueClick}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
            disabled={files.length === 0}
          >
            {(filesWithFolderPaths > 0 || Object.keys(folderStructure).length > 1) ? 'Preview Submissions' : 'Continue'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UploadStep;
