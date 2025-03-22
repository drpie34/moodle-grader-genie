
import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold">Moodle Grader Genie</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">Help</Button>
          <Button size="sm" className="hidden sm:flex">Feedback</Button>
        </div>
      </div>
      <Separator />
    </header>
  );
};

export default Header;
