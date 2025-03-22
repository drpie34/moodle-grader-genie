
import { useState, useEffect } from "react";

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      setShowApiKeyForm(true);
    }
  }, []);

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setShowApiKeyForm(false);
    
    // Return true to indicate the API key was updated
    return true;
  };

  return {
    apiKey,
    showApiKeyForm,
    setShowApiKeyForm,
    handleApiKeySubmit
  };
}
