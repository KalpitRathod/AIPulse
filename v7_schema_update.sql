-- ==========================================
-- AI PULSE V7.0 SCHEMA UPDATE SCRIPT
-- ==========================================

-- 1. Threaded Replies
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. Follow System
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view follows" ON public.follows;
CREATE POLICY "Everyone can view follows" ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow" ON public.follows;
CREATE POLICY "Users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- 3. Community Articles
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'official';

-- IMPORTANT: This allows any authenticated user to create a community article
DROP POLICY IF EXISTS "Users can insert community articles" ON public.articles;
CREATE POLICY "Users can insert community articles" ON public.articles 
FOR INSERT WITH CHECK (auth.uid() = author_id AND type = 'community');

-- This allows them to update their own community articles
DROP POLICY IF EXISTS "Users can update own community articles" ON public.articles;
CREATE POLICY "Users can update own community articles" ON public.articles 
FOR UPDATE USING (auth.uid() = author_id AND type = 'community');
