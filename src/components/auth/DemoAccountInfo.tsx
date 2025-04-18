import React from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserIcon, LogOutIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemoAuth } from '@/hooks/auth/use-demo-auth';
import { toast } from 'sonner';

const DemoAccountInfo: React.FC = () => {
  const { isLoggedIn, user, logout } = useDemoAuth();
  const navigate = useNavigate();
  
  if (!isLoggedIn || !user) {
    return (
      <Button variant="outline" onClick={() => navigate('/login')}>
        Log in
      </Button>
    );
  }

  const handleSignOut = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  // Get first letter of email for avatar
  const getInitial = () => {
    return user.email ? user.email[0].toUpperCase() : 'U';
  };

  // Calculate usage percentage
  const usagePercentage = Math.min(100, Math.round((user.grades_used / user.grades_limit) * 100));
  const isApproachingLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{getInitial()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              {user.account_tier.charAt(0).toUpperCase() + user.account_tier.slice(1)} plan
            </p>
          </div>
        </div>
        
        {/* Usage indicator */}
        <div className="px-2 py-1.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Usage</span>
              <span className={isAtLimit ? 'text-destructive font-medium' : 
                     isApproachingLimit ? 'text-amber-500 font-medium' : ''}>
                {user.grades_used} / {user.grades_limit}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary">
              <div 
                className={`h-full rounded-full ${
                  isAtLimit ? 'bg-destructive' : 
                  isApproachingLimit ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOutIcon className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DemoAccountInfo;