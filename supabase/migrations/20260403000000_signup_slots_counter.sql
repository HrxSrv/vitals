-- =============================================================================
-- Signup Slots Counter Migration
-- Tracks remaining signup slots, decrements automatically on new user creation,
-- and maintains an audit log of all changes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. public.slots — single-row table holding the current remaining slot count
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.slots (
  id          integer      PRIMARY KEY DEFAULT 1,
  remaining   integer      NOT NULL DEFAULT 923,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT slots_single_row   CHECK (id = 1),
  CONSTRAINT slots_non_negative CHECK (remaining >= 0)
);

-- Seed the single row (no-op if it already exists)
INSERT INTO public.slots (id, remaining)
VALUES (1, 923)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. public.slot_audit_log — append-only record of every slot change
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.slot_audit_log (
  id          bigserial    PRIMARY KEY,
  changed_at  timestamptz  NOT NULL DEFAULT now(),
  changed_by  text         NOT NULL,
  old_value   integer      NOT NULL,
  new_value   integer      NOT NULL
);

-- ---------------------------------------------------------------------------
-- 3. Trigger function — fires after each new auth.users row is inserted
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_slot_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old integer;
  v_new integer;
BEGIN
  -- Decrement remaining (floor at 0) and capture both values
  UPDATE public.slots
  SET
    remaining  = GREATEST(remaining - 1, 0),
    updated_at = now()
  WHERE id = 1
  RETURNING remaining + 1, remaining
  INTO v_old, v_new;

  -- Write audit record
  INSERT INTO public.slot_audit_log (changed_by, old_value, new_value)
  VALUES ('db_trigger', v_old, v_new);

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Attach trigger to auth.users
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_slot_count();
