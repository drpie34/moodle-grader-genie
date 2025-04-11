
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud } from "lucide-react";
import { toast } from "sonner";

interface ApiKeyFormProps {
  onApiKeySubmit: (apiKey: string) => void;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onApiKeySubmit }) => {
  // Always use server key
  React.useEffect(() => {
    // Clean up any old key in localStorage
    localStorage.removeItem("openai_api_key");
    localStorage.setItem("use_server_api_key", "true");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use server API key
    localStorage.removeItem("openai_api_key");
    localStorage.setItem("use_server_api_key", "true");
    onApiKeySubmit("");
    toast.success("Using server API key");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">OpenAI API Access</CardTitle>
        <CardDescription>
          Securely using server-side API access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-800">
            <div className="flex items-center mb-2">
              <Cloud className="h-5 w-5 mr-2 text-blue-500" />
              <h3 className="font-semibold">Server-side API Access</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              This application uses a secure server-side API key to access OpenAI's services.
            </p>
            <p className="text-sm text-muted-foreground">
              Your assignments are processed securely through our Supabase Edge Function.
            </p>
          </div>
          
          <Button type="submit" className="w-full">
            Continue with Secure API Access
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ApiKeyForm;
