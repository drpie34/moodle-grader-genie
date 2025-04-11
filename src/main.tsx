import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add fetch tracking that will survive minification
try {
  // Create global properties that won't be stripped out
  window.__APP_DEBUG = {
    startTime: new Date().toISOString(),
    environment: {
      hostname: window.location.hostname,
      href: window.location.href
    },
    apiCalls: []
  };
  
  // Add fetch tracking
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    // Track all API calls
    const urlString = url?.toString?.() || "unknown";
    window.__APP_DEBUG.apiCalls.push({
      url: urlString,
      time: new Date().toISOString()
    });
    
    // Special handling for OpenAI direct calls
    if (urlString.includes('api.openai.com')) {
      console.error('⚠️ DIRECT OPENAI CALL DETECTED ⚠️', { url: urlString });
      
      // Force all requests to go through our edge function if they're trying to call OpenAI directly
      if (urlString.includes('/v1/chat/completions')) {
        console.warn('Redirecting direct OpenAI call to Edge Function');
        // Redirect to edge function (uncomment if needed)
        // url = "https://owaqnztggyxahjhbcylj.supabase.co/functions/v1/openai-proxy";
      }
    }
    
    // Call original fetch
    return originalFetch.apply(this, arguments);
  };
  
  console.log('🔍 API call tracking enabled');
} catch (e) {
  console.error('Failed to setup API call tracking', e);
}

// Add app version info
window.__APP_VERSION = {
  buildDate: new Date().toISOString(),
  commit: '94097ae',
  env: import.meta.env.MODE
};

createRoot(document.getElementById("root")!).render(<App />);
