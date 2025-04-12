import React, { useState, useEffect } from "react";
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
          Upload the Moodle submission ZIP file containing all student work.
        </p>
        
        
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
                    ⚠️ No student folder structure detected. Please upload the Moodle ZIP file for proper student matching.
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
          Begin by uploading your Moodle gradebook CSV export. This ensures student information is correctly matched 
          with their submissions and the downloaded file will exactly match your Moodle format.
        </p>
        
        <div className="rounded-md bg-blue-50 p-3 mb-2">
          <div className="flex items-start">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2" />
            <div className="text-xs text-blue-800">
              <p className="font-medium">Supported file format:</p>
              <ul className="list-disc ml-5 mt-1">
                <li><strong>CSV files (.csv)</strong> - CSV format from Moodle gradebook exports</li>
              </ul>
              <p className="mt-1"><strong>Important:</strong> The file should contain columns for student names and the assignment column where you want grades to appear.</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-md bg-blue-50 p-3 mb-2">
          <div className="flex items-start">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2" />
            <div className="text-xs text-blue-800">
              <p className="font-medium">Important:</p>
              <p>The system matches student names from the Moodle submission ZIP file with names in the gradebook.</p>
              <p className="mt-1">Make sure your gradebook has both first and last name columns for best results.</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="file"
            id="moodleFile"
            onChange={handleMoodleFileUpload}
            accept=".csv"
            className="text-sm"
            disabled={isProcessingGradebook}
          />
          {moodleFile && (
            <div className="text-xs text-muted-foreground">
              Using: {moodleFile.name} ({moodleFile.type || 'unknown type'})
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
  
  // Load previous file data from sessionStorage or localStorage
  const [previousFileInfo, setPreviousFileInfo] = useState<{
    fileCount: number;
    filePaths: string[];
  }>(() => {
    try {
      // Get file count from sessionStorage
      const fileCount = parseInt(sessionStorage.getItem('moodle_grader_file_count') || '0', 10);
      
      // Get file paths if available
      let filePaths: string[] = [];
      const pathsJson = sessionStorage.getItem('moodle_grader_file_paths');
      if (pathsJson) {
        filePaths = JSON.parse(pathsJson);
      }
      
      // Log the detected previous file information
      console.log("Previous file information detected:", {
        fileCount, 
        pathsCount: filePaths.length,
        firstFewPaths: filePaths.slice(0, 3)
      });
      
      return { fileCount, filePaths };
    } catch (error) {
      console.error("Error loading previous file info:", error);
      return { fileCount: 0, filePaths: [] };
    }
  });
  
  // Check if this is a navigation back to this step but we have files in memory
  const hasFilesInMemory = files.length > 0;
  
  // Check if we have previous files info but no actual files (navigation case)
  // IMPORTANT: We always want to show this info when we've moved backward from a later step
  const hasPreviousFilesInfo = previousFileInfo.fileCount > 0;
  
  // Make sure to display a notification about missing files but not after reset
  useEffect(() => {
    // Check if sessionStorage was just cleared (indicates we're in a fresh start after reset)
    const wasReset = sessionStorage.getItem('moodle_grader_reset_timestamp');
    const currentTimestamp = Date.now();
    
    // Only show the message if we're not starting fresh
    if (hasPreviousFilesInfo && !hasFilesInMemory && !wasReset) {
      console.log("Previous file info found but actual files missing - notifying user");
      toast.info(`You previously uploaded ${previousFileInfo.fileCount} files. Please re-upload them to continue.`);
    }
    
    // Clear the reset timestamp marker after a short delay
    if (wasReset) {
      console.log("Reset marker found, clearing previous file info from state");
      setPreviousFileInfo({ fileCount: 0, filePaths: [] });
      setTimeout(() => {
        sessionStorage.removeItem('moodle_grader_reset_timestamp');
      }, 1000);
    }
  }, [hasPreviousFilesInfo, hasFilesInMemory, previousFileInfo.fileCount]);

  const handleMoodleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setMoodleFile(file);
    setIsProcessingGradebook(true);
    setGradebookSuccess(false);
    
    try {
      console.log("Starting to process file:", file.name);
      console.log("File type:", file.type);
      console.log("File size:", file.size, "bytes");
      
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      console.log("File extension:", fileExt);
      
      // Log explicit file format information
      if (fileExt === 'xlsx' || fileExt === 'xls') {
        console.log("Processing Excel format gradebook");
        toast.info("Processing Excel format gradebook...");
      } else if (fileExt === 'csv' || fileExt === 'txt') {
        console.log("Processing CSV format gradebook");
        toast.info("Processing CSV format gradebook...");
      } else {
        console.log("Processing unknown format gradebook, will attempt auto-detection");
        toast.info("Attempting to detect gradebook format...");
      }
      
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
        toast.warning("First and last name columns NOT found in gradebook. Consider using manual column selection.");
      }
      
    } catch (error) {
      console.error("Error processing Moodle file:", error);
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      
      if (errMsg.includes("Excel file") || errMsg.includes("XLSX")) {
        toast.error("Error processing file. This appears to be an Excel file with format issues. Try using a different export format from Moodle.");
      } else {
        toast.error(`Error processing Moodle file: ${errMsg}`);
      }
      
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
          
          {hasPreviousFilesInfo ? (
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium">Step 2: Re-upload Student Submissions</h3>
                </div>
                
                <div className="rounded-md bg-blue-50 p-3 mb-2">
                  <div className="flex items-start">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Previous files detected</p>
                      <p>You previously uploaded {previousFileInfo.fileCount} files, but due to browser limitations, 
                         you need to re-upload them to continue.</p>
                      
                      {previousFileInfo.filePaths.length > 0 && (
                        <>
                          <p className="font-medium mt-2">Previously uploaded:</p>
                          <ul className="list-disc ml-5 mt-1 text-xs">
                            {previousFileInfo.filePaths.slice(0, 5).map((path, idx) => (
                              <li key={idx}>{path}</li>
                            ))}
                            {previousFileInfo.filePaths.length > 5 && 
                              <li>...and {previousFileInfo.filePaths.length - 5} more files</li>
                            }
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <FileUploader 
                  onFilesSelected={handleFilesSelected} 
                  onFolderStructureDetected={handleFolderStructureDetected}
                />
              </div>
            </Card>
          ) : (
            <FileUploaderSection
              files={files}
              onFilesSelected={handleFilesSelected}
              onFolderStructureDetected={handleFolderStructureDetected}
              detectedStudents={detectedStudents}
              folderStructure={folderStructure}
            />
          )}
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
