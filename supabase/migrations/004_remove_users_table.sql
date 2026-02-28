-- Migration: Remove users table and use Supabase Auth directly
-- This simplifies the architecture by using auth.users as the single source of truth

-- Drop foreign key constraints that reference users table
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_user_id_fkey;
ALTER TABLE biomarkers DROP CONSTRAINT IF EXISTS biomarkers_user_id_fkey;
ALTER TABLE user_health_markdown DROP CONSTRAINT IF EXISTS user_health_markdown_user_id_fkey;
ALTER TABLE report_embeddings DROP CONSTRAINT IF EXISTS report_embeddings_user_id_fkey;
ALTER TABLE notification_prefs DROP CONSTRAINT IF EXISTS notification_prefs_user_id_fkey;

-- Drop the users table
DROP TABLE IF EXISTS users CASCADE;

-- Note: user_id columns in all tables now reference auth.uid() directly
-- Supabase Auth user IDs are UUIDs, so no schema changes needed for the columns themselves

-- Add comments to document that user_id references Supabase Auth
COMMENT ON COLUMN profiles.user_id IS 'References auth.users(id) - Supabase Auth user ID';
COMMENT ON COLUMN reports.user_id IS 'References auth.users(id) - Supabase Auth user ID';
COMMENT ON COLUMN biomarkers.user_id IS 'References auth.users(id) - Supabase Auth user ID';
COMMENT ON COLUMN user_health_markdown.user_id IS 'References auth.users(id) - Supabase Auth user ID';
COMMENT ON COLUMN report_embeddings.user_id IS 'References auth.users(id) - Supabase Auth user ID';
COMMENT ON COLUMN notification_prefs.user_id IS 'References auth.users(id) - Supabase Auth user ID';
