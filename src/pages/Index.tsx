
import React, { useState } from "react";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import ApiKeyForm from "@/components/ApiKeyForm";
import UploadStep from "@/components/workflow/UploadStep";
import AssignmentForm from "@/components/assignment/AssignmentForm";
import ReviewStep from "@/components/workflow/ReviewStep";
import ProcessFiles from "@/components/ProcessFiles";
import { WORKFLOW_STEPS } from "@/components/workflow/steps";
import { useGradingWorkflow } from "@/hooks/use-grading-workflow";
import { useApiKey } from "@/hooks/use-api-key";
import { downloadCSV, generateMoodleCSV } from "@/utils/csvUtils";
import { toast } from "sonner";

const Index = () => {
  const [moodleFile, setMoodleFile] = useState<File | null>(null);
  
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
    preloadedGrades
  } = useGradingWorkflow();

  const {
    showApiKeyForm,
    setShowApiKeyForm,
    handleApiKeySubmit
  } = useApiKey();

  const handleMoodleGradebookUploaded = (gradebookData: any) => {
    // Store the moodle grades in the workflow state
    preloadedGrades(gradebookData);
  };

  const handleDownload = () => {
    // Check if we have gradebook format information
    if (moodleGradebook && moodleGradebook.headers && moodleGradebook.assignmentColumn) {
      // Create CSV content using the original format from the gradebook
      const csvContent = generateMoodleCSV(grades, {
        headers: moodleGradebook.headers,
        assignmentColumn: moodleGradebook.assignmentColumn,
        feedbackColumn: moodleGradebook.feedbackColumn || 'Feedback comments'
      });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `moodle_grades_${timestamp}.csv`;
      
      downloadCSV(csvContent, filename);
      toast.success("CSV file downloaded in original Moodle format");
    } else {
      // Fallback to a standard format if no gradebook was uploaded
      const csvContent = generateMoodleCSV(grades, {
        headers: ['Identifier', 'Full name', 'Email address', 'Status', 'Grade', 'Feedback comments'],
        assignmentColumn: 'Grade',
        feedbackColumn: 'Feedback comments'
      });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `moodle_grades_${timestamp}.csv`;
      
      downloadCSV(csvContent, filename);
      toast.success("CSV file downloaded successfully");
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
          
          {showApiKeyForm && (
            <div className="mb-8 animate-scale-in">
              <ApiKeyForm onApiKeySubmit={(key) => {
                handleApiKeySubmit(key);
                setShowApiKeyForm(false);
              }} />
            </div>
          )}
          
          <StepIndicator 
            currentStep={currentStep} 
            steps={WORKFLOW_STEPS} 
            onStepClick={handleStepClick}
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
