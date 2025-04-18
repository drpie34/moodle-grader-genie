-- Initial schema for Moodle Grader application
-- Creates users and assignment_profiles tables

-- Users table for authentication and subscription tracking
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  account_tier TEXT DEFAULT 'free' NOT NULL CHECK (account_tier IN ('free', 'basic', 'premium')),
  subscription_status TEXT DEFAULT 'inactive' NOT NULL CHECK (subscription_status IN ('active', 'inactive', 'trialing', 'past_due', 'canceled')),
  grades_used INTEGER DEFAULT 0 NOT NULL,
  grades_limit INTEGER DEFAULT 50 NOT NULL
);

-- Assignment profiles table for saving assignment configurations
CREATE TABLE IF NOT EXISTS public.assignment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  assignment_details JSONB NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_profiles ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Profiles policies
CREATE POLICY "Users can view own profiles" ON public.assignment_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles" ON public.assignment_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" ON public.assignment_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles" ON public.assignment_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Set up index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assignment_profiles_user_id ON public.assignment_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_profiles_last_used ON public.assignment_profiles(last_used);

-- Automatically set updated_at for assignment_profiles
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assignment_profiles_modtime
BEFORE UPDATE ON public.assignment_profiles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();