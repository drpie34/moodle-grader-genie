import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthState, UserProfile } from '@/types/auth';
import { toast } from 'sonner';

const initialState: AuthState = {
  user: null,
  profile: null,
  isLoading: true,
  error: null,
};

const AuthContext = createContext<{
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>;
  incrementGradesUsed: (count: number) => Promise<{ error: string | null }>;
}>({
  authState: initialState,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: null }),
  incrementGradesUsed: async () => ({ error: null }),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(initialState);

  useEffect(() => {
    const fetchInitialSession = async () => {
      try {
        // Check for demo user first
        const demoUser = localStorage.getItem('demo_user');
        if (demoUser) {
          console.log("Found demo user in localStorage");
          // Create a fake user profile for demo purposes
          const demoUserData = JSON.parse(demoUser);
          const fakeUser = {
            id: 'demo-user-id',
            email: demoUserData.email,
            role: 'authenticated'
          } as User;
          
          const fakeProfile = {
            id: 'demo-user-id',
            email: demoUserData.email,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            account_tier: demoUserData.account_tier || 'free',
            subscription_status: 'active',
            grades_used: demoUserData.grades_used || 0,
            grades_limit: demoUserData.grades_limit || 50
          } as UserProfile;
          
          setAuthState({ 
            user: fakeUser, 
            profile: fakeProfile, 
            isLoading: false, 
            error: null 
          });
          return;
        }
        
        // Otherwise check for real Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Supabase session check:", session ? "Session found" : "No session");
        
        if (session) {
          const { user } = session;
          
          // Fetch user profile
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error('Error fetching user profile:', error);
            setAuthState({ user, profile: null, isLoading: false, error: error.message });
          } else {
            console.log("User profile loaded:", profile ? "Profile found" : "No profile");
            setAuthState({ user, profile, isLoading: false, error: null });
          }
        } else {
          setAuthState({ ...initialState, isLoading: false });
        }
      } catch (error) {
        console.error('Session fetch error:', error);
        setAuthState({ ...initialState, isLoading: false, error: 'Failed to initialize session' });
      }
    };

    fetchInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { user } = session;
        
        // Fetch user profile
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching user profile:', error);
          setAuthState({ user, profile: null, isLoading: false, error: error.message });
        } else {
          setAuthState({ user, profile, isLoading: false, error: null });
        }
        
        // If this is a new login, update the last_login timestamp
        if (event === 'SIGNED_IN') {
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
        }
      } else {
        setAuthState({ ...initialState, isLoading: false });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Signing in with email:", email);
      const response = await supabase.auth.signInWithPassword({ email, password });
      
      console.log("Sign in response:", {
        user: response.data?.user ? "User object present" : "No user",
        session: response.data?.session ? "Session present" : "No session",
        error: response.error ? response.error.message : "No error"
      });
      
      return { error: response.error ? response.error.message : null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'Failed to sign in' };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log("Signing up with email:", email);
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin
        } 
      });
      
      console.log("Sign up response:", {
        user: data?.user ? `User ID: ${data.user.id}` : "No user",
        error: error ? error.message : "No error"
      });
      
      if (error) {
        return { error: error.message };
      }
      
      if (data?.user) {
        console.log("Creating user profile for:", data.user.id);
        
        // Create user profile with default values
        const profilePayload = {
          id: data.user.id,
          email,
          created_at: new Date().toISOString(),
          account_tier: 'free',
          subscription_status: 'inactive',
          grades_used: 0,
          grades_limit: 50, // Free tier default
        };
        
        const { error: profileError } = await supabase.from('users').insert(profilePayload);
        
        if (profileError) {
          console.error('Error creating user profile:', profileError);
          return { error: profileError.message };
        }
        
        console.log("User profile created successfully");
      }
      
      // Show message about confirmation email
      toast.success("Check your email for a confirmation link to activate your account");
      
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'Failed to sign up' };
    }
  };

  const signOut = async () => {
    console.log("Signing out...");
    
    // Clear demo user if present
    localStorage.removeItem('demo_user');
    
    // Reset auth state immediately so UI updates
    setAuthState({ ...initialState, isLoading: false });
    
    // Also sign out from Supabase
    await supabase.auth.signOut();
    
    console.log("Sign out complete");
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!authState.user) {
      return { error: 'User not authenticated' };
    }

    try {
      // Handle demo user separately
      if (authState.user.id === 'demo-user-id') {
        // Just update the local state for demo user
        if (authState.profile) {
          const updatedProfile = { ...authState.profile, ...updates };
          setAuthState({
            ...authState,
            profile: updatedProfile
          });
          
          // Also update localStorage for persistence
          const demoUserData = localStorage.getItem('demo_user');
          if (demoUserData) {
            const parsedData = JSON.parse(demoUserData);
            const updatedData = { ...parsedData, ...updates };
            localStorage.setItem('demo_user', JSON.stringify(updatedData));
          }
        }
        return { error: null };
      }
      
      // Normal Supabase profile update
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', authState.user.id);
      
      if (error) {
        return { error: error.message };
      }
      
      // Update local state
      if (authState.profile) {
        setAuthState({
          ...authState,
          profile: { ...authState.profile, ...updates }
        });
      }
      
      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error: 'Failed to update profile' };
    }
  };

  const incrementGradesUsed = async (count: number) => {
    if (!authState.user || !authState.profile) {
      return { error: 'User not authenticated' };
    }

    try {
      const newCount = authState.profile.grades_used + count;
      
      // Handle demo user separately
      if (authState.user.id === 'demo-user-id') {
        // Just update the local state for demo user
        setAuthState({
          ...authState,
          profile: { ...authState.profile, grades_used: newCount }
        });
        
        // Also update localStorage for persistence
        const demoUserData = localStorage.getItem('demo_user');
        if (demoUserData) {
          const parsedData = JSON.parse(demoUserData);
          parsedData.grades_used = newCount;
          localStorage.setItem('demo_user', JSON.stringify(parsedData));
        }
        
        return { error: null };
      }
      
      // Normal Supabase update
      const { error } = await supabase
        .from('users')
        .update({ grades_used: newCount })
        .eq('id', authState.user.id);
      
      if (error) {
        return { error: error.message };
      }
      
      // Update local state
      setAuthState({
        ...authState,
        profile: { ...authState.profile, grades_used: newCount }
      });
      
      return { error: null };
    } catch (error) {
      console.error('Increment grades error:', error);
      return { error: 'Failed to update grades count' };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      authState, 
      signIn, 
      signUp, 
      signOut, 
      updateProfile,
      incrementGradesUsed 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};