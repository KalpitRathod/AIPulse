-- ==========================================
-- AI PULSE V5.0 SCHEMA UPDATE SCRIPT
-- ==========================================

-- Allow users to delete their own comments
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Allow admins to delete any comments
DROP POLICY IF EXISTS "Admins can delete any comments" ON public.comments;
CREATE POLICY "Admins can delete any comments" ON public.comments FOR DELETE USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);
