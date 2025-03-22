
import React from "react";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GradingModeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const GradingModeSelector: React.FC<GradingModeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="gradeMode" className="text-sm font-medium">
        Grading Mode
      </Label>
      <Tabs 
        defaultValue={value} 
        value={value}
        onValueChange={onChange}
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
  );
};

export default GradingModeSelector;
