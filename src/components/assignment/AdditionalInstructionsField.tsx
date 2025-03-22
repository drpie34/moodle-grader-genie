
import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdditionalInstructionsFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const AdditionalInstructionsField: React.FC<AdditionalInstructionsFieldProps> = ({
  value,
  onChange
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Label htmlFor="additionalInstructions" className="text-sm font-medium">
          Additional AI Grading Instructions (Optional)
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleHelp className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Any additional instructions or considerations for the AI grader that aren't covered in the rubric or instructions.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Textarea
        id="additionalInstructions"
        placeholder="Enter any additional information the AI should consider when grading (e.g., 'Be more lenient on citation formatting', 'Focus on argument strength rather than grammar', etc.)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-20 resize-y transition-all duration-200"
      />
    </div>
  );
};

export default AdditionalInstructionsField;
