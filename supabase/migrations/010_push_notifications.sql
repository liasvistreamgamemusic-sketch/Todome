-- ==========================================================================
-- Push notification infrastructure
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Table: push_subscriptions
-- Stores Web Push API subscriptions per user/device.
-- --------------------------------------------------------------------------
CREATE TABLE public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_select ON public.push_subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY push_subscriptions_insert ON public.push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY push_subscriptions_update ON public.push_subscriptions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY push_subscriptions_delete ON public.push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- Add reminded_at to existing tables for server-side dedup
-- --------------------------------------------------------------------------
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;

-- Partial indexes for the send-reminders edge function
CREATE INDEX idx_todos_pending_reminders
  ON public.todos(remind_at)
  WHERE remind_at IS NOT NULL
    AND status NOT IN ('completed', 'cancelled')
    AND is_deleted = false;

CREATE INDEX idx_calendar_events_pending_reminders
  ON public.calendar_events(remind_at)
  WHERE remind_at IS NOT NULL
    AND is_deleted = false;
