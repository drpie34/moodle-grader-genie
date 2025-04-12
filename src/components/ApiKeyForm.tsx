
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud } from "lucide-react";
import { toast } from "sonner";

interface ApiKeyFormProps {
  onApiKeySubmit: (apiKey: string) => void;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onApiKeySubmit }) => {
  // Always use server key - no need to ask the user
  React.useEffect(() => {
    // Set up server API key usage automatically
    localStorage.removeItem("openai_api_key");
    localStorage.setItem("use_server_api_key", "true");
    // Submit immediately without user action required
    onApiKeySubmit("");
  }, [onApiKeySubmit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApiKeySubmit("");
  };

  // Instead of showing the form, we'll return null since we auto-submit
  return null;
};

export default ApiKeyForm;
