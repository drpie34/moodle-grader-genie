
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Edit, X } from "lucide-react";
import { extractTextFromDOCX, extractTextFromHTML } from "@/utils/fileUtils";
import type { StudentGrade } from "@/hooks/use-grading-workflow";

interface StudentPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  student: StudentGrade | null;
  studentIndex: number | null;
  onUpdateGrade: (index: number, grade: number, feedback: string) => void;
}

const StudentPreviewDialog: React.FC<StudentPreviewDialogProps> = ({
  open,
  onClose,
  student,
  studentIndex,
  onUpdateGrade,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [tempGrade, setTempGrade] = useState(0);
  const [tempFeedback, setTempFeedback] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (student) {
      setTempGrade(student.grade);
      setTempFeedback(student.feedback);
      setEditMode(false);
      setExtractedText(null);
      setIsProcessing(false);
      
      if (student.file) {
        generateFilePreview(student.file);
      }
    }
  }, [student]);

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const saveChanges = () => {
    if (studentIndex !== null) {
      onUpdateGrade(studentIndex, tempGrade, tempFeedback);
      setEditMode(false);
    }
  };

  const generateFilePreview = async (file: File | undefined) => {
    if (!file) {
      setFilePreview(null);
      setExtractedText(null);
      return;
    }

    setIsProcessing(true);
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExt || '')) {
      const imageUrl = URL.createObjectURL(file);
      setFilePreview(imageUrl);
      setIsProcessing(false);
    } else if (fileExt === 'pdf') {
      const pdfUrl = URL.createObjectURL(file);
      setFilePreview(pdfUrl);
      setIsProcessing(false);
    } else if (['doc', 'docx'].includes(fileExt || '')) {
      try {
        // For DOCX files, extract text and display as text preview
        const text = await extractTextFromDOCX(file);
        setExtractedText(text);
        setFilePreview('docx');
        setIsProcessing(false);
      } catch (error) {
        console.error('Error extracting DOCX text:', error);
        setFilePreview('doc');
        setIsProcessing(false);
      }
    } else if (['html', 'htm'].includes(fileExt || '')) {
      try {
        // For HTML files, extract text and display as text preview
        const text = await extractTextFromHTML(file);
        setExtractedText(text);
        setFilePreview('html');
        setIsProcessing(false);
      } catch (error) {
        console.error('Error extracting HTML text:', error);
        
        // Fallback to iframe for HTML files
        const htmlUrl = URL.createObjectURL(file);
        setFilePreview(htmlUrl);
        setIsProcessing(false);
      }
    } else if (fileExt === 'txt') {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setExtractedText(content);
          setFilePreview('txt');
          setIsProcessing(false);
        };
        reader.onerror = (error) => {
          console.error('Error reading text file:', error);
          setFilePreview('unsupported');
          setIsProcessing(false);
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Error with text file:', error);
        setFilePreview('unsupported');
        setIsProcessing(false);
      }
    } else {
      setFilePreview('unsupported');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (filePreview && 
          typeof filePreview === 'string' && 
          filePreview.startsWith('blob:') && 
          !['docx', 'doc', 'html', 'txt', 'unsupported'].includes(filePreview)) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const renderFilePreview = () => {
    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center bg-muted p-8 rounded-md h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">
            Processing file...
          </p>
        </div>
      );
    }
    
    if (!filePreview) return <p>No file available</p>;
    
    if (filePreview === 'doc') {
      return (
        <div className="flex flex-col items-center justify-center bg-muted p-8 rounded-md h-full">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-muted-foreground mb-2">
            Word Document
          </p>
          <p className="text-sm">
            {student?.file?.name}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Word documents cannot be previewed directly in the browser.
          </p>
        </div>
      );
    } else if (filePreview === 'docx' && extractedText) {
      return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-md h-full overflow-auto border">
          <h3 className="text-sm font-medium mb-2">Document Text Content:</h3>
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {extractedText}
          </pre>
        </div>
      );
    } else if (filePreview === 'html') {
      // Two options for HTML: either show extracted text or render in iframe
      if (extractedText) {
        return (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-md h-full overflow-auto border">
            <h3 className="text-sm font-medium mb-2">HTML Content:</h3>
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {extractedText}
            </pre>
          </div>
        );
      } else if (student?.file) {
        const htmlUrl = URL.createObjectURL(student.file);
        return (
          <div className="h-full w-full overflow-hidden border rounded">
            <iframe 
              src={htmlUrl} 
              title="HTML Preview" 
              className="w-full h-full min-h-[500px]"
              sandbox="allow-same-origin"
            />
          </div>
        );
      }
    } else if (filePreview === 'txt' && extractedText) {
      return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-md h-full overflow-auto border">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {extractedText}
          </pre>
        </div>
      );
    } else if (filePreview === 'unsupported') {
      return (
        <div className="flex flex-col items-center justify-center bg-muted p-8 rounded-md h-full">
          <div className="text-4xl mb-4">📎</div>
          <p className="text-muted-foreground mb-2">
            Unsupported File Format
          </p>
          <p className="text-sm">
            {student?.file?.name}
          </p>
        </div>
      );
    } else if (filePreview.startsWith('blob:') || filePreview.startsWith('data:image/')) {
      if (student?.file?.type.includes('pdf')) {
        return (
          <div className="h-full w-full overflow-auto">
            <iframe 
              src={`${filePreview}#view=FitH`} 
              className="w-full h-full min-h-[500px]" 
              title="PDF Preview"
            />
          </div>
        );
      } else if (student?.file?.type.includes('html') || student?.file?.name.endsWith('.html') || student?.file?.name.endsWith('.htm')) {
        return (
          <div className="h-full w-full overflow-hidden border rounded">
            <iframe 
              src={filePreview} 
              className="w-full h-full min-h-[500px]" 
              title="HTML Preview"
              sandbox="allow-same-origin"
            />
          </div>
        );
      } else {
        return (
          <div className="flex items-center justify-center bg-muted rounded-md h-full overflow-auto p-4">
            <img 
              src={filePreview} 
              alt="Submission Preview" 
              className="max-w-full max-h-[500px] object-contain"
            />
          </div>
        );
      }
    }
    
    return <p>Preview not available</p>;
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>
              Student: {student.fullName}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleEditMode}
              className="flex items-center gap-1"
            >
              {editMode ? (
                <>
                  <X className="h-4 w-4" />
                  Cancel Edit
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4" />
                  Edit Feedback
                </>
              )}
            </Button>
          </DialogTitle>
          <DialogDescription>
            File: {student.file?.name}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="submission" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mx-4">
            <TabsTrigger value="submission">Submission</TabsTrigger>
            <TabsTrigger value="feedback">AI Feedback</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-hidden p-4">
            <TabsContent value="submission" className="h-full overflow-auto m-0">
              {renderFilePreview()}
            </TabsContent>
            
            <TabsContent value="feedback" className="h-full overflow-auto m-0">
              {!editMode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">Grade:</span>
                    <span className="text-2xl font-semibold">
                      {student.grade}/100
                    </span>
                  </div>
                  <Separator />
                  <div className="prose max-w-none dark:prose-invert">
                    <h4>Feedback Comments:</h4>
                    <p className="whitespace-pre-line">
                      {student.feedback}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label htmlFor="grade" className="text-muted-foreground">
                      Grade:
                    </label>
                    <input
                      id="grade"
                      type="number"
                      min="0"
                      max="100"
                      value={tempGrade}
                      onChange={(e) => setTempGrade(Number(e.target.value))}
                      className="w-20 px-2 py-1 border rounded-md"
                    />
                    <span className="text-muted-foreground">/100</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <label htmlFor="feedback" className="text-muted-foreground">
                      Feedback Comments:
                    </label>
                    <textarea
                      id="feedback"
                      value={tempFeedback}
                      onChange={(e) => setTempFeedback(e.target.value)}
                      className="w-full h-60 p-2 border rounded-md"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
        
        <DialogFooter>
          {editMode ? (
            <Button onClick={saveChanges}>Save Changes</Button>
          ) : (
            <Button 
              onClick={() => {
                if (studentIndex !== null) {
                  onUpdateGrade(studentIndex, student.grade, student.feedback);
                  onClose();
                }
              }}
            >
              Approve Feedback
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentPreviewDialog;
