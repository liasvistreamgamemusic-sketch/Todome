-- Add note_ids column to calendar_events for linking related notes
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS note_ids UUID[] DEFAULT '{}';
