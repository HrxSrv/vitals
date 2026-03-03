-- Auto-create default profile when a new user signs up
-- This ensures every user has a profile immediately after signup
-- DOB is left null and can be added later by the user

-- Function to create default profile for new users
CREATE OR REPLACE FUNCTION public.create_default_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a default profile for the new user in the public schema
  INSERT INTO public.profiles (user_id, name, relationship, is_default)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'), -- Use name from signup or default to 'User'
    'self',
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create default profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile after user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_profile();

-- Add comment for documentation
COMMENT ON FUNCTION public.create_default_profile IS 'Automatically creates a default profile for new users with relationship=self and is_default=true. DOB is left null for users to add later.';
