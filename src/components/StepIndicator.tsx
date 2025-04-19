
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
  highestStepReached?: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ 
  currentStep, 
  steps,
  onStepClick,
  highestStepReached = 1 // Default to 1 if not provided
}) => {
  return (
    <div className="mx-auto mb-12 w-full max-w-3xl">
      <div className="flex w-full items-center justify-between relative py-4">
        {/* Premium background blur panel for step indicator */}
        <div 
          className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-xl -mx-4 -my-1 px-4 py-1 shadow-sm border border-border/50"
          style={{ zIndex: -1 }}
        ></div>
        
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div 
              className={cn(
                "flex flex-col items-center transition-all duration-300 relative",
                onStepClick && step.id <= highestStepReached ? "cursor-pointer hover:scale-105" : "",
                step.id === currentStep ? "z-10" : "z-0"
              )}
              onClick={() => onStepClick && step.id <= highestStepReached ? onStepClick(step.id) : null}
            >
              {/* Glow effect for current step */}
              {step.id === currentStep && (
                <div className="absolute -inset-1 bg-primary/10 rounded-full blur-md"></div>
              )}
              
              <div 
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500 relative",
                  step.id === currentStep 
                    ? "border-primary bg-gradient-to-br from-primary to-secondary text-white shadow-lg" 
                    : step.id < currentStep 
                      ? "border-primary/70 bg-primary/5 text-primary shadow-md" 
                      : "border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {step.id < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.icon
                )}
                
                {/* Subtle animation for the current step */}
                {step.id === currentStep && (
                  <span className="absolute -inset-1 rounded-full border-2 border-primary/30 animate-ping"></span>
                )}
              </div>
              
              <span 
                className={cn(
                  "mt-3 text-center text-sm font-medium transition-all duration-300", 
                  step.id === currentStep 
                    ? "text-foreground font-semibold" 
                    : step.id < currentStep 
                      ? "text-muted-foreground" 
                      : "text-muted-foreground/50"
                )}
              >
                {step.title}
              </span>
              
              {/* Step number badge */}
              <span 
                className={cn(
                  "absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs rounded-full font-semibold",
                  step.id === currentStep 
                    ? "bg-white text-primary ring-2 ring-primary/30" 
                    : step.id < currentStep 
                      ? "bg-primary/20 text-primary" 
                      : "bg-muted text-muted-foreground/70"
                )}
              >
                {step.id}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div className="flex-1 flex flex-col items-center justify-center relative">
                <div 
                  className={cn(
                    "h-0.5 w-full transition-all duration-500 relative",
                    step.id < currentStep 
                      ? "bg-gradient-to-r from-primary to-secondary" 
                      : "bg-muted-foreground/20"
                  )}
                >
                  {/* Animated progress indicator */}
                  {step.id === currentStep - 1 && (
                    <div className="absolute inset-0 h-0.5 bg-primary/80 animate-pulse"></div>
                  )}
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StepIndicator;
