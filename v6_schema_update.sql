-- ==========================================
-- AI PULSE V6.0 SCHEMA UPDATE SCRIPT
-- ==========================================

-- 1. Add status column to articles
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';

-- 2. Secure Drafts: Ensure only admins and the author can read drafts
DROP POLICY IF EXISTS "Public can view published articles" ON public.articles;
CREATE POLICY "Public can view published articles" ON public.articles
FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Admins and Authors can view all articles" ON public.articles;
CREATE POLICY "Admins and Authors can view all articles" ON public.articles
FOR SELECT USING (
    auth.uid() = author_id OR 
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);
