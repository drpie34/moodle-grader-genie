
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="container mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <h1 className="mb-4 text-9xl font-bold text-primary/20">404</h1>
        <h2 className="mb-4 text-3xl font-medium">Page Not Found</h2>
        <p className="mb-8 text-muted-foreground">
          We couldn't find the page you were looking for. It might have been removed, renamed, or didn't exist in the first place.
        </p>
        <Button 
          onClick={() => navigate("/")}
          className="transition-all duration-300 hover:shadow-md"
        >
          Return Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
