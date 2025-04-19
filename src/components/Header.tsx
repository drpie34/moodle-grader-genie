import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import DemoAccountInfo from "./auth/DemoAccountInfo";
import { Link } from "react-router-dom";
import { HelpCircle, MessageSquare, ChevronLeft } from "lucide-react";
import LogoComponent from "./LogoComponent";

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Gradient line at top of header */}
      <div className="h-1 w-full bg-gradient-to-r from-primary to-secondary"></div>
      
      {/* Main header content with glass effect */}
      <div className="bg-background/80 backdrop-blur-lg shadow-sm">
        <div className="container flex h-[var(--header-height)] items-center justify-between py-4">
          <div className="flex items-center space-x-4">
            <LogoComponent logoSize="large" textSize="large" />
            
            {/* App navigation breadcrumb - optional */}
            <div className="hidden md:flex items-center text-sm text-muted-foreground">
              <Link to="/" className="text-foreground hover:text-primary transition-colors">
                <ChevronLeft className="h-4 w-4 inline-block mr-1" />
                Home
              </Link>
              <span className="mx-2">/</span>
              <span>Grading Assistant</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden sm:flex items-center text-muted-foreground hover:text-foreground gap-1.5"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden sm:flex items-center text-muted-foreground hover:text-foreground gap-1.5"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Feedback</span>
            </Button>
            
            {/* Gradient button style for important actions */}
            <Button 
              className="premium-button hidden sm:flex"
              size="sm"
            >
              Upgrade
            </Button>
            
            <DemoAccountInfo />
          </div>
        </div>
      </div>
      
      {/* Subtle separator with shadow */}
      <div className="h-px bg-border/50 shadow-sm"></div>
    </header>
  );
};

export default Header;