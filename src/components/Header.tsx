import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import DemoAccountInfo from "./auth/DemoAccountInfo";
import { Link } from "react-router-dom";

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
      <div className="container flex h-20 items-center justify-between py-4">
        <div className="flex items-center">
          <Link to="/">
            <img 
              src="/MoodleGraderLogo.png" 
              alt="Moodle Grader Logo" 
              className="h-16 w-auto"
            />
          </Link>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="hidden sm:flex">Help</Button>
          <Button size="sm" className="hidden sm:flex">Feedback</Button>
          <DemoAccountInfo />
        </div>
      </div>
      <Separator />
    </header>
  );
};

export default Header;