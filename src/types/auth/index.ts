import { User } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

export type UserProfile = Database['public']['Tables']['users']['Row'];
export type AssignmentProfile = Database['public']['Tables']['assignment_profiles']['Row'];

export type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
};

export type AccountTier = 'free' | 'basic' | 'premium';

export const TIER_LIMITS = {
  free: 50,
  basic: 500,
  premium: 2000
};

export const TIER_PRICES = {
  free: 0,
  basic: 9,
  premium: 20
};