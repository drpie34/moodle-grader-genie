
import React, { useState } from "react";
import FileUploader from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { uploadMoodleGradebook } from "@/utils/csv";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, CheckCircle, AlertCircle, Info, Folder, Settings } from "lucide-react";
import SubmissionPreview from "./SubmissionPreview";
import { GradebookInfo } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UploadStepProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onMoodleGradebookUploaded: (data: any) => void;
  onContinue: () => void;
}

interface ManualColumnSelectionProps {
  headers: string[];
  onConfirm: (firstNameIndex: number, lastNameIndex: number) => void;
  onCancel: () => void;
}

const ManualColumnSelection: React.FC<ManualColumnSelectionProps> = ({ 
  headers, 
  onConfirm,
  onCancel
}) => {
  const [firstNameColumn, setFirstNameColumn] = useState<string>("");
  const [lastNameColumn, setLastNameColumn] = useState<string>("");

  const handleConfirm = () => {
    const firstNameIndex = headers.findIndex(h => h === firstNameColumn);
    const lastNameIndex = headers.findIndex(h => h === lastNameColumn);
    
    if (firstNameIndex === -1 || lastNameIndex === -1) {
      toast.error("Please select both first name and last name columns");
      return;
    }
    
    onConfirm(firstNameIndex, lastNameIndex);
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Manual Column Selection</DialogTitle>
        <DialogDescription>
          Select which columns contain the first name and last name information
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">First Name Column</label>
          <Select value={firstNameColumn} onValueChange={setFirstNameColumn}>
            <SelectTrigger>
              <SelectValue placeholder="Select first name column" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header, index) => (
                <SelectItem key={`first-${index}`} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Last Name Column</label>
          <Select value={lastNameColumn} onValueChange={setLastNameColumn}>
            <SelectTrigger>
              <SelectValue placeholder="Select last name column" />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header, index) => (
                <SelectItem key={`last-${index}`} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleConfirm}>Confirm Selection</Button>
      </DialogFooter>
    </div>
  );
};

