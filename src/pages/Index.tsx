
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
import { uploadMoodleGradebook } from "@/utils/csvUtils";
import { toast } from "sonner";

const Index = () => {
  const [moodleFile, setMoodleFile] = useState<File | null>(null);
  
  const {
    currentStep,
    files,
    assignmentData,
    grades,
    isProcessing,
    handleFilesSelected,
    handleStepOneComplete,
    handleAssignmentSubmit,
    handleUpdateGrade,
    handleApproveAll,
    handleContinueToDownload,
    handleReset,
    handleStepClick,
    setGrades
  } = useGradingWorkflow();

  const {
    showApiKeyForm,
    setShowApiKeyForm,
    handleApiKeySubmit
  } = useApiKey();

  const handleMoodleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setMoodleFile(file);
    
    try {
      // Parse the Moodle gradebook file
      const gradebookData = await uploadMoodleGradebook(file);
      
      // Merge with existing grades
      if (grades.length > 0) {
        // Create a map of existing grades by student identifier or name
        const existingGradesMap = new Map();
        grades.forEach(grade => {
          const key = grade.identifier || grade.fullName;
          if (key) existingGradesMap.set(key, grade);
        });
        
        // Update gradebook data with AI grading results
        const updatedGrades = gradebookData.map(entry => {
          const key = entry.identifier || entry.fullName;
          const matchingGrade = key ? existingGradesMap.get(key) : null;
          
          if (matchingGrade) {
            return {
              ...entry,
              grade: matchingGrade.grade,
              feedback: matchingGrade.feedback,
              file: matchingGrade.file,
              edited: matchingGrade.edited
            };
          }
          return entry;
        });
        
        setGrades(updatedGrades);
        toast.success("Moodle gradebook data merged with AI grades");
      } else {
        toast.info("Moodle gradebook file loaded");
      }
    } catch (error) {
      console.error("Error processing Moodle file:", error);
      toast.error("Error processing Moodle file. Please check the format.");
    }
  };

  const handleDownload = () => {
    // Create CSV content from the reviewed and approved grades
    const csvContent = generateMoodleCSV(grades);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `moodle_grades_${timestamp}.csv`;
    
    downloadCSV(csvContent, filename);
    toast.success("CSV file downloaded successfully");
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
              <div className="mb-4">
                <div className="p-4 rounded-lg border bg-muted/50">
                  <h3 className="font-medium mb-2">Import Moodle Gradebook (Optional)</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload your Moodle gradebook export (CSV) to ensure the downloaded file matches your Moodle format exactly.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      id="moodleFile"
                      onChange={handleMoodleFileUpload}
                      accept=".csv,.txt"
                      className="text-sm"
                    />
                    {moodleFile && (
                      <div className="text-xs text-muted-foreground">
                        Using format from: {moodleFile.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
