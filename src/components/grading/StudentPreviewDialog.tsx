
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractTextFromFile, extractTextFromHTML } from "@/utils/fileUtils";
import { extractHTMLFromDOCX } from "@/utils/docxUtils";
import { isImageFile } from "@/utils/imageUtils";
import type { StudentGrade } from "@/hooks/use-grading-workflow";

interface StudentPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  student: StudentGrade | null;
  studentIndex: number | null;
  maxPoints: number;
  onUpdateGrade: (index: number, grade: number, feedback: string) => void;
}

const StudentPreviewDialog: React.FC<StudentPreviewDialogProps> = ({
  open,
  onClose,
  student,
  studentIndex,
  maxPoints,
  onUpdateGrade
}) => {
  const [grade, setGrade] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [submissionContent, setSubmissionContent] = useState<string>("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState("feedback");
  const [isHtmlContent, setIsHtmlContent] = useState(false);

  useEffect(() => {
    if (student) {
      setGrade(student.grade);
      
      // Remove any "/30" prefix from feedback (issue #3)
      setFeedback(student.feedback.replace(/^\/\d+\s*/, ''));
      
      if (student.status === "No Submission") {
        // Handle special case for students marked as having no submission
        setSubmissionContent("No submission provided by this student.");
        setIsHtmlContent(false);
      } else if (student.file) {
        // If the student has a file, always load that file's content
        // (this will include image files which will be properly displayed)
        loadFileContent(student.file);
      } else if (student.contentPreview) {
        // Fall back to preview content if no file is available
        setSubmissionContent(student.contentPreview);
        setIsHtmlContent(false);
      } else {
        // Default case if no content and no file
        setSubmissionContent("No submission content available for this student.");
        setIsHtmlContent(false);
      }
    }
  }, [student]);

  const loadFileContent = async (file: File) => {
    if (!file) return;
    
    setIsLoadingContent(true);
    
    try {
      let content = "";
      let isHtml = false;
      
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (file.name.includes("onlinetext") || file.name.endsWith(".html") || file.name.endsWith(".htm") || file.type.includes("html")) {
        // For HTML files, keep the HTML to preserve formatting
        content = await extractTextFromHTML(file);
        isHtml = true;
      } else if (fileExt === 'docx' || fileExt === 'doc') {
        // For DOCX/DOC files, try to convert to HTML to preserve formatting
        try {
          const htmlContent = await extractHTMLFromDOCX(file);
          content = htmlContent;
          isHtml = true;
          
          // Store the original html for viewing in the iframe
          if (file.type.includes('docx') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
            // This is a trick to store docx html using a property
            Object.defineProperty(file, 'docxHtml', {
              value: htmlContent,
              writable: false
            });
          }
        } catch (error) {
          console.error("Error extracting HTML from DOCX/DOC, falling back to text:", error);
          content = await extractTextFromFile(file);
          isHtml = false;
        }
      } else {
        // For other files, extract as plain text
        content = await extractTextFromFile(file);
        isHtml = false;
      }
      
      setSubmissionContent(content || "Failed to extract content from this file type.");
      setIsHtmlContent(isHtml);
    } catch (error) {
      console.error("Error loading file content:", error);
      setSubmissionContent("Error loading content: " + (error as Error).message);
      setIsHtmlContent(false);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSubmit = () => {
    if (studentIndex !== null) {
      // Make sure we preserve any "/30" prefix removal (issue #3)
      onUpdateGrade(studentIndex, grade, feedback);
      onClose();
    }
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{student.fullName}</DialogTitle>
        </DialogHeader>
        
        <Tabs 
          defaultValue="feedback" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full mt-4"
        >
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="feedback">Feedback & Grade</TabsTrigger>
            <TabsTrigger value="submission">Submission Content</TabsTrigger>
          </TabsList>
          
          <TabsContent value="feedback" className="space-y-4 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="grade">Grade (out of {maxPoints})</Label>
                <Input
                  id="grade"
                  type="number"
                  value={grade}
                  onChange={e => setGrade(Number(e.target.value))}
                  min={0}
                  max={maxPoints}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={12}
                  className="mt-1"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="submission" className="space-y-4 py-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                    Submission Content
                  </h3>
                  {student.file && (
                    <div className="text-sm text-muted-foreground">
                      {student.file.name}
                    </div>
                  )}
                </div>
                
                {isLoadingContent ? (
                  <div className="py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading submission content...</p>
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto mt-2">
                    <div className="bg-muted p-4 rounded">
                      {student && student.file ? (
                        <>
                          {isImageFile(student.file) ? (
                            // Image files
                            <div className="flex flex-col items-center space-y-4">
                              <div className="relative w-full">
                                <img 
                                  src={URL.createObjectURL(student.file)} 
                                  alt={`${student.fullName}'s submission`}
                                  className="max-w-full max-h-[500px] object-contain rounded border border-gray-200 shadow-sm mx-auto"
                                />
                                <div className="absolute top-2 right-2 bg-gray-700/60 text-white text-xs px-2 py-1 rounded">
                                  {student.file.name.split('.').pop()?.toUpperCase()} {Math.round(student.file.size/1024)} KB
                                </div>
                              </div>
                              
                              {/* Show extracted text if available */}
                              {submissionContent && submissionContent !== "[IMAGE_SUBMISSION]" && (
                                <div className="w-full mt-4">
                                  <h4 className="text-sm font-medium mb-2">Extracted Content:</h4>
                                  <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded-md overflow-auto">
                                    {submissionContent || "No content extracted from image"}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ) : (student.file.type === 'application/pdf' || student.file.name.toLowerCase().endsWith('.pdf')) ? (
                            // PDF files
                            <div className="flex flex-col space-y-2">
                              <div className="text-sm text-muted-foreground mb-1">
                                PDF Document: {student.file.name} ({Math.round(student.file.size/1024)} KB)
                              </div>
                              <iframe 
                                src={URL.createObjectURL(student.file)} 
                                title={`${student.fullName}'s PDF submission`}
                                className="w-full h-[550px] rounded border border-gray-200"
                              />
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Note:</span> If the PDF doesn't load correctly, you can still view the extracted text below.
                              </div>
                              <div className="mt-2">
                                <h4 className="text-sm font-medium mb-1">Extracted Text:</h4>
                                <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-[200px]">
                                  {submissionContent ? submissionContent.replace(/<br\s*\/?>/g, '\n').replace(/&nbsp;/g, ' ') : "No text extracted from PDF"}
                                </pre>
                              </div>
                            </div>
                          ) : (student.file.name.toLowerCase().endsWith('.docx') || student.file.name.toLowerCase().endsWith('.doc')) ? (
                            // DOCX files
                            <div className="flex flex-col space-y-2">
                              <div className="text-sm text-muted-foreground mb-1">
                                Document: {student.file.name} ({Math.round(student.file.size/1024)} KB)
                              </div>
                              <div 
                                className="w-full h-[550px] rounded border border-gray-200 bg-white"
                              >
                                <iframe
                                  srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;margin:20px;line-height:1.5}</style></head><body>${(student.file as any).docxHtml || submissionContent}</body></html>`}
                                  title={`${student.fullName}'s DOCX submission`}
                                  className="w-full h-full rounded"
                                  sandbox="allow-same-origin"
                                ></iframe>
                              </div>
                            </div>
                          ) : isHtmlContent ? (
                            // HTML content
                            <>
                              <div className="text-sm text-muted-foreground mb-2">
                                HTML Document: {student.file.name} ({Math.round(student.file.size/1024)} KB)
                              </div>
                              <div 
                                className="prose dark:prose-invert max-w-none border border-gray-200 rounded p-4 bg-white dark:bg-gray-800"
                                dangerouslySetInnerHTML={{ __html: submissionContent }}
                              />
                            </>
                          ) : (
                            // All other files
                            <>
                              <div className="text-sm text-muted-foreground mb-2">
                                {student.file.name} ({Math.round(student.file.size/1024)} KB)
                              </div>
                              <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto border border-gray-200 rounded p-4 bg-gray-50 dark:bg-gray-900">
                                {submissionContent || "No content available"}
                              </pre>
                            </>
                          )}
                        </>
                      ) : (
                        // No file case
                        <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200">
                          {submissionContent || "No submission file found for this student."}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentPreviewDialog;
