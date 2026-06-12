-- ==========================================
-- AI PULSE V4.0 SCHEMA UPDATE SCRIPT
-- ==========================================

-- Update the handle_new_user trigger to save name and about from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, about)
  VALUES (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'about'
  );
  
  -- Give them 'user' role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user') ON CONFLICT DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
