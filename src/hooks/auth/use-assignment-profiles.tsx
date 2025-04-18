import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { AssignmentProfile } from '@/types/auth';
import { toast } from 'sonner';

export const useAssignmentProfiles = () => {
  const { authState } = useAuth();
  const [profiles, setProfiles] = useState<AssignmentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = async () => {
    if (!authState.user) {
      setProfiles([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching profiles for user:", authState.user.id);
      
      // Handle demo user specially
      if (authState.user.id === 'demo-user-id') {
        console.log("Fetching profiles for demo user from localStorage");
        const storedProfiles = localStorage.getItem('demo_profiles');
        if (storedProfiles) {
          try {
            const demoProfiles = JSON.parse(storedProfiles);
            console.log("Demo profiles found:", demoProfiles.length);
            
            // Sort by updated_at date, most recent first
            demoProfiles.sort((a, b) => {
              return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });
            
            setProfiles(demoProfiles);
          } catch (e) {
            console.error("Error parsing stored profiles:", e);
            setProfiles([]);
          }
        } else {
          console.log("No demo profiles found");
          setProfiles([]);
        }
        setIsLoading(false);
        return;
      }
      
      // Normal Supabase flow for non-demo users
      const { data, error } = await supabase
        .from('assignment_profiles')
        .select('*')
        .eq('user_id', authState.user.id)
        .order('updated_at', { ascending: false });
      
      console.log("Profiles fetch result:", { 
        error, 
        count: data?.length,
        data: data?.map(p => ({ id: p.id, name: p.name, size: JSON.stringify(p.assignment_details).length }))
      });

      if (error) {
        setError(error.message);
        toast.error('Failed to load assignment profiles');
      } else {
        setProfiles(data);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Failed to fetch assignment profiles');
      toast.error('Failed to load assignment profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (
    name: string, 
    assignmentDetails: any
  ): Promise<{ success: boolean, id?: string }> => {
    if (!authState.user) {
      toast.error('You must be logged in to save profiles');
      return { success: false };
    }

    try {
      const now = new Date().toISOString();
      const newId = 'profile-' + Date.now();
      
      // Double-check we have a valid user ID
      if (!authState.user || !authState.user.id) {
        console.error("No valid user ID for profile saving");
        return { success: false };
      }
      
      // Log detailed debugging info
      console.log("Saving profile with parameters:", {
        userId: authState.user.id,
        name,
        timestamp: now,
        detailsSize: JSON.stringify(assignmentDetails).length
      });
      
      // Check if this is a demo user - use local storage instead of Supabase
      if (authState.user.id === 'demo-user-id') {
        console.log("Saving profile for demo user");
        
        // Create new profile
        const newProfile = {
          id: newId,
          user_id: authState.user.id,
          name,
          created_at: now,
          updated_at: now,
          assignment_details: assignmentDetails,
          last_used: now
        };
        
        // Get existing profiles
        let demoProfiles = [];
        const storedProfiles = localStorage.getItem('demo_profiles');
        if (storedProfiles) {
          try {
            demoProfiles = JSON.parse(storedProfiles);
          } catch (e) {
            console.error("Error parsing stored profiles:", e);
            demoProfiles = [];
          }
        }
        
        // Add new profile
        demoProfiles.push(newProfile);
        
        // Save to localStorage
        localStorage.setItem('demo_profiles', JSON.stringify(demoProfiles));
        
        // Update state
        setProfiles([newProfile, ...profiles]);
        
        toast.success('Assignment profile saved');
        return { success: true, id: newId };
      }
      
      // Regular Supabase pathway for non-demo users
      const payload = {
        user_id: authState.user.id,
        name,
        created_at: now,
        updated_at: now,
        assignment_details: assignmentDetails,
        last_used: now
      };
      
      const { data, error } = await supabase
        .from('assignment_profiles')
        .insert(payload)
        .select();

      if (error) {
        console.error('Error saving profile:', error);
        toast.error('Failed to save assignment profile');
        return { success: false };
      }

      toast.success('Assignment profile saved');
      fetchProfiles(); // Refresh the list
      return { success: true, id: data[0].id };
    } catch (err) {
      console.error('Error in saveProfile:', err);
      toast.error('Failed to save assignment profile');
      return { success: false };
    }
  };

  const updateProfile = async (
    id: string,
    updates: Partial<Pick<AssignmentProfile, 'name' | 'assignment_details'>>
  ): Promise<boolean> => {
    if (!authState.user) {
      toast.error('You must be logged in to update profiles');
      return false;
    }

    try {
      const now = new Date().toISOString();
      
      // Demo user storage
      if (authState.user.id === 'demo-user-id') {
        console.log("Updating profile for demo user, profile ID:", id);
        
        // Get existing profiles
        const storedProfiles = localStorage.getItem('demo_profiles');
        if (!storedProfiles) {
          console.error("No stored profiles found for demo user");
          toast.error('Profile not found');
          return false;
        }
        
        try {
          const demoProfiles = JSON.parse(storedProfiles);
          const profileIndex = demoProfiles.findIndex((p: any) => p.id === id);
          
          if (profileIndex === -1) {
            console.error("Profile not found in demo profiles:", id);
            toast.error('Profile not found');
            return false;
          }
          
          // Update the profile
          demoProfiles[profileIndex] = {
            ...demoProfiles[profileIndex],
            ...updates,
            updated_at: now
          };
          
          // Save back to localStorage
          localStorage.setItem('demo_profiles', JSON.stringify(demoProfiles));
          
          // Update state
          setProfiles(demoProfiles);
          
          toast.success('Assignment profile updated');
          return true;
        } catch (e) {
          console.error("Error parsing stored profiles:", e);
          toast.error('Failed to update profile');
          return false;
        }
      }
      
      // Regular Supabase update for non-demo users
      const { error } = await supabase
        .from('assignment_profiles')
        .update({
          ...updates,
          updated_at: now
        })
        .eq('id', id)
        .eq('user_id', authState.user.id); // Security check

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update assignment profile');
        return false;
      }

      toast.success('Assignment profile updated');
      fetchProfiles(); // Refresh the list
      return true;
    } catch (err) {
      console.error('Error in updateProfile:', err);
      toast.error('Failed to update assignment profile');
      return false;
    }
  };

  const deleteProfile = async (id: string): Promise<boolean> => {
    if (!authState.user) {
      toast.error('You must be logged in to delete profiles');
      return false;
    }

    try {
      // Demo user storage
      if (authState.user.id === 'demo-user-id') {
        console.log("Deleting profile for demo user, profile ID:", id);
        
        // Get existing profiles
        const storedProfiles = localStorage.getItem('demo_profiles');
        if (!storedProfiles) {
          console.error("No stored profiles found for demo user");
          toast.error('Profile not found');
          return false;
        }
        
        try {
          let demoProfiles = JSON.parse(storedProfiles);
          
          // Filter out the profile to delete
          const filteredProfiles = demoProfiles.filter((p: any) => p.id !== id);
          
          if (filteredProfiles.length === demoProfiles.length) {
            console.error("Profile not found in demo profiles:", id);
            toast.error('Profile not found');
            return false;
          }
          
          // Save back to localStorage
          localStorage.setItem('demo_profiles', JSON.stringify(filteredProfiles));
          
          // Update state
          setProfiles(filteredProfiles);
          
          toast.success('Assignment profile deleted');
          return true;
        } catch (e) {
          console.error("Error parsing stored profiles:", e);
          toast.error('Failed to delete profile');
          return false;
        }
      }
    
      // Regular Supabase delete for non-demo users
      const { error } = await supabase
        .from('assignment_profiles')
        .delete()
        .eq('id', id)
        .eq('user_id', authState.user.id); // Security check

      if (error) {
        console.error('Error deleting profile:', error);
        toast.error('Failed to delete assignment profile');
        return false;
      }

      toast.success('Assignment profile deleted');
      setProfiles(profiles.filter(profile => profile.id !== id));
      return true;
    } catch (err) {
      console.error('Error in deleteProfile:', err);
      toast.error('Failed to delete assignment profile');
      return false;
    }
  };

  const updateLastUsed = async (id: string): Promise<void> => {
    if (!authState.user) return;

    try {
      const now = new Date().toISOString();
      
      // Handle demo user
      if (authState.user.id === 'demo-user-id') {
        const storedProfiles = localStorage.getItem('demo_profiles');
        if (storedProfiles) {
          try {
            const demoProfiles = JSON.parse(storedProfiles);
            const profileIndex = demoProfiles.findIndex((p: any) => p.id === id);
            
            if (profileIndex !== -1) {
              demoProfiles[profileIndex].last_used = now;
              localStorage.setItem('demo_profiles', JSON.stringify(demoProfiles));
              
              // Also update in state
              const updatedProfiles = [...profiles];
              updatedProfiles[profileIndex].last_used = now;
              setProfiles(updatedProfiles);
            }
          } catch (e) {
            console.error("Error updating last used for demo profile:", e);
          }
        }
        return;
      }
    
      // Regular Supabase update
      await supabase
        .from('assignment_profiles')
        .update({ last_used: now })
        .eq('id', id)
        .eq('user_id', authState.user.id);
    } catch (err) {
      console.error('Error updating last_used:', err);
    }
  };

  // Load profiles when the user changes
  useEffect(() => {
    if (authState.user) {
      fetchProfiles();
    } else {
      setProfiles([]);
    }
  }, [authState.user]);

  return {
    profiles,
    isLoading,
    error,
    fetchProfiles,
    saveProfile,
    updateProfile,
    deleteProfile,
    updateLastUsed
  };
};