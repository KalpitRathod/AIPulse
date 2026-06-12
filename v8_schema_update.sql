-- ==========================================
-- AI PULSE V8.0 SCHEMA UPDATE SCRIPT
-- ==========================================

-- Allow admins to completely delete users from the network.
-- This function runs as a superuser (SECURITY DEFINER) so it can delete from auth.users.
-- Deleting from auth.users will automatically cascade and delete the user's articles, comments, likes, follows, and profile.

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Ensure the caller is an admin
    IF EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        -- Delete the user from auth.users (this cascades to everything else)
        DELETE FROM auth.users WHERE id = target_user_id;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Only admins can delete users.';
    END IF;
END;
$$;
