
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Upload, Pencil, Download, ClipboardCheck } from "lucide-react";
import Header from "@/components/Header";
import FileUploader from "@/components/FileUploader";
import AssignmentForm, { AssignmentFormData } from "@/components/AssignmentForm";
import ProcessFiles from "@/components/ProcessFiles";
import StepIndicator from "@/components/StepIndicator";
import GradingPreview from "@/components/GradingPreview";
import ApiKeyForm from "@/components/ApiKeyForm";
import { 
  generateMoodleCSV, 
  downloadCSV, 
  parseMoodleCSV, 
  extractTextFromFile,
  gradeWithOpenAI 
} from "@/utils/fileUtils";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      setShowApiKeyForm(true);
    }
  }, []);

  // Process files with OpenAI when ready
  useEffect(() => {
    const processFilesWithAI = async () => {
      if (currentStep === 3 && assignmentData && files.length > 0 && apiKey && !sampleDataLoaded && !isProcessing) {
        setIsProcessing(true);
        toast.info(`Processing ${files.length} files with AI...`);
        
        try {
          // For each file, extract text and send to OpenAI for grading
          const processedGrades: StudentGrade[] = [];
          
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Extract a student identifier from the filename
            const studentId = `student${i + 1}`;
            const studentName = file.name.split('.')[0].replace(/_/g, ' ');
            
            // Extract text from the file
            const fileContent = await extractTextFromFile(file);
            
            // Process with OpenAI
            const gradingResult = await gradeWithOpenAI(fileContent, assignmentData, apiKey);
            
            // Add to processed grades
            processedGrades.push({
              identifier: studentId,
              fullName: studentName,
              email: `${studentId}@example.com`,
              status: "Graded",
              grade: gradingResult.grade,
              feedback: gradingResult.feedback,
              file: file,
              edited: false
            });
            
            // Update progress
            toast.info(`Processed ${i + 1}/${files.length} files`);
          }
          
          setGrades(processedGrades);
          setSampleDataLoaded(true);
          toast.success("All files processed successfully!");
        } catch (error) {
          console.error("Error processing files:", error);
          toast.error("Error processing files. Please check your API key and try again.");
          
          // Fallback to sample data if processing fails
          fetchSampleData();
        } finally {
          setIsProcessing(false);
        }
      } else if (currentStep === 3 && assignmentData && files.length > 0 && !apiKey && !sampleDataLoaded) {
        // If no API key, prompt user to enter one
        setShowApiKeyForm(true);
        
        // Meanwhile, load sample data
        fetchSampleData();
      }
    };
    
    processFilesWithAI();
  }, [currentStep, assignmentData, files, apiKey, sampleDataLoaded, isProcessing]);

  // Fallback function to load sample data
  const fetchSampleData = () => {
    if (!sampleDataLoaded) {
      fetch('/sample_moodle_grades.csv')
        .then(response => response.text())
        .then(csvData => {
          const parsedGrades = parseMoodleCSV(csvData);
          
          // Attach files to grades
          const gradesWithFiles = parsedGrades.map((grade, index) => ({
            ...grade,
            file: files[index % files.length],
            edited: false
          }));
          
          setGrades(gradesWithFiles);
          setSampleDataLoaded(true);
          
          if (!apiKey) {
            toast.info("Using sample data. Add an OpenAI API key for real grading.");
          }
        })
        .catch(error => {
          console.error("Error loading sample data:", error);
          toast.error("Failed to load sample data");
        });
    }
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setSampleDataLoaded(false);
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
    setSampleDataLoaded(false);
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

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setShowApiKeyForm(false);
    
    // If we're on the review step, reset sample data to trigger processing with the new API key
    if (currentStep === 3) {
      setSampleDataLoaded(false);
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
              <ApiKeyForm onApiKeySubmit={handleApiKeySubmit} />
            </div>
          )}
          
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
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4"></div>
                  <h3 className="text-xl font-semibold mb-2">Processing Files</h3>
                  <p className="text-muted-foreground">
                    Processing your files with the OpenAI API. This may take a few moments...
                  </p>
                </div>
              ) : (
                <GradingPreview 
                  files={files}
                  assignmentData={assignmentData}
                  grades={grades}
                  onUpdateGrade={handleUpdateGrade}
                  onApproveAll={handleApproveAll}
                />
              )}
              
              {!isProcessing && (
                <div className="flex justify-end">
                  <button
                    onClick={handleContinueToDownload}
                    className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
                  >
                    Continue to Download
                  </button>
                </div>
              )}
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
