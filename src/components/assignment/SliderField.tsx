
import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  getDisplayText: (value: number) => string;
}

const SliderField: React.FC<SliderFieldProps> = ({
  id,
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  getDisplayText
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          <span className="text-sm text-muted-foreground">
            {getDisplayText(value)}
          </span>
        </div>
        <Slider
          id={id}
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          className="py-4"
        />
      </div>
    </div>
  );
};

export default SliderField;
