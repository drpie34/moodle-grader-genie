
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import UploadStep from "@/components/workflow/UploadStep";
import AssignmentForm from "@/components/assignment/AssignmentForm";
import ReviewStep from "@/components/workflow/ReviewStep";
import ProcessFiles from "@/components/ProcessFiles";
import LogoComponent from "@/components/LogoComponent";
import { WORKFLOW_STEPS } from "@/components/workflow/steps";
import { useGradingWorkflow } from "@/hooks/use-grading-workflow";
import { downloadCSV, generateMoodleCSV } from "@/utils/csv";
import { toast } from "sonner";
import { Sparkles, Lightbulb, BookOpen, Braces } from "lucide-react";

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

  // Create a subtle background effect with decorative elements
  const renderBackgroundEffects = () => (
    <>
      {/* Decorative elements for visual interest */}
      <div className="fixed top-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none"></div>
      
      {/* Decorative gradient orbs */}
      <div className="fixed -top-20 -left-20 w-96 h-96 bg-primary/10 rounded-full opacity-30 blur-[120px] pointer-events-none -z-10"></div>
      <div className="fixed top-1/3 -right-20 w-96 h-96 bg-secondary/10 rounded-full opacity-30 blur-[120px] pointer-events-none -z-10"></div>
      
      {/* Background grid pattern */}
      <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.015] -z-10 pointer-events-none"></div>
    </>
  );

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {renderBackgroundEffects()}
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl">
          {/* Header with premium styling */}
          <div className="mb-10 text-center">
            <div className="inline-flex flex-col items-center mb-3">
              <div className="flex items-center justify-center mb-2">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 text-primary mr-3">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight gradient-text">
                  Grading Assistant
                </h1>
              </div>
              <div className="text-sm text-muted-foreground uppercase tracking-widest font-medium">
                by <span className="gradient-text font-bold">MoodleGrader</span>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Your AI-powered grading companion for seamless Moodle integration
            </p>
          </div>
          
          <StepIndicator 
            currentStep={currentStep} 
            steps={WORKFLOW_STEPS} 
            onStepClick={handleStepClick}
            highestStepReached={highestStepReached}
          />
          
          {/* Main content area with shadow and subtle animation */}
          <div className="relative">
            {currentStep === 1 && (
              <div className="animate-scale-in">
                <UploadStep 
                  files={files}
                  onFilesSelected={handleFilesSelected}
                  onMoodleGradebookUploaded={handleMoodleGradebookUploaded}
                  onContinue={handleStepOneComplete}
                />
              </div>
            )}
            
            {currentStep === 2 && (
              <div className="animate-scale-in">
                <AssignmentForm onSubmit={handleAssignmentSubmit} />
              </div>
            )}
            
            {currentStep === 3 && assignmentData && (
              <div className="animate-scale-in">
                <ReviewStep 
                  files={files}
                  assignmentData={assignmentData}
                  grades={grades}
                  isProcessing={isProcessing}
                  onUpdateGrade={handleUpdateGrade}
                  onApproveAll={handleApproveAll}
                  onContinue={handleContinueToDownload}
                />
              </div>
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
          
          {/* Features section below main workflow area */}
          <div className="mt-24 mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-center">Why Educators Love Moodle Grader</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="premium-card p-6 relative group hover:translate-y-[-5px] transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary rounded-t-xl"></div>
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl">Save Time</h3>
                </div>
                <p className="text-muted-foreground">
                  Reduce grading time by up to 70% while providing more detailed, personalized feedback to students.
                </p>
              </div>
              
              {/* Feature 2 */}
              <div className="premium-card p-6 relative group hover:translate-y-[-5px] transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary rounded-t-xl"></div>
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <Lightbulb className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl">Full Control</h3>
                </div>
                <p className="text-muted-foreground">
                  AI suggests, but you maintain complete authority over final grades and feedback.
                </p>
              </div>
              
              {/* Feature 3 */}
              <div className="premium-card p-6 relative group hover:translate-y-[-5px] transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary rounded-t-xl"></div>
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl">Personalized Style</h3>
                </div>
                <p className="text-muted-foreground">
                  The AI adapts to your unique grading voice and style, ensuring feedback feels authentically yours.
                </p>
              </div>
              
              {/* Feature 4 */}
              <div className="premium-card p-6 relative group hover:translate-y-[-5px] transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary rounded-t-xl"></div>
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <Braces className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl">Seamless Integration</h3>
                </div>
                <p className="text-muted-foreground">
                  Works directly with Moodle's gradebook format for effortless importing and exporting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <LogoComponent logoSize="small" textSize="small" />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>AI-powered grading for educators — <span className="text-primary">Save time. Teach better.</span></p>
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
