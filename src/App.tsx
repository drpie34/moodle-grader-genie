
import { useState, useEffect } from "react";
import { ParallaxProvider } from 'react-scroll-parallax';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import LandingPage from "./pages/LandingPage";
import DebugMenu from "./components/DebugMenu";
// Using our simplified demo auth 
// import { AuthProvider } from "@/hooks/auth/use-auth";

const queryClient = new QueryClient();

const App = () => {
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  
  useEffect(() => {
    // Set default values for debug settings if not already set
    if (localStorage.getItem("use_server_api_key") === null) {
      localStorage.setItem("use_server_api_key", "true");
    }
    if (localStorage.getItem("show_api_prompt_button") === null) {
      localStorage.setItem("show_api_prompt_button", "false");
    }
    if (localStorage.getItem("enable_file_debug") === null) {
      localStorage.setItem("enable_file_debug", "false");
    }
    
    // Add keyboard shortcut for debug menu (Ctrl+Shift+D)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Special debug menu keyboard shortcut (Ctrl+Shift+D)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDebugMenu(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <ParallaxProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/app" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          {/* Debug menu - accessible with Ctrl+Shift+D */}
          <DebugMenu open={showDebugMenu} onClose={() => setShowDebugMenu(false)} />
        </TooltipProvider>
      </QueryClientProvider>
    </ParallaxProvider>
  );
};

export default App;
