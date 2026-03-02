-- ---------------------------------------------------------------------------
-- 004 – Diaries table
-- ---------------------------------------------------------------------------

CREATE TABLE public.diaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  events_text     JSONB,
  summary         JSONB,
  rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
  mood            TEXT CHECK (mood IN ('great','good','neutral','bad','terrible')),
  weather         TEXT CHECK (weather IN ('sunny','cloudy','rainy','snowy','stormy','windy')),
  gratitude       TEXT[] NOT NULL DEFAULT '{}',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One diary per user per date
CREATE UNIQUE INDEX idx_diaries_user_date ON public.diaries(user_id, date) WHERE NOT is_deleted;

CREATE INDEX idx_diaries_user_id    ON public.diaries(user_id);
CREATE INDEX idx_diaries_date       ON public.diaries(date);
CREATE INDEX idx_diaries_updated_at ON public.diaries(updated_at);
CREATE INDEX idx_diaries_is_deleted ON public.diaries(user_id, is_deleted);

ALTER TABLE public.diaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY diaries_select ON public.diaries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY diaries_insert ON public.diaries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY diaries_update ON public.diaries FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY diaries_delete ON public.diaries FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER trg_diaries_updated_at
  BEFORE UPDATE ON public.diaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.diaries;
