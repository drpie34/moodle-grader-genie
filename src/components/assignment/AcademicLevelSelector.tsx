
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AcademicLevelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const AcademicLevelSelector: React.FC<AcademicLevelSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="academicLevel" className="text-sm font-medium">
        Academic Level
      </Label>
      <Select
        value={value}
        onValueChange={onChange}
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
  );
};

export default AcademicLevelSelector;
