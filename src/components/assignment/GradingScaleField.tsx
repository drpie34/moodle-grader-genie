
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface GradingScaleFieldProps {
  value: number;
  onChange: (value: number) => void;
}

const GradingScaleField: React.FC<GradingScaleFieldProps> = ({ value, onChange }) => {
  return (
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
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-24 transition-all duration-200"
        />
        <span className="text-sm text-muted-foreground">points total</span>
      </div>
    </div>
  );
};

export default GradingScaleField;
