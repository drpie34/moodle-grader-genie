
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";

interface ApiKeyFormProps {
  onApiKeySubmit: (apiKey: string) => void;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onApiKeySubmit }) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  
  // Check if API key is already saved in localStorage
  React.useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast.error("Please enter an OpenAI API key");
      return;
    }
    
    // Save API key to localStorage for convenience
    localStorage.setItem("openai_api_key", apiKey);
    
    // Notify parent component
    onApiKeySubmit(apiKey);
    
    toast.success("API key saved");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">OpenAI API Key</CardTitle>
        <CardDescription>
          Enter your OpenAI API key to enable grading functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm font-medium">
              OpenAI API Key
            </Label>
            <div className="flex">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type={showApiKey ? "text" : "password"}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                >
                  <Lock className="h-4 w-4" />
                </button>
              </div>
              <Button type="submit" className="ml-2">
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Your API key is stored locally in your browser and is never sent to our servers.
              It will be used only for grading assignments via the OpenAI API.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ApiKeyForm;
