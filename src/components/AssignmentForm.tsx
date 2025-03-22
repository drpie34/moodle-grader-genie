import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CircleHelp, Upload, FileText, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { extractTextFromFile } from "@/utils/fileUtils";

interface AssignmentFormProps {
  onSubmit: (formData: AssignmentFormData) => void;
}

export interface AssignmentFormData {
  assignmentName: string;
  courseName: string;
  assignmentInstructions: string;
  rubric: string;
  academicLevel: string;
  gradingScale: number;
  gradingStrictness: number;
  gradingMode: string;
  feedbackLength: number;
  feedbackFormality: number;
  instructorTone: string;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<AssignmentFormData>({
    assignmentName: "",
    courseName: "",
    assignmentInstructions: "",
    rubric: "",
    academicLevel: "undergraduate",
    gradingScale: 100,
    gradingStrictness: 5,
    gradingMode: "full",
    feedbackLength: 5,
    feedbackFormality: 5,
    instructorTone: ""
  });

  const [instructionsFile, setInstructionsFile] = useState<File | null>(null);
  const [rubricFile, setRubricFile] = useState<File | null>(null);

  const handleChange = (field: keyof AssignmentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    fileType: 'instructions' | 'rubric'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (!['pdf', 'docx', 'doc', 'txt'].includes(fileExt || '')) {
      alert('Please upload a PDF, DOCX, DOC, or TXT file');
      return;
    }

    try {
      const extractedText = await extractTextFromFile(file);
      
      if (fileType === 'instructions') {
        setInstructionsFile(file);
        handleChange('assignmentInstructions', extractedText);
      } else {
        setRubricFile(file);
        handleChange('rubric', extractedText);
      }
    } catch (error) {
      console.error(`Error extracting text from ${fileType} file:`, error);
      alert(`Error extracting text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const removeFile = (fileType: 'instructions' | 'rubric') => {
    if (fileType === 'instructions') {
      setInstructionsFile(null);
    } else {
      setRubricFile(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">Assignment Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assignmentName" className="text-sm font-medium">
                Assignment Name
              </Label>
              <Input
                id="assignmentName"
                placeholder="Final Essay, Project Submission, etc."
                value={formData.assignmentName}
                onChange={(e) => handleChange("assignmentName", e.target.value)}
                required
                className="transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="courseName" className="text-sm font-medium">
                Course Name
              </Label>
              <Input
                id="courseName"
                placeholder="Introduction to Computer Science, English 101, etc."
                value={formData.courseName}
                onChange={(e) => handleChange("courseName", e.target.value)}
                required
                className="transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="assignmentInstructions" className="text-sm font-medium">
                  Assignment Instructions
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleHelp className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Paste the instructions that were given to students for this assignment or upload a file.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="flex items-center">
                <input
                  type="file"
                  id="instructionsFile"
                  onChange={(e) => handleFileChange(e, 'instructions')}
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                />
                <label htmlFor="instructionsFile" className="inline-flex items-center rounded-md border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer">
                  <Upload className="h-3 w-3 mr-1" />
                  Upload File
                </label>
              </div>
            </div>
            
            {instructionsFile && (
              <div className="flex items-center justify-between rounded border p-2 mb-2 bg-muted/20">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[150px] md:max-w-xs">{instructionsFile.name}</span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeFile('instructions')}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <Textarea
              id="assignmentInstructions"
              placeholder="Enter or paste the full assignment instructions here..."
              value={formData.assignmentInstructions}
              onChange={(e) => handleChange("assignmentInstructions", e.target.value)}
              required
              className="min-h-32 resize-y transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="rubric" className="text-sm font-medium">
                  Grading Rubric (Optional)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleHelp className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Paste your grading rubric or criteria, or upload a rubric file.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="flex items-center">
                <input
                  type="file"
                  id="rubricFile"
                  onChange={(e) => handleFileChange(e, 'rubric')}
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                />
                <label htmlFor="rubricFile" className="inline-flex items-center rounded-md border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer">
                  <Upload className="h-3 w-3 mr-1" />
                  Upload File
                </label>
              </div>
            </div>
            
            {rubricFile && (
              <div className="flex items-center justify-between rounded border p-2 mb-2 bg-muted/20">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[150px] md:max-w-xs">{rubricFile.name}</span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeFile('rubric')}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <Textarea
              id="rubric"
              placeholder="Enter or paste your grading rubric here..."
              value={formData.rubric}
              onChange={(e) => handleChange("rubric", e.target.value)}
              className="min-h-32 resize-y transition-all duration-200"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="academicLevel" className="text-sm font-medium">
                Academic Level
              </Label>
              <Select
                value={formData.academicLevel}
                onValueChange={(value) => handleChange("academicLevel", value)}
              >
                <SelectTrigger id="academicLevel" className="w-full">
                  <SelectValue placeholder="Select academic level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elementary">Elementary School</SelectItem>
                  <SelectItem value="middle">Middle School</SelectItem>
                  <SelectItem value="high">High School</SelectItem>
                  <SelectItem value="undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradingScale" className="text-sm font-medium">
                Grading Scale
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="gradingScale"
                  type="number"
                  min={1}
                  max={1000}
                  value={formData.gradingScale}
                  onChange={(e) => handleChange("gradingScale", parseInt(e.target.value))}
                  className="w-24 transition-all duration-200"
                />
                <span className="text-sm text-muted-foreground">points total</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gradingStrictness" className="text-sm font-medium">
                    Grading Strictness
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.gradingStrictness <= 3 ? "Lenient" : 
                    formData.gradingStrictness <= 7 ? "Moderate" : "Strict"}
                  </span>
                </div>
                <Slider
                  id="gradingStrictness"
                  min={1}
                  max={10}
                  step={1}
                  value={[formData.gradingStrictness]}
                  onValueChange={(values) => handleChange("gradingStrictness", values[0])}
                  className="py-4"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="feedbackLength" className="text-sm font-medium">
                    Feedback Length
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.feedbackLength <= 3 ? "Concise" : 
                    formData.feedbackLength <= 7 ? "Moderate" : "Detailed"}
                  </span>
                </div>
                <Slider
                  id="feedbackLength"
                  min={1}
                  max={10}
                  step={1}
                  value={[formData.feedbackLength]}
                  onValueChange={(values) => handleChange("feedbackLength", values[0])}
                  className="py-4"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="feedbackFormality" className="text-sm font-medium">
                    Feedback Formality
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.feedbackFormality <= 3 ? "Casual" : 
                    formData.feedbackFormality <= 7 ? "Moderate" : "Formal"}
                  </span>
                </div>
                <Slider
                  id="feedbackFormality"
                  min={1}
                  max={10}
                  step={1}
                  value={[formData.feedbackFormality]}
                  onValueChange={(values) => handleChange("feedbackFormality", values[0])}
                  className="py-4"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gradeMode" className="text-sm font-medium">
                Grading Mode
              </Label>
              <Tabs 
                defaultValue="full" 
                value={formData.gradingMode}
                onValueChange={(value) => handleChange("gradingMode", value)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="full" className="text-sm">Full AI Grading</TabsTrigger>
                  <TabsTrigger value="suggestions" className="text-sm">Suggestions Only</TabsTrigger>
                </TabsList>
                <TabsContent value="full" className="mt-2 text-sm text-muted-foreground">
                  <p>AI will analyze submissions and provide complete grades with feedback, which you can review and adjust before finalizing.</p>
                </TabsContent>
                <TabsContent value="suggestions" className="mt-2 text-sm text-muted-foreground">
                  <p>AI will provide analysis and highlights of important aspects of submissions, without assigning grades. You'll grade manually with AI assistance.</p>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="instructorTone" className="text-sm font-medium">
                Instructor Tone Example (Optional)
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CircleHelp className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Paste an example of your typical feedback style to help the AI match your tone.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="instructorTone"
              placeholder="Paste an example of your typical feedback to students (e.g., 'Good work on the introduction, but your thesis statement needs more clarity...')"
              value={formData.instructorTone}
              onChange={(e) => handleChange("instructorTone", e.target.value)}
              className="min-h-20 resize-y transition-all duration-200"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full transition-all duration-300 hover:shadow-md"
          >
            Continue to Processing
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AssignmentForm;
