-- ==========================================================================
-- Enable Supabase Realtime on data tables
-- Without this, postgres_changes events are never emitted to clients.
-- ==========================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
