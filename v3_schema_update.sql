-- ==========================================
-- AI PULSE V3.0 SCHEMA UPDATE SCRIPT
-- ==========================================

-- 1. ADD NEW COLUMNS TO USER PROFILES
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS about TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS github TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT;

-- Allow users to update their own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Everyone can view profiles" ON public.user_profiles;
CREATE POLICY "Everyone can view profiles" ON public.user_profiles FOR SELECT USING (true);


-- 2. CREATE COMMENTS TABLE (if missing)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view comments" ON public.comments;
CREATE POLICY "Everyone can view comments" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
CREATE POLICY "Users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 3. CREATE LIKES TABLE (if missing)
CREATE TABLE IF NOT EXISTS public.likes (
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (article_id, user_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view likes" ON public.likes;
CREATE POLICY "Everyone can view likes" ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can like" ON public.likes;
CREATE POLICY "Users can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike" ON public.likes;
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);


-- 4. ADD VIEWS TO ARTICLES AND CREATE INCREMENT FUNCTION
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS views INT DEFAULT 0;

-- Function to securely increment views without needing Admin privileges
CREATE OR REPLACE FUNCTION public.increment_view(article_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.articles
  SET views = views + 1
  WHERE id = article_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
