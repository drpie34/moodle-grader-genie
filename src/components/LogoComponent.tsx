import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  showText?: boolean;
  textSize?: "small" | "medium" | "large";
  logoSize?: "small" | "medium" | "large";
  className?: string;
  linkTo?: string;
  variant?: "gradient" | "white" | "dark";
}

const LogoComponent: React.FC<LogoProps> = ({
  showText = true,
  textSize = "medium",
  logoSize = "medium",
  className,
  linkTo = "/",
  variant = "gradient"
}) => {
  // Size mappings for logo image
  const logoSizeClasses = {
    small: "h-8 w-auto",
    medium: "h-10 w-auto",
    large: "h-12 w-auto"
  };
  
  // Size mappings for text
  const textSizeClasses = {
    small: "text-lg",
    medium: "text-xl",
    large: "text-2xl"
  };
  
  // Text style based on variant
  const getTextStyle = () => {
    switch (variant) {
      case "gradient":
        return "bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary";
      case "white":
        return "text-white";
      case "dark":
        return "text-gray-900";
      default:
        return "bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary";
    }
  };
  
  // The actual component to render
  const LogoContent = () => (
    <div className={cn("flex items-center -space-x-1", className)}>
      <div className="relative flex items-center -translate-y-[5px]">
        <img 
          src="/MoodleGraderLogo.png" 
          alt="MoodleGrader" 
          className={logoSizeClasses[logoSize]}
        />
      </div>
      {showText && (
        <div className={cn(textSizeClasses[textSize])}>
          <span className={cn("font-bold tracking-tight", getTextStyle())}>
            MoodleGrader
          </span>
        </div>
      )}
    </div>
  );
  
  // If a link destination is provided, wrap in Link, otherwise just return content
  return linkTo ? (
    <Link to={linkTo} className="flex items-center transition-opacity hover:opacity-90">
      <LogoContent />
    </Link>
  ) : (
    <LogoContent />
  );
};

export default LogoComponent;