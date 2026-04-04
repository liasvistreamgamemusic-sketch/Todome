-- ==========================================================================
-- pg_cron setup for push notification reminders
--
-- Prerequisites:
--   1. Enable pg_cron extension in Supabase Dashboard > Database > Extensions
--   2. Enable pg_net extension in Supabase Dashboard > Database > Extensions
--   3. Deploy the send-reminders edge function:
--        supabase functions deploy send-reminders
--   4. Set edge function secrets in Supabase Dashboard:
--        VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
--
-- Run this SQL manually in the Supabase SQL Editor after replacing:
--   - YOUR_PROJECT_REF with your Supabase project reference
--   - YOUR_SERVICE_ROLE_KEY with your service role key
-- ==========================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'send-reminders',
  '* * * * *',  -- every minute
  $$
  SELECT net.http_post(
    url    := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body   := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To verify the job was created:
-- SELECT * FROM cron.job;

-- To remove the job:
-- SELECT cron.unschedule('send-reminders');
