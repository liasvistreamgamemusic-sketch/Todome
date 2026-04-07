ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT;
