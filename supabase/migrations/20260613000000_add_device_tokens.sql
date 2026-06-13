-- Device tokens — Expo push notification tokens for the mobile app.
-- One row per (user, device-token). A user can have several devices; the same
-- physical token is globally unique, so re-registration upserts on `token`.
-- Note: user_id stores auth.uid() directly (see migration 004 — public.users was removed).
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE device_tokens IS 'Expo push notification tokens registered by the mobile app';
COMMENT ON COLUMN device_tokens.user_id IS 'References auth.users(id) - Supabase Auth user ID';
COMMENT ON COLUMN device_tokens.token IS 'Expo push token (ExponentPushToken[...])';

-- Look up all of a user's devices when sending a push
CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);

-- Row Level Security — user_id is auth.uid() directly
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own device tokens"
  ON device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device tokens"
  ON device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens"
  ON device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens"
  ON device_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Push preference, mirroring report_ready_email_enabled (migration 20260408)
ALTER TABLE notification_prefs
ADD COLUMN push_notifications_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN notification_prefs.push_notifications_enabled IS
  'Whether to send a push notification when a report finishes processing';
