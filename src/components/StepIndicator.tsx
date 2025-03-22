
import React from "react";
import { Check, Upload, Pencil, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  steps: {
    id: number;
    title: string;
    icon: React.ReactNode;
  }[];
  onStepClick?: (step: number) => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ 
  currentStep, 
  steps,
  onStepClick
}) => {
  return (
    <div className="mx-auto mb-8 w-full max-w-3xl">
      <div className="flex w-full items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div 
              className={cn(
                "flex flex-col items-center transition-all duration-300",
                onStepClick && step.id < currentStep ? "cursor-pointer" : ""
              )}
              onClick={() => onStepClick && step.id < currentStep ? onStepClick(step.id) : null}
            >
              <div 
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  step.id === currentStep 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : step.id < currentStep 
                      ? "border-primary/80 bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {step.id < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              <span 
                className={cn(
                  "mt-2 text-center text-sm font-medium transition-all duration-300", 
                  step.id === currentStep 
                    ? "text-foreground" 
                    : step.id < currentStep 
                      ? "text-muted-foreground" 
                      : "text-muted-foreground/50"
                )}
              >
                {step.title}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "h-0.5 w-full max-w-[100px] transition-all duration-500",
                  step.id < currentStep 
                    ? "bg-primary/80" 
                    : "bg-muted-foreground/20"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StepIndicator;
