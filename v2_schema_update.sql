-- ==========================================
-- AI PULSE V2.0 SCHEMA UPDATE SCRIPT (PATCHED)
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ==========================================

-- 0. USER ROLES SETUP (Crucial to prevent 'Permission Denied')
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- FIXED RECURSION BUG: Let everyone read roles so the database doesn't crash in a loop
DROP POLICY IF EXISTS "Admins can view all user roles." ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can view user roles." ON public.user_roles;
CREATE POLICY "Anyone can view user roles." ON public.user_roles FOR SELECT USING (true);

-- Only Admins can modify roles
DROP POLICY IF EXISTS "Admins can update user roles." ON public.user_roles;
CREATE POLICY "Admins can update user roles." ON public.user_roles FOR UPDATE USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

DROP POLICY IF EXISTS "Admins can insert user roles." ON public.user_roles;
CREATE POLICY "Admins can insert user roles." ON public.user_roles FOR INSERT WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);


-- 1. DYNAMIC CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories
DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone." ON public.categories FOR SELECT USING (true);

-- Only admins can manage categories
DROP POLICY IF EXISTS "Categories are insertable by admins." ON public.categories;
CREATE POLICY "Categories are insertable by admins." ON public.categories FOR INSERT WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

DROP POLICY IF EXISTS "Categories are deletable by admins." ON public.categories;
CREATE POLICY "Categories are deletable by admins." ON public.categories FOR DELETE USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

-- Insert default categories
INSERT INTO public.categories (name) 
VALUES ('LLMs & Chatbots'), ('Generative Art'), ('AI Hardware'), ('AI Ethics'), ('Developer Tools'), ('Startups')
ON CONFLICT (name) DO NOTHING;


-- 2. USER PROFILES FOR ADMIN MANAGEMENT
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Only Admins can view user profiles
DROP POLICY IF EXISTS "Admins can view profiles" ON public.user_profiles;
CREATE POLICY "Admins can view profiles" ON public.user_profiles FOR SELECT USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

-- Create a Trigger to automatically save emails to user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email);
  -- Give them 'user' role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user') ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill existing users
INSERT INTO public.user_profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- VERY IMPORTANT: Make sure YOU are marked as an admin right now!
-- (This assigns 'admin' to whoever is running this script if they exist in auth.users)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users LIMIT 1
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
