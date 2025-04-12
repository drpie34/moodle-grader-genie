
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import UploadStep from "@/components/workflow/UploadStep";
import AssignmentForm from "@/components/assignment/AssignmentForm";
import ReviewStep from "@/components/workflow/ReviewStep";
import ProcessFiles from "@/components/ProcessFiles";
import { WORKFLOW_STEPS } from "@/components/workflow/steps";
import { useGradingWorkflow } from "@/hooks/use-grading-workflow";
import { downloadCSV, generateMoodleCSV } from "@/utils/csv";
import { toast } from "sonner";

const Index = () => {
  const [moodleFile, setMoodleFile] = useState<File | null>(null);
  
  // Add console logs to debug current state
  console.log("Index component rendering - Checking local storage:");
  console.log("- Current step from localStorage:", localStorage.getItem('moodle_grader_current_step'));
  console.log("- Assignment data size:", 
    localStorage.getItem('moodle_grader_assignment_data')?.length || 0, "bytes");
  console.log("- Grades data size:", 
    localStorage.getItem('moodle_grader_grades')?.length || 0, "bytes");
  console.log("- File count from sessionStorage:", 
    sessionStorage.getItem('moodle_grader_file_count') || "none");
    
  const {
    currentStep,
    files,
    assignmentData,
    grades,
    isProcessing,
    moodleGradebook,
    handleFilesSelected,
    handleStepOneComplete,
    handleAssignmentSubmit,
    handleUpdateGrade,
    handleApproveAll,
    handleContinueToDownload,
    handleReset,
    handleStepClick,
    preloadedGrades,
    highestStepReached
  } = useGradingWorkflow();
  
  console.log("Current workflow state:", {
    currentStep,
    highestStepReached,
    filesCount: files.length,
    hasAssignmentData: !!assignmentData,
    gradesCount: grades.length
  });

  // Set up server API key automatically on component mount
  useEffect(() => {
    localStorage.removeItem("openai_api_key");
    localStorage.setItem("use_server_api_key", "true");
  }, []);

  const handleMoodleGradebookUploaded = (gradebookData: any) => {
    preloadedGrades(gradebookData);
  };

  const handleDownload = () => {
    if (moodleGradebook && moodleGradebook.headers && moodleGradebook.assignmentColumn) {
      console.log("Generating CSV with exact format matching:", {
        headers: moodleGradebook.headers,
        assignmentColumn: moodleGradebook.assignmentColumn,
        feedbackColumn: moodleGradebook.feedbackColumn
      });
      
      const csvContent = generateMoodleCSV(grades, {
        headers: moodleGradebook.headers,
        assignmentColumn: moodleGradebook.assignmentColumn,
        feedbackColumn: moodleGradebook.feedbackColumn || `${moodleGradebook.assignmentColumn} (feedback)`
      });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `moodle_grades_${timestamp}.csv`;
      
      downloadCSV(csvContent, filename);
      toast.success("CSV file downloaded with original gradebook format preserved");
    } else {
      console.error("Missing moodleGradebook data:", moodleGradebook);
      toast.error("Missing original gradebook format information. Please upload a CSV file first.");
    }
  };

  // Function to download grading prompts for debugging
  const handleDownloadPrompts = () => {
    const gradingPrompts = localStorage.getItem('grading_prompts');
    if (gradingPrompts) {
      const jsonBlob = new Blob([gradingPrompts], { type: 'application/json' });
      const url = URL.createObjectURL(jsonBlob);
      const link = document.createElement('a');
      
      link.href = url;
      link.setAttribute('download', 'grading_prompts.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Grading prompts downloaded successfully");
    } else {
      toast.error("No grading prompts found. Process some submissions first.");
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
          <p className="mb-4 text-center text-muted-foreground">
            Upload assignments, process them, and download Moodle-compatible grades
          </p>
          
          <StepIndicator 
            currentStep={currentStep} 
            steps={WORKFLOW_STEPS} 
            onStepClick={handleStepClick}
            highestStepReached={highestStepReached}
          />
          
          {currentStep === 1 && (
            <UploadStep 
              files={files}
              onFilesSelected={handleFilesSelected}
              onMoodleGradebookUploaded={handleMoodleGradebookUploaded}
              onContinue={handleStepOneComplete}
            />
          )}
          
          {currentStep === 2 && (
            <div className="animate-scale-in">
              <AssignmentForm onSubmit={handleAssignmentSubmit} />
            </div>
          )}
          
          {currentStep === 3 && assignmentData && (
            <ReviewStep 
              files={files}
              assignmentData={assignmentData}
              grades={grades}
              isProcessing={isProcessing}
              onUpdateGrade={handleUpdateGrade}
              onApproveAll={handleApproveAll}
              onContinue={handleContinueToDownload}
            />
          )}
          
          {currentStep === 4 && assignmentData && (
            <div className="animate-scale-in">
              <ProcessFiles 
                files={files} 
                assignmentData={assignmentData}
                moodleFormatHeaders={moodleGradebook?.headers}
                assignmentColumn={moodleGradebook?.assignmentColumn}
                feedbackColumn={moodleGradebook?.feedbackColumn} 
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
