-- Add lock flag to notes
ALTER TABLE public.notes
  ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false;

-- User settings for lock password
CREATE TABLE public.user_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_password_hash TEXT,
  lock_salt  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_settings_select ON public.user_settings
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_settings_insert ON public.user_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_settings_update ON public.user_settings
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
