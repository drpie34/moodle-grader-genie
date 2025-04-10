
import { useState, useEffect } from "react";

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [useServerKey, setUseServerKey] = useState(true);

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    const useServerKeySetting = localStorage.getItem("use_server_api_key");
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setUseServerKey(false);
      setShowApiKeyForm(false);
    } else if (useServerKeySetting === "false") {
      // User explicitly chose not to use the server key, but no key is saved
      setUseServerKey(false);
      setShowApiKeyForm(true);
    } else {
      // Default to using server key
      setUseServerKey(true);
      setShowApiKeyForm(false);
    }
  }, []);

  const handleApiKeySubmit = (key: string) => {
    if (key === "") {
      // User chose to use server key
      setApiKey("");
      setUseServerKey(true);
      localStorage.removeItem("openai_api_key");
      localStorage.setItem("use_server_api_key", "true");
    } else {
      // User provided their own key
      setApiKey(key);
      setUseServerKey(false);
      localStorage.setItem("openai_api_key", key);
      localStorage.setItem("use_server_api_key", "false");
    }
    
    setShowApiKeyForm(false);
    
    // Return true to indicate the API key was updated
    return true;
  };

  return {
    apiKey,
    useServerKey,
    showApiKeyForm,
    setShowApiKeyForm,
    handleApiKeySubmit
  };
}
