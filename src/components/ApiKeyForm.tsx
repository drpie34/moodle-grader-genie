
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Cloud } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ApiKeyFormProps {
  onApiKeySubmit: (apiKey: string) => void;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onApiKeySubmit }) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [useServerKey, setUseServerKey] = useState<boolean>(true);
  
  // Check if API key is already saved in localStorage
  React.useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setUseServerKey(false);
    } else {
      const useServerKeySetting = localStorage.getItem("use_server_api_key");
      setUseServerKey(useServerKeySetting !== "false");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useServerKey) {
      // Use server API key
      localStorage.removeItem("openai_api_key");
      localStorage.setItem("use_server_api_key", "true");
      onApiKeySubmit("");
      toast.success("Using server API key");
      return;
    }
    
    if (!apiKey.trim()) {
      toast.error("Please enter an OpenAI API key");
      return;
    }
    
    // Save API key to localStorage for convenience
    localStorage.setItem("openai_api_key", apiKey);
    localStorage.setItem("use_server_api_key", "false");
    
    // Notify parent component
    onApiKeySubmit(apiKey);
    
    toast.success("API key saved");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">OpenAI API Key</CardTitle>
        <CardDescription>
          Configure how to access OpenAI's API for grading
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <Switch 
              id="use-server-key" 
              checked={useServerKey} 
              onCheckedChange={setUseServerKey} 
            />
            <Label htmlFor="use-server-key" className="cursor-pointer">
              <div className="flex items-center">
                <Cloud className="h-4 w-4 mr-2" />
                Use server-provided API key
              </div>
            </Label>
          </div>
          
          {!useServerKey && (
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm font-medium">
                Your OpenAI API Key
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
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Your API key is stored locally in your browser and is never sent to our servers.
                It will be used only for grading assignments via the OpenAI API.
              </p>
            </div>
          )}
          
          {useServerKey && (
            <p className="text-sm text-muted-foreground">
              Using the server's API key for grading. No need to provide your own key.
            </p>
          )}
          
          <Button type="submit" className="w-full">
            {useServerKey ? "Use Server Key" : "Save My API Key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ApiKeyForm;
