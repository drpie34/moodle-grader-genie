
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    instructorTone: "",
    additionalInstructions: ""
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
