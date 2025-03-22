import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Edit, Eye, Check, X } from "lucide-react";
import { AssignmentFormData } from "./AssignmentForm";

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

interface GradingPreviewProps {
  files: File[];
  assignmentData: AssignmentFormData;
  grades: StudentGrade[];
  onUpdateGrade: (index: number, grade: number, feedback: string) => void;
  onApproveAll: () => void;
}

const GradingPreview: React.FC<GradingPreviewProps> = ({
  files,
  assignmentData,
  grades,
  onUpdateGrade,
  onApproveAll,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [tempGrade, setTempGrade] = useState(0);
  const [tempFeedback, setTempFeedback] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const openStudentPreview = (index: number) => {
    setSelectedStudent(index);
    setTempGrade(grades[index].grade);
    setTempFeedback(grades[index].feedback);
    setEditMode(false);
    
    if (grades[index].file) {
      generateFilePreview(grades[index].file);
    }
  };

  const closeStudentPreview = () => {
    setSelectedStudent(null);
    setEditMode(false);
    setFilePreview(null);
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const saveChanges = () => {
    if (selectedStudent !== null) {
      onUpdateGrade(selectedStudent, tempGrade, tempFeedback);
      setEditMode(false);
    }
  };

  const generateFilePreview = async (file: File | undefined) => {
    if (!file) {
      setFilePreview(null);
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExt || '')) {
      const imageUrl = URL.createObjectURL(file);
      setFilePreview(imageUrl);
    } else if (fileExt === 'pdf') {
      const pdfUrl = URL.createObjectURL(file);
      setFilePreview(pdfUrl);
    } else if (['doc', 'docx', 'txt'].includes(fileExt || '')) {
      if (fileExt === 'txt') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setFilePreview(`data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
        };
        reader.readAsText(file);
      } else {
        setFilePreview('doc');
      }
    } else {
      setFilePreview('unsupported');
    }
  };

  useEffect(() => {
    return () => {
      if (filePreview && !filePreview.startsWith('data:') && 
          filePreview !== 'doc' && filePreview !== 'unsupported') {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const renderFilePreview = () => {
    if (!filePreview) return <p>No file available</p>;
    
    if (filePreview === 'doc') {
      return (
        <div className="flex flex-col items-center justify-center bg-muted p-8 rounded-md h-full">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-muted-foreground mb-2">
            Word Document
          </p>
          <p className="text-sm">
            {selectedStudent !== null && grades[selectedStudent]?.file?.name}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Word documents cannot be previewed directly in the browser.
          </p>
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
            {selectedStudent !== null && grades[selectedStudent]?.file?.name}
          </p>
        </div>
      );
    } else if (filePreview.startsWith('data:text/plain')) {
      return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-md h-full overflow-auto border">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {decodeURIComponent(filePreview.replace('data:text/plain;charset=utf-8,', ''))}
          </pre>
        </div>
      );
    } else if (filePreview.startsWith('blob:') || filePreview.startsWith('data:image/')) {
      if (selectedStudent !== null && grades[selectedStudent]?.file?.type.includes('pdf')) {
        return (
          <div className="h-full w-full overflow-auto">
            <iframe 
              src={`${filePreview}#view=FitH`} 
              className="w-full h-full min-h-[500px]" 
              title="PDF Preview"
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

  const pendingReviews = grades.filter(grade => !grade.edited).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">
          Review AI-Generated Grades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium">{assignmentData.assignmentName}</h3>
            <p className="text-sm text-muted-foreground">{assignmentData.courseName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {pendingReviews} of {grades.length} pending review
            </span>
            <Button 
              onClick={onApproveAll} 
              variant="outline" 
              size="sm"
              disabled={pendingReviews === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve All
            </Button>
          </div>
        </div>
        
        <div className="border rounded-md">
          <div className="bg-muted px-4 py-2 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium">
              <div className="col-span-3">Student</div>
              <div className="col-span-2">Grade</div>
              <div className="col-span-5">Feedback Preview</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
          </div>
          
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {grades.map((student, index) => (
              <div 
                key={index} 
                className={`grid grid-cols-12 gap-4 px-4 py-3 text-sm hover:bg-muted/50 ${
                  student.edited ? 'bg-green-50 dark:bg-green-950/20' : ''
                }`}
              >
                <div className="col-span-3 flex flex-col">
                  <span className="font-medium">{student.fullName}</span>
                  <span className="text-xs text-muted-foreground">{student.email}</span>
                </div>
                <div className="col-span-2 font-medium">
                  {student.grade}/100
                </div>
                <div className="col-span-5">
                  <p className="line-clamp-2 text-muted-foreground">
                    {student.feedback}
                  </p>
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  {student.edited ? (
                    <span className="flex items-center text-green-600 dark:text-green-500">
                      <Check className="h-4 w-4 mr-1" />
                      Approved
                    </span>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openStudentPreview(index)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedStudent !== null && (
          <Dialog open={selectedStudent !== null} onOpenChange={closeStudentPreview}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex justify-between items-center">
                  <span>
                    Student: {grades[selectedStudent]?.fullName}
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
                  File: {grades[selectedStudent]?.file?.name}
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
                            {grades[selectedStudent]?.grade}/100
                          </span>
                        </div>
                        <Separator />
                        <div className="prose max-w-none dark:prose-invert">
                          <h4>Feedback Comments:</h4>
                          <p className="whitespace-pre-line">
                            {grades[selectedStudent]?.feedback}
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
                      onUpdateGrade(
                        selectedStudent, 
                        grades[selectedStudent].grade, 
                        grades[selectedStudent].feedback
                      );
                      closeStudentPreview();
                    }}
                  >
                    Approve Feedback
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default GradingPreview;
