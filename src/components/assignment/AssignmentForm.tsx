
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { AssignmentFormData } from "./AssignmentFormTypes";
import BasicInfoFields from "./BasicInfoFields";
import FileUploadField from "./FileUploadField";
import SliderField from "./SliderField";
import GradingModeSelector from "./GradingModeSelector";
import AcademicLevelSelector from "./AcademicLevelSelector";
import GradingScaleField from "./GradingScaleField";
import InstructorToneField from "./InstructorToneField";
import AdditionalInstructionsField from "./AdditionalInstructionsField";

interface AssignmentFormProps {
  onSubmit: (formData: AssignmentFormData) => void;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({ onSubmit }) => {
  // Try to load saved form data from localStorage first
  const getSavedFormData = (): AssignmentFormData | null => {
    try {
      const savedData = localStorage.getItem('moodle_grader_assignment_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log("Loaded assignment form data from localStorage:", parsedData);
        return parsedData;
      }
    } catch (error) {
      console.error("Error loading saved assignment data:", error);
    }
    return null;
  };

  // Default form state or restored state
  const savedData = getSavedFormData();
  const [formData, setFormData] = useState<AssignmentFormData>(savedData || {
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
    instructorTone: "",
    additionalInstructions: "",
    skipEmptySubmissions: true // Default to skipping empty submissions
  });
  
  // Log form state on render
  console.log("AssignmentForm rendering with data:", {
    isEmpty: !formData.assignmentName && !formData.courseName,
    hasAssignmentName: !!formData.assignmentName,
    hasCourseName: !!formData.courseName,
    assignmentNamePreview: formData.assignmentName?.substring(0, 20)
  });

  const handleChange = (field: keyof AssignmentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <BasicInfoFields 
            formData={formData} 
            handleChange={handleChange}
          />

          <FileUploadField 
            id="assignmentInstructions"
            label="Assignment Instructions"
            tooltip="Paste the instructions that were given to students for this assignment or upload a file."
            value={formData.assignmentInstructions}
            onChange={(value) => handleChange("assignmentInstructions", value)}
            placeholder="Enter or paste the full assignment instructions here..."
            required={true}
          />

          <FileUploadField 
            id="rubric"
            label="Grading Rubric (Optional)"
            tooltip="Paste your grading rubric or criteria, or upload a rubric file."
            value={formData.rubric}
            onChange={(value) => handleChange("rubric", value)}
            placeholder="Enter or paste your grading rubric here..."
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <AcademicLevelSelector 
              value={formData.academicLevel}
              onChange={(value) => handleChange("academicLevel", value)}
            />

            <GradingScaleField 
              value={formData.gradingScale}
              onChange={(value) => handleChange("gradingScale", value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SliderField 
              id="gradingStrictness"
              label="Grading Strictness"
              value={formData.gradingStrictness}
              onChange={(value) => handleChange("gradingStrictness", value)}
              getDisplayText={(value) => 
                value <= 3 ? "Lenient" : value <= 7 ? "Moderate" : "Strict"
              }
            />

            <SliderField 
              id="feedbackLength"
              label="Feedback Length"
              value={formData.feedbackLength}
              onChange={(value) => handleChange("feedbackLength", value)}
              getDisplayText={(value) => 
                value <= 3 ? "Concise" : value <= 7 ? "Moderate" : "Detailed"
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SliderField 
              id="feedbackFormality"
              label="Feedback Formality"
              value={formData.feedbackFormality}
              onChange={(value) => handleChange("feedbackFormality", value)}
              getDisplayText={(value) => 
                value <= 3 ? "Casual" : value <= 7 ? "Moderate" : "Formal"
              }
            />
            
            <GradingModeSelector 
              value={formData.gradingMode}
              onChange={(value) => handleChange("gradingMode", value)}
            />
          </div>

          <InstructorToneField 
            value={formData.instructorTone}
            onChange={(value) => handleChange("instructorTone", value)}
          />
          
          <AdditionalInstructionsField
            value={formData.additionalInstructions}
            onChange={(value) => handleChange("additionalInstructions", value)}
          />
          
          <div className="flex items-center space-x-2 pt-2">
            <Switch 
              id="skipEmptySubmissions" 
              checked={formData.skipEmptySubmissions} 
              onCheckedChange={(checked) => handleChange("skipEmptySubmissions", checked)}
            />
            <Label htmlFor="skipEmptySubmissions" className="text-sm font-medium cursor-pointer">
              Leave grades blank for students without submissions
            </Label>
          </div>
          <div className="text-xs text-muted-foreground ml-8 -mt-2">
            When enabled, students with no submission will not receive a grade or feedback
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