const FileUploaderSection = ({ 
  files, 
  onFilesSelected, 
  onFolderStructureDetected,
  detectedStudents,
  folderStructure 
}: {
  files: File[],
  onFilesSelected: (files: File[]) => void,
  onFolderStructureDetected: (structure: {[folder: string]: File[]}) => void,
  detectedStudents: string[],
  folderStructure: {[folder: string]: File[]}
}) => {
  return (
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
                
                <p><span className="font-medium">Detected folders:</span> {Object.keys(folderStructure).length}</p>
                <p><span className="font-medium">Root level files:</span> {folderStructure['root']?.length || 0}</p>
                
                {Object.keys(folderStructure).length <= 1 && files.length > 0 && (
                  <p className="text-amber-600 mt-1">
                    ⚠️ No folder structure detected! Student matching may not work correctly.
                    Try using the "Upload Folder" button instead of individual files.
                  </p>
                )}
                
                {detectedStudents.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Detected student folders:</p>
                    <ul className="list-disc ml-5 mt-1">
                      {detectedStudents.slice(0, 5).map((student, idx) => (
                        <li key={idx}>{student}</li>
                      ))}
                      {detectedStudents.length > 5 && <li>...and {detectedStudents.length - 5} more</li>}
                    </ul>
                  </div>
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
          onFilesSelected={onFilesSelected} 
          onFolderStructureDetected={onFolderStructureDetected}
        />
      </div>
    </Card>
  );
};

const GradebookUploaderSection = ({
  moodleFile,
  handleMoodleFileUpload,
  gradebookSuccess,
  isProcessingGradebook,
  gradebookStudents,
  hasFirstLastColumns,
  csvHeaders,
  onManualColumnSelect
}: {
  moodleFile: File | null,
  handleMoodleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  gradebookSuccess: boolean,
  isProcessingGradebook: boolean,
  gradebookStudents: string[],
  hasFirstLastColumns: boolean,
  csvHeaders: string[],
  onManualColumnSelect: () => void
}) => {
  return (
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
              {hasFirstLastColumns && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">First & Last Name Columns Found</span>
              )}
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
        
        {gradebookSuccess && !hasFirstLastColumns && (
          <div className="rounded-md bg-amber-50 p-3 mb-2">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 mr-2" />
              <div className="text-xs text-amber-800">
                <p className="font-medium">Warning: First and last name columns not detected</p>
                <p>Your gradebook doesn't appear to have separate columns for first and last names. 
                The system will use the full name for matching, which may be less accurate.</p>
                
                {csvHeaders.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Detected columns:</p>
                    <div className="bg-white/50 p-2 rounded mt-1 max-h-24 overflow-y-auto">
                      {csvHeaders.map((header, idx) => (
                        <div key={idx} className="text-xs">
                          {idx}: "{header}"
                        </div>
                      ))}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2 h-8 text-xs"
                      onClick={onManualColumnSelect}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Manually Select Columns
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {gradebookSuccess && gradebookStudents.length > 0 && (
          <div className="text-xs">
            <p className="font-medium">Detected {gradebookStudents.length} students in gradebook</p>
            <p className="text-muted-foreground mt-1">First few students: {gradebookStudents.slice(0, 5).join(", ")}{gradebookStudents.length > 5 ? ", ..." : ""}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

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
  const [detectedStudents, setDetectedStudents] = useState<string[]>([]);
  const [hasFirstLastColumns, setHasFirstLastColumns] = useState<boolean>(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showManualColumnSelect, setShowManualColumnSelect] = useState(false);
  const [parsedGradebookData, setParsedGradebookData] = useState<any>(null);

  const handleMoodleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setMoodleFile(file);
    setIsProcessingGradebook(true);
    setGradebookSuccess(false);
    
    try {
      console.log("Starting to process file:", file.name);
      const gradebookData = await uploadMoodleGradebook(file);
      
      // Store raw parsed data for manual column selection
      setParsedGradebookData(gradebookData);
      
      console.log("Gradebook parsed with data:", gradebookData);
      console.log("Headers detected:", gradebookData.headers);
      console.log("Total students:", gradebookData.grades.length);
      
      // Store all CSV headers
      setCsvHeaders(gradebookData.headers);
      
      if (gradebookData.grades.length === 0) {
        throw new Error("No student data found in the gradebook file");
      }
      
      onMoodleGradebookUploaded(gradebookData);
      setGradebookSuccess(true);
      toast.success(`Moodle gradebook uploaded successfully with ${gradebookData.grades.length} students`);
      
      const studentNames = gradebookData.grades.map(g => g.fullName);
      setGradebookStudents(studentNames);
      
      const hasFirstLastNames = gradebookData.hasFirstLastColumns || false;
      
      if (!hasFirstLastNames) {
        const hasFirstName = gradebookData.grades.some(g => g.firstName);
        const hasLastName = gradebookData.grades.some(g => g.lastName);
        
        console.log(`First name column found: ${hasFirstName ? "YES" : "NO"}`);
        console.log(`Last name column found: ${hasLastName ? "YES" : "NO"}`);
        
        setHasFirstLastColumns(hasFirstName && hasLastName);
      } else {
        setHasFirstLastColumns(hasFirstLastNames);
        console.log("First and last name columns found directly from parser");
      }
      
      gradebookData.grades.slice(0, 5).forEach((student, idx) => {
        console.log(`Student ${idx + 1} data:`, {
          fullName: student.fullName,
          firstName: student.firstName || "MISSING",
          lastName: student.lastName || "MISSING"
        });
      });
      
      if (hasFirstLastNames || (gradebookData.grades.some(g => g.firstName) && gradebookData.grades.some(g => g.lastName))) {
        console.log("First and last name columns found in gradebook");
        toast.success("First and last name columns detected in gradebook");
      } else {
        console.log("First and last name columns NOT found in gradebook");
        toast.warning("First and last name columns NOT found in gradebook. This may impact student matching.");
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
    
    const studentFolderNames = Object.keys(structure)
      .filter(folder => folder !== 'root')
      .map(folder => {
        const cleanName = folder
          .replace(/_assignsubmission_.*$/, '')
          .replace(/_onlinetext_.*$/, '')
          .replace(/_file_.*$/, '')
          .replace(/^\d+SP\s+/, '')
          .replace(/_\d+$/, '')
          .replace(/[_\-]/g, ' ')
          .trim();
        
        return cleanName;
      });
    
    setDetectedStudents(studentFolderNames);
    console.log("Detected student names from folders:", studentFolderNames);
  };
  
  const handleFilesSelected = (selectedFiles: File[]) => {
    onFilesSelected(selectedFiles);
  };

  const handleManualColumnConfirm = (firstNameIndex: number, lastNameIndex: number) => {
    if (!parsedGradebookData) {
      toast.error("No gradebook data available for column selection");
      return;
    }
    
    // Apply the manual column selection to update first and last names in the gradebook data
    const updatedGrades = parsedGradebookData.grades.map(grade => {
      const originalRow = grade.originalRow || {};
      const rowData = Object.values(originalRow);
      
      // Extract values at the specified indices
      const firstName = firstNameIndex >= 0 && firstNameIndex < csvHeaders.length 
        ? (rowData[firstNameIndex] || "") 
        : "";
      
      const lastName = lastNameIndex >= 0 && lastNameIndex < csvHeaders.length 
        ? (rowData[lastNameIndex] || "") 
        : "";
      
      return {
        ...grade,
        firstName: firstName,
        lastName: lastName,
        fullName: `${firstName} ${lastName}`.trim()
      };
    });
    
    const updatedData = {
      ...parsedGradebookData,
      grades: updatedGrades,
      hasFirstLastColumns: true
    };
    
    // Update the state with the new data
    setParsedGradebookData(updatedData);
    setHasFirstLastColumns(true);
    
    // Pass the updated data back to the parent
    onMoodleGradebookUploaded(updatedData);
    
    toast.success("Column selection applied successfully");
    setShowManualColumnSelect(false);
  };

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
      onContinue();
    }
  };

  return (
    <div className="space-y-8 animate-scale-in">
      <Dialog open={showManualColumnSelect} onOpenChange={setShowManualColumnSelect}>
        <DialogContent>
          <ManualColumnSelection 
            headers={csvHeaders}
            onConfirm={handleManualColumnConfirm}
            onCancel={() => setShowManualColumnSelect(false)}
          />
        </DialogContent>
      </Dialog>
      
      {!showPreview ? (
        <div className="space-y-6">
          <GradebookUploaderSection
            moodleFile={moodleFile}
            handleMoodleFileUpload={handleMoodleFileUpload}
            gradebookSuccess={gradebookSuccess}
            isProcessingGradebook={isProcessingGradebook}
            gradebookStudents={gradebookStudents}
            hasFirstLastColumns={hasFirstLastColumns}
            csvHeaders={csvHeaders}
            onManualColumnSelect={() => setShowManualColumnSelect(true)}
          />
          
          <FileUploaderSection
            files={files}
            onFilesSelected={handleFilesSelected}
            onFolderStructureDetected={handleFolderStructureDetected}
            detectedStudents={detectedStudents}
            folderStructure={folderStructure}
          />
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
