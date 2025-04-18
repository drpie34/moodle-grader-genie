import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

const AuthDialog: React.FC<AuthDialogProps> = ({ 
  isOpen, 
  onClose,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  const handleSuccess = () => {
    onClose();
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {mode === 'login' ? (
          <LoginForm onSuccess={handleSuccess} onToggleMode={toggleMode} />
        ) : (
          <SignupForm onSuccess={handleSuccess} onToggleMode={toggleMode} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;