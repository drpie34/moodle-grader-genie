
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
      
      if (student.contentPreview) {
        // If we already have a preview, use the full content instead of the preview
        if (student.file) {
          // Load the full content
          loadFileContent(student.file);
        } else {
          setSubmissionContent(student.contentPreview);
          setIsHtmlContent(false);
        }
      } else if (student.file) {
        // Load file content
        loadFileContent(student.file);
      } else {
        setSubmissionContent("No submission file found for this student.");
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
      } else if (fileExt === 'docx') {
        // For DOCX files, try to convert to HTML to preserve formatting
        try {
          const htmlContent = await extractHTMLFromDOCX(file);
          content = htmlContent;
          isHtml = true;
        } catch (error) {
          console.error("Error extracting HTML from DOCX, falling back to text:", error);
          content = await extractTextFromFile(file);
          isHtml = false;
        }
      } else {
        // For other files, extract as text but preserve whitespace
        content = await extractTextFromFile(file);
        // Convert newlines to <br> tags and preserve spacing
        if (content) {
          content = content
            .replace(/\n/g, '<br>')
            .replace(/\s{2,}/g, match => '&nbsp;'.repeat(match.length));
          isHtml = true;
        }
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
                      {isHtmlContent ? (
                        <div 
                          className="prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: submissionContent }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {submissionContent || "No content available"}
                        </div>
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
