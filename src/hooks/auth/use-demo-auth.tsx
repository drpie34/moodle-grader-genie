import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Simple demo auth hook that only uses localStorage
export function useDemoAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Check if user is logged in on initial load
  useEffect(() => {
    const demoUser = localStorage.getItem('demo_user');
    if (demoUser) {
      try {
        setUser(JSON.parse(demoUser));
        setIsLoggedIn(true);
      } catch (e) {
        console.error("Error parsing demo user data:", e);
      }
    }
    setIsLoading(false);
  }, []);
  
  const login = (email: string, password: string): Promise<{ success: boolean, error?: string }> => {
    return new Promise((resolve) => {
      // Only allow demo account
      if (email === 'demo@example.com' && password === 'password') {
        const userData = {
          email,
          account_tier: 'basic',
          grades_used: 25,
          grades_limit: 500,
          lastLogin: new Date().toISOString()
        };
        
        // Save to localStorage
        localStorage.setItem('demo_user', JSON.stringify(userData));
        
        // Update state
        setUser(userData);
        setIsLoggedIn(true);
        
        resolve({ success: true });
      } else {
        resolve({ 
          success: false, 
          error: 'Invalid credentials. Use demo@example.com / password'
        });
      }
    });
  };
  
  const logout = (): Promise<void> => {
    return new Promise((resolve) => {
      // Clear localStorage
      localStorage.removeItem('demo_user');
      localStorage.removeItem('demo_profiles');
      
      // Reset state
      setUser(null);
      setIsLoggedIn(false);
      
      resolve();
    });
  };
  
  return {
    isLoggedIn,
    isLoading,
    user,
    login,
    logout
  };
}