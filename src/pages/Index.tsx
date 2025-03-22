
import React, { useState } from "react";
import { toast } from "sonner";
import { Upload, Pencil, Download } from "lucide-react";
import Header from "@/components/Header";
import FileUploader from "@/components/FileUploader";
import AssignmentForm, { AssignmentFormData } from "@/components/AssignmentForm";
import ProcessFiles from "@/components/ProcessFiles";
import StepIndicator from "@/components/StepIndicator";
import { generateMoodleCSV, downloadCSV } from "@/utils/fileUtils";

const steps = [
  { id: 1, title: "Upload Files", icon: <Upload className="h-5 w-5" /> },
  { id: 2, title: "Assignment Details", icon: <Pencil className="h-5 w-5" /> },
  { id: 3, title: "Process & Download", icon: <Download className="h-5 w-5" /> }
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [assignmentData, setAssignmentData] = useState<AssignmentFormData | null>(null);

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
  };

  const handleStepOneComplete = () => {
    if (files.length === 0) {
      toast.error("Please upload at least one file to continue");
      return;
    }
    
    setCurrentStep(2);
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAssignmentSubmit = (data: AssignmentFormData) => {
    setAssignmentData(data);
    setCurrentStep(3);
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownload = () => {
    const csvContent = generateMoodleCSV(files);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `moodle_grades_${timestamp}.csv`;
    
    downloadCSV(csvContent, filename);
    toast.success("CSV file downloaded successfully");
  };

  const handleReset = () => {
    setCurrentStep(1);
    setFiles([]);
    setAssignmentData(null);
    toast.info("Started a new grading session");
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-center text-3xl font-bold tracking-tight">
            Moodle Grader Genie
          </h1>
          <p className="mb-8 text-center text-muted-foreground">
            Upload assignments, process them, and download Moodle-compatible grades
          </p>
          
          <StepIndicator 
            currentStep={currentStep} 
            steps={steps} 
            onStepClick={handleStepClick}
          />
          
          {currentStep === 1 && (
            <div className="space-y-8 animate-scale-in">
              <FileUploader onFilesSelected={handleFilesSelected} />
              
              <div className="flex justify-end">
                <button
                  onClick={handleStepOneComplete}
                  className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
                  disabled={files.length === 0}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          
          {currentStep === 2 && (
            <div className="animate-scale-in">
              <AssignmentForm onSubmit={handleAssignmentSubmit} />
            </div>
          )}
          
          {currentStep === 3 && assignmentData && (
            <div className="animate-scale-in">
              <ProcessFiles 
                files={files} 
                assignmentData={assignmentData} 
                onDownload={handleDownload}
                onReset={handleReset}
              />
            </div>
          )}
        </div>
      </main>
      
      <footer className="mt-auto border-t">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Moodle Grader Genie — A batch processing tool for educators</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
