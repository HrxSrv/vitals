-- Chat sessions — one conversation thread, bound to a single profile.
-- Binding to profile keeps the RAG context (LHM + embeddings) stable across turns;
-- users create a new session to talk about a different family member.
-- Note: user_id stores auth.uid() directly (see migration 004 — public.users was removed).
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages — user + assistant turns within a session.
-- profile_id is denormalized to record which profile's context the turn actually resolved to,
-- leaving room for future per-message profile routing without a painful migration.
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_partial BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN chat_sessions.user_id IS 'References auth.users(id) - Supabase Auth user ID';
COMMENT ON COLUMN chat_messages.user_id IS 'References auth.users(id) - Supabase Auth user ID';

-- Performance indexes
CREATE INDEX idx_chat_sessions_user_recent ON chat_sessions(user_id, last_message_at DESC);
CREATE INDEX idx_chat_sessions_profile_recent ON chat_sessions(profile_id, last_message_at DESC);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);

-- Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_sessions policies — user_id is auth.uid() directly
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- chat_messages policies
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE chat_sessions IS 'Persistent chat conversation threads, bound to one profile';
COMMENT ON TABLE chat_messages IS 'User and assistant messages within a chat session';
