-- ---------------------------------------------------------------------------
-- 005 – Calendar Subscriptions (ICS/iCal URL)
-- ---------------------------------------------------------------------------

CREATE TABLE public.calendar_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#7986CB',
  provider        TEXT NOT NULL DEFAULT 'other'
                    CHECK (provider IN ('google', 'outlook', 'apple', 'other')),
  is_enabled      BOOLEAN NOT NULL DEFAULT true,
  last_synced_at  TIMESTAMPTZ,
  etag            TEXT,
  error_message   TEXT,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cal_subs_user_id    ON public.calendar_subscriptions(user_id);
CREATE INDEX idx_cal_subs_updated_at ON public.calendar_subscriptions(updated_at);
CREATE INDEX idx_cal_subs_is_deleted ON public.calendar_subscriptions(user_id, is_deleted);

ALTER TABLE public.calendar_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cal_subs_select ON public.calendar_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY cal_subs_insert ON public.calendar_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY cal_subs_update ON public.calendar_subscriptions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY cal_subs_delete ON public.calendar_subscriptions FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER trg_cal_subs_updated_at
  BEFORE UPDATE ON public.calendar_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_subscriptions;
