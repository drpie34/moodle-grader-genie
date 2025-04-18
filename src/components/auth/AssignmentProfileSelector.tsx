import React, { useState, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useDemoAuth } from '@/hooks/auth/use-demo-auth';

// Simple localStorage-based profile management for demo mode
function useLocalProfiles() {
  const { isLoggedIn, user } = useDemoAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load profiles on mount
  useEffect(() => {
    if (isLoggedIn) {
      try {
        const storedProfiles = localStorage.getItem('demo_profiles');
        if (storedProfiles) {
          const parsed = JSON.parse(storedProfiles);
          setProfiles(parsed);
        }
      } catch (e) {
        console.error("Error loading profiles:", e);
      }
    }
    setIsLoading(false);
  }, [isLoggedIn]);
  
  // Save a new profile
  const saveProfile = async (name: string, data: any) => {
    if (!isLoggedIn) {
      toast.error('Please log in to save profiles');
      return { success: false };
    }
    
    try {
      const now = new Date().toISOString();
      const newProfile = {
        id: 'profile-' + Date.now(),
        user_id: 'demo-user',
        name,
        created_at: now,
        updated_at: now,
        assignment_details: data,
        last_used: now
      };
      
      // Get existing profiles
      const existing = [...profiles];
      
      // Add new profile
      existing.push(newProfile);
      
      // Save to localStorage
      localStorage.setItem('demo_profiles', JSON.stringify(existing));
      
      // Update state
      setProfiles(existing);
      
      toast.success('Profile saved');
      return { success: true, id: newProfile.id };
    } catch (e) {
      console.error("Error saving profile:", e);
      toast.error('Failed to save profile');
      return { success: false };
    }
  };
  
  // Delete a profile
  const deleteProfile = async (id: string) => {
    if (!isLoggedIn) return false;
    
    try {
      const filtered = profiles.filter(p => p.id !== id);
      localStorage.setItem('demo_profiles', JSON.stringify(filtered));
      setProfiles(filtered);
      return true;
    } catch (e) {
      console.error("Error deleting profile:", e);
      return false;
    }
  };
  
  // Update a profile
  const updateProfile = async (id: string, updates: any) => {
    if (!isLoggedIn) return false;
    
    try {
      const index = profiles.findIndex(p => p.id === id);
      if (index === -1) return false;
      
      const updated = [...profiles];
      updated[index] = {
        ...updated[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('demo_profiles', JSON.stringify(updated));
      setProfiles(updated);
      return true;
    } catch (e) {
      console.error("Error updating profile:", e);
      return false;
    }
  };
  
  // Update last used timestamp
  const updateLastUsed = async (id: string) => {
    if (!isLoggedIn) return;
    
    try {
      const index = profiles.findIndex(p => p.id === id);
      if (index === -1) return;
      
      const updated = [...profiles];
      updated[index] = {
        ...updated[index],
        last_used: new Date().toISOString()
      };
      
      localStorage.setItem('demo_profiles', JSON.stringify(updated));
      setProfiles(updated);
    } catch (e) {
      console.error("Error updating last used:", e);
    }
  };
  
  return {
    profiles,
    isLoading,
    saveProfile,
    deleteProfile,
    updateProfile,
    updateLastUsed
  };
}

interface AssignmentProfileSelectorProps {
  onSelectProfile: (profileData: any) => void;
  currentAssignmentData: any;
}

const AssignmentProfileSelector: React.FC<AssignmentProfileSelectorProps> = ({ 
  onSelectProfile,
  currentAssignmentData,
}) => {
  const { isLoggedIn } = useDemoAuth();
  const { profiles, isLoading, saveProfile, updateProfile, updateLastUsed } = useLocalProfiles();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfileId(profileId);
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile) {
      onSelectProfile(profile.assignment_details);
      updateLastUsed(profileId);
      toast.success(`Loaded profile: ${profile.name}`);
    }
  };

  const handleSaveProfile = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent event bubbling
    
    if (!profileName.trim()) {
      toast.error('Please enter a name for the profile');
      return;
    }

    // Make a safe copy of the assignment data without any functions or circular references
    try {
      const safeAssignmentData = JSON.parse(JSON.stringify(currentAssignmentData));
      
      saveProfile(profileName, safeAssignmentData)
        .then(result => {
          if (result.success) {
            setSaveDialogOpen(false);
            setProfileName('');
            setSelectedProfileId(result.id || '');
          }
        });
    } catch (error) {
      console.error("Error preparing assignment data:", error);
      toast.error("Failed to prepare profile data");
    }
  };

  const handleUpdateProfile = () => {
    if (!selectedProfileId) {
      toast.error('No profile selected');
      return;
    }

    try {
      const safeData = JSON.parse(JSON.stringify(currentAssignmentData));
      
      updateProfile(selectedProfileId, { 
        assignment_details: safeData 
      }).then(success => {
        if (success) {
          toast.success('Profile updated successfully');
        }
      });
    } catch (error) {
      console.error("Error preparing assignment data:", error);
      toast.error("Failed to prepare profile data");
    }
  };

  // If not logged in, show login prompt
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50 profile-selector-container">
        <p className="text-sm text-muted-foreground">
          Log in to save and reuse assignment profiles
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href="/login">Log in</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 profile-selector-container">
      <div className="flex items-center justify-between">
        <Label>Assignment Profiles</Label>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSaveDialogOpen(true)}
          >
            Save New
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUpdateProfile}
            disabled={!selectedProfileId}
          >
            Update Current
          </Button>
        </div>
      </div>
      
      <Select 
        value={selectedProfileId} 
        onValueChange={handleProfileSelect}
        disabled={isLoading || profiles.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder={
            isLoading ? "Loading profiles..." : 
            profiles.length === 0 ? "No saved profiles" : 
            "Select a profile"
          } />
        </SelectTrigger>
        <SelectContent>
          {profiles.map(profile => (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Save Profile Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Assignment Profile</DialogTitle>
            <DialogDescription>
              Enter a name for your assignment profile to reuse it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="profileName">Profile Name</Label>
            <Input 
              id="profileName" 
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Enter a descriptive name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveProfile}>
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignmentProfileSelector;