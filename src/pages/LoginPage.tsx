import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import SimplifiedLoginForm from '@/components/auth/SimplifiedLoginForm';
import SimplifiedSignupForm from '@/components/auth/SimplifiedSignupForm';
import { Button } from '@/components/ui/button';
import { useDemoAuth } from '@/hooks/auth/use-demo-auth';

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { isLoggedIn, isLoading } = useDemoAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      navigate('/');
    }
  }, [isLoading, isLoggedIn, navigate]);

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  const handleSuccess = () => {
    navigate('/');
  };

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
          <div className="w-full max-w-md mb-8">
            <div className="flex justify-center mb-6">
              <Button 
                variant={mode === 'login' ? 'default' : 'outline'}
                className="rounded-r-none"
                onClick={() => setMode('login')}
              >
                Log in
              </Button>
              <Button 
                variant={mode === 'signup' ? 'default' : 'outline'}
                className="rounded-l-none"
                onClick={() => setMode('signup')}
              >
                Sign up
              </Button>
            </div>
            
            {mode === 'login' ? (
              <SimplifiedLoginForm onSuccess={handleSuccess} onToggleMode={toggleMode} />
            ) : (
              <SimplifiedSignupForm onSuccess={handleSuccess} onToggleMode={toggleMode} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;