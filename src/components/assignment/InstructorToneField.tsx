
import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InstructorToneFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const InstructorToneField: React.FC<InstructorToneFieldProps> = ({ value, onChange }) => {
  return (
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-20 resize-y transition-all duration-200"
      />
    </div>
  );
};

export default InstructorToneField;
