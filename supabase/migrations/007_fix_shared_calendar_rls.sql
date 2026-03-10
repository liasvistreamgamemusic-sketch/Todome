-- ==========================================================================
-- 007 – Fix shared calendar RLS infinite recursion
-- ==========================================================================
-- Problem: Cross-table RLS policies caused infinite recursion:
--   shared_calendar_members.scm_owner_all → SELECT shared_calendars
--   shared_calendars.sc_member_select → SELECT shared_calendar_members → ∞
--
-- Fix: Use SECURITY DEFINER helper functions that bypass RLS for
-- ownership/membership checks, breaking the recursion chain.
-- ==========================================================================

-- Create helper functions (SECURITY DEFINER bypasses RLS)
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

-- Update is_shared_calendar_participant to use the helpers
CREATE OR REPLACE FUNCTION public.is_shared_calendar_participant(cal_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_shared_calendar_owner(cal_id)
      OR public.is_shared_calendar_member(cal_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix shared_calendars policies
DROP POLICY IF EXISTS sc_member_select ON public.shared_calendars;
CREATE POLICY sc_member_select ON public.shared_calendars
  FOR SELECT USING (public.is_shared_calendar_member(id));

-- Fix shared_calendar_members policies
DROP POLICY IF EXISTS scm_owner_all ON public.shared_calendar_members;
CREATE POLICY scm_owner_all ON public.shared_calendar_members
  FOR ALL USING (public.is_shared_calendar_owner(shared_calendar_id));

-- Fix shared_calendar_events policies
DROP POLICY IF EXISTS sce_edit ON public.shared_calendar_events;
CREATE POLICY sce_edit ON public.shared_calendar_events
  FOR UPDATE USING (
    created_by = auth.uid() OR
    public.is_shared_calendar_owner(shared_calendar_id)
  );

DROP POLICY IF EXISTS sce_delete ON public.shared_calendar_events;
CREATE POLICY sce_delete ON public.shared_calendar_events
  FOR DELETE USING (
    created_by = auth.uid() OR
    public.is_shared_calendar_owner(shared_calendar_id)
  );
