-- ==========================================================================
-- Cron job setup for email reminders
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ==========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove old push notification cron job if it exists
SELECT cron.unschedule('send-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-reminders'
);

-- Schedule email reminder check every minute
SELECT cron.schedule(
  'send-email-reminders',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/send-email-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
