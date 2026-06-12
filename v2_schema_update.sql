-- ==========================================
-- AI PULSE V2.0 SCHEMA UPDATE SCRIPT
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ==========================================

-- 1. DYNAMIC CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories
CREATE POLICY "Categories are viewable by everyone." ON public.categories FOR SELECT USING (true);

-- Only admins can manage categories
CREATE POLICY "Categories are insertable by admins." ON public.categories FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Categories are deletable by admins." ON public.categories FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert default categories if table is empty
INSERT INTO public.categories (name) 
VALUES ('LLMs & Chatbots'), ('Generative Art'), ('AI Hardware'), ('AI Ethics'), ('Developer Tools'), ('Startups')
ON CONFLICT (name) DO NOTHING;


-- 2. USER PROFILES FOR ADMIN MANAGEMENT
-- (We must duplicate emails to the public schema so Admins can read them, because auth.users is blocked by Supabase for security)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for User Profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Only Admins can view user profiles
CREATE POLICY "Admins can view profiles" ON public.user_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create a Trigger to automatically save emails to user_profiles when someone signs up!
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill existing users (so you and any existing test accounts show up)
INSERT INTO public.user_profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- 3. FIX USER ROLES RLS SO ADMINS CAN MANAGE THEM
-- Drop existing policies if any restrict select/update
DROP POLICY IF EXISTS "Admins can view all user roles." ON public.user_roles;
CREATE POLICY "Admins can view all user roles." ON public.user_roles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update user roles." ON public.user_roles;
CREATE POLICY "Admins can update user roles." ON public.user_roles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
