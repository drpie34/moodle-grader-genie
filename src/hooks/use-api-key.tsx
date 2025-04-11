
import { useState, useEffect } from "react";

export function useApiKey() {
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);

  // Always use server key, clean up any old settings
  useEffect(() => {
    // Remove any saved API key
    localStorage.removeItem("openai_api_key");
    // Always use server key
    localStorage.setItem("use_server_api_key", "true");
  }, []);

  const handleApiKeySubmit = () => {
    // Always use server key
    localStorage.removeItem("openai_api_key");
    localStorage.setItem("use_server_api_key", "true");
    
    setShowApiKeyForm(false);
    
    // Return true to indicate success
    return true;
  };

  return {
    // Always return server as key
    apiKey: "server",
    useServerKey: true,
    showApiKeyForm,
    setShowApiKeyForm,
    handleApiKeySubmit
  };
}
