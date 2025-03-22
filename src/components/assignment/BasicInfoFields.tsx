
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssignmentFormData } from "./AssignmentFormTypes";

interface BasicInfoFieldsProps {
  formData: AssignmentFormData;
  handleChange: (field: keyof AssignmentFormData, value: string | number) => void;
}

const BasicInfoFields: React.FC<BasicInfoFieldsProps> = ({ formData, handleChange }) => {
  return (
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
  );
};

export default BasicInfoFields;
