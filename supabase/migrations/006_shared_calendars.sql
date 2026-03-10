-- ==========================================================================
-- 006 – Shared Calendars
-- ==========================================================================

-- Clean up any partial state from a previous failed run
DROP TABLE IF EXISTS public.shared_calendar_events CASCADE;
DROP TABLE IF EXISTS public.shared_calendar_members CASCADE;
DROP TABLE IF EXISTS public.shared_calendars CASCADE;
DROP FUNCTION IF EXISTS public.is_shared_calendar_participant(UUID);
DROP FUNCTION IF EXISTS public.is_shared_calendar_owner(UUID);

-- --------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER — bypass RLS to prevent recursion)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_shared_calendar_owner(cal_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shared_calendars WHERE id = cal_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_shared_calendar_member(cal_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shared_calendar_members
    WHERE shared_calendar_id = cal_id AND user_id = auth.uid() AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_shared_calendar_participant(cal_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_shared_calendar_owner(cal_id)
      OR public.is_shared_calendar_member(cal_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- --------------------------------------------------------------------------
-- Table: shared_calendars
-- --------------------------------------------------------------------------
CREATE TABLE public.shared_calendars (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#7986CB',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_calendars_owner ON public.shared_calendars(owner_id);
ALTER TABLE public.shared_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY sc_owner_all ON public.shared_calendars
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Members can SELECT calendars they belong to (uses SECURITY DEFINER to avoid recursion)
CREATE POLICY sc_member_select ON public.shared_calendars
  FOR SELECT USING (public.is_shared_calendar_member(id));

CREATE TRIGGER trg_shared_calendars_updated_at
  BEFORE UPDATE ON public.shared_calendars
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- Table: shared_calendar_members
-- --------------------------------------------------------------------------
CREATE TABLE public.shared_calendar_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_calendar_id  UUID NOT NULL REFERENCES public.shared_calendars(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_token        UUID NOT NULL DEFAULT gen_random_uuid(),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'active', 'removed')),
  is_visible          BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_scm_calendar_user ON public.shared_calendar_members(shared_calendar_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_scm_invite_token ON public.shared_calendar_members(invite_token);
CREATE INDEX idx_scm_user ON public.shared_calendar_members(user_id);
ALTER TABLE public.shared_calendar_members ENABLE ROW LEVEL SECURITY;

-- Owner can manage all members (uses SECURITY DEFINER to avoid recursion)
CREATE POLICY scm_owner_all ON public.shared_calendar_members
  FOR ALL USING (public.is_shared_calendar_owner(shared_calendar_id));

CREATE POLICY scm_member_select ON public.shared_calendar_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY scm_member_update_self ON public.shared_calendar_members
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY scm_claim_invite ON public.shared_calendar_members
  FOR UPDATE USING (user_id IS NULL AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'active');

CREATE POLICY scm_pending_select ON public.shared_calendar_members
  FOR SELECT USING (user_id IS NULL AND status = 'pending');

CREATE TRIGGER trg_scm_updated_at
  BEFORE UPDATE ON public.shared_calendar_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- Table: shared_calendar_events
-- --------------------------------------------------------------------------
CREATE TABLE public.shared_calendar_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_calendar_id  UUID NOT NULL REFERENCES public.shared_calendars(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  start_at            TIMESTAMPTZ NOT NULL,
  end_at              TIMESTAMPTZ NOT NULL,
  is_all_day          BOOLEAN NOT NULL DEFAULT false,
  location            TEXT,
  color               TEXT,
  is_deleted          BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sce_calendar ON public.shared_calendar_events(shared_calendar_id);
CREATE INDEX idx_sce_time ON public.shared_calendar_events(start_at, end_at);
CREATE INDEX idx_sce_created_by ON public.shared_calendar_events(created_by);
ALTER TABLE public.shared_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY sce_participant_select ON public.shared_calendar_events
  FOR SELECT USING (public.is_shared_calendar_participant(shared_calendar_id));

CREATE POLICY sce_participant_insert ON public.shared_calendar_events
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    public.is_shared_calendar_participant(shared_calendar_id)
  );

-- Owner and creator can edit/delete (uses SECURITY DEFINER to avoid recursion)
CREATE POLICY sce_edit ON public.shared_calendar_events
  FOR UPDATE USING (
    created_by = auth.uid() OR
    public.is_shared_calendar_owner(shared_calendar_id)
  );

CREATE POLICY sce_delete ON public.shared_calendar_events
  FOR DELETE USING (
    created_by = auth.uid() OR
    public.is_shared_calendar_owner(shared_calendar_id)
  );

CREATE TRIGGER trg_sce_updated_at
  BEFORE UPDATE ON public.shared_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- Realtime
-- --------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_calendars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_calendar_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_calendar_events;
