
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Upload, Pencil, Download, ClipboardCheck } from "lucide-react";
import Header from "@/components/Header";
import FileUploader from "@/components/FileUploader";
import AssignmentForm, { AssignmentFormData } from "@/components/AssignmentForm";
import ProcessFiles from "@/components/ProcessFiles";
import StepIndicator from "@/components/StepIndicator";
import GradingPreview from "@/components/GradingPreview";
import { generateMoodleCSV, downloadCSV, parseMoodleCSV } from "@/utils/fileUtils";

interface StudentGrade {
  identifier: string;
  fullName: string;
  email: string;
  status: string;
  grade: number;
  feedback: string;
  file?: File;
  edited?: boolean;
}

const steps = [
  { id: 1, title: "Upload Files", icon: <Upload className="h-5 w-5" /> },
  { id: 2, title: "Assignment Details", icon: <Pencil className="h-5 w-5" /> },
  { id: 3, title: "Review Grades", icon: <ClipboardCheck className="h-5 w-5" /> },
  { id: 4, title: "Process & Download", icon: <Download className="h-5 w-5" /> }
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [assignmentData, setAssignmentData] = useState<AssignmentFormData | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [sampleDataLoaded, setSampleDataLoaded] = useState(false);

  // Load sample data when appropriate
  useEffect(() => {
    if (currentStep === 3 && assignmentData && files.length > 0 && !sampleDataLoaded) {
      // In a real implementation, this would be the result of AI analysis
      // For now, we're loading sample data
      fetch('/sample_moodle_grades.csv')
        .then(response => response.text())
        .then(csvData => {
          const parsedGrades = parseMoodleCSV(csvData);
          
          // Attach files to grades (in a real implementation, we'd match files to students properly)
          const gradesWithFiles = parsedGrades.map((grade, index) => ({
            ...grade,
            file: files[index % files.length],
            edited: false
          }));
          
          setGrades(gradesWithFiles);
          setSampleDataLoaded(true);
        })
        .catch(error => {
          console.error("Error loading sample data:", error);
          toast.error("Failed to load sample data");
        });
    }
  }, [currentStep, assignmentData, files, sampleDataLoaded]);

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
    setSampleDataLoaded(false); // Reset this so we load new sample data
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateGrade = (index: number, grade: number, feedback: string) => {
    setGrades(prevGrades => {
      const updatedGrades = [...prevGrades];
      updatedGrades[index] = {
        ...updatedGrades[index],
        grade,
        feedback,
        edited: true
      };
      return updatedGrades;
    });
    
    toast.success("Feedback approved");
  };

  const handleApproveAll = () => {
    setGrades(prevGrades => {
      return prevGrades.map(grade => ({ ...grade, edited: true }));
    });
    
    toast.success("All feedback approved");
  };

  const handleContinueToDownload = () => {
    // Check if all grades have been reviewed
    const pendingReviews = grades.filter(grade => !grade.edited).length;
    
    if (pendingReviews > 0) {
      toast.warning(`You still have ${pendingReviews} unreviewed grades. Please review all grades before proceeding.`);
      return;
    }
    
    setCurrentStep(4);
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownload = () => {
    // Create CSV content from the reviewed and approved grades
    const csvContent = generateMoodleCSV(grades);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `moodle_grades_${timestamp}.csv`;
    
    downloadCSV(csvContent, filename);
    toast.success("CSV file downloaded successfully");
  };

  const handleReset = () => {
    setCurrentStep(1);
    setFiles([]);
    setAssignmentData(null);
    setGrades([]);
    setSampleDataLoaded(false);
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
            <div className="space-y-6 animate-scale-in">
              <GradingPreview 
                files={files}
                assignmentData={assignmentData}
                grades={grades}
                onUpdateGrade={handleUpdateGrade}
                onApproveAll={handleApproveAll}
              />
              
              <div className="flex justify-end">
                <button
                  onClick={handleContinueToDownload}
                  className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
                >
                  Continue to Download
                </button>
              </div>
            </div>
          )}
          
          {currentStep === 4 && assignmentData && (
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
