-- Encrypted bot key storage migration
-- Run this in Supabase SQL Editor after the base schema.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bot_keys'
      AND column_name = 'api_key'
  ) THEN
    ALTER TABLE public.bot_keys RENAME TO bot_keys_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bot_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  tag text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  last4 text NOT NULL,
  key_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bot_key_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_key_id uuid REFERENCES public.bot_keys(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('reveal', 'regenerate')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bot_keys_updated_at ON public.bot_keys;
CREATE TRIGGER set_bot_keys_updated_at
  BEFORE UPDATE ON public.bot_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bot_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_key_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to bot keys" ON public.bot_keys;
CREATE POLICY "No direct access to bot keys" ON public.bot_keys
  FOR ALL USING (false);

DROP POLICY IF EXISTS "No direct access to bot key audit" ON public.bot_key_audit;
CREATE POLICY "No direct access to bot key audit" ON public.bot_key_audit
  FOR ALL USING (false);

CREATE OR REPLACE FUNCTION public.get_bot_key_public(_user_id uuid)
RETURNS TABLE (
  last4 text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT last4, created_at, updated_at
  FROM public.bot_keys
  WHERE user_id = _user_id;
$$;

CREATE OR REPLACE VIEW public.bot_keys_public AS
  SELECT * FROM public.get_bot_key_public(auth.uid());

GRANT SELECT ON public.bot_keys_public TO anon, authenticated;

SELECT 'Bot key encryption migration complete.' AS status;
