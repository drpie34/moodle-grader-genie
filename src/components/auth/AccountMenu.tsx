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
import { UserIcon, LogOutIcon, Settings2Icon } from 'lucide-react';
import { useAuth } from '@/hooks/auth/use-auth';
import { useNavigate } from 'react-router-dom';
import { TIER_LIMITS } from '@/types/auth';

const AccountMenu: React.FC = () => {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const { user, profile } = authState;
  
  if (!user || !profile) {
    return (
      <Button variant="outline" onClick={() => navigate('/login')}>
        Log in
      </Button>
    );
  }

  const handleSignOut = async () => {
    console.log("Initiating sign out from Account Menu");
    try {
      await signOut();
      console.log("Sign out successful");
      // Force navigation to login page after signout
      navigate('/login');
      // Reload the page to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };
  
  // Get first letter of email for avatar
  const getInitial = () => {
    return user.email ? user.email[0].toUpperCase() : 'U';
  };

  // Calculate usage percentage
  const usagePercentage = Math.min(100, Math.round((profile.grades_used / profile.grades_limit) * 100));
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
              {profile.account_tier.charAt(0).toUpperCase() + profile.account_tier.slice(1)} plan
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
                {profile.grades_used} / {profile.grades_limit}
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
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings2Icon className="mr-2 h-4 w-4" />
          <span>Settings</span>
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

export default AccountMenu;