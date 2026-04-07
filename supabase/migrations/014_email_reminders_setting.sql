-- Add email reminder setting to existing user_settings table
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS email_reminders_enabled BOOLEAN NOT NULL DEFAULT false;
