-- ==========================================================================
-- Todome – initial schema migration
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Helper: auto-update updated_at on row change
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- Table: folders
-- --------------------------------------------------------------------------
CREATE TABLE public.folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT,
  icon        TEXT,
  parent_id   UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_folders_user_id   ON public.folders(user_id);
CREATE INDEX idx_folders_parent_id ON public.folders(parent_id);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY folders_select ON public.folders
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY folders_insert ON public.folders
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY folders_update ON public.folders
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY folders_delete ON public.folders
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER trg_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- Table: notes
-- --------------------------------------------------------------------------
CREATE TABLE public.notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  content     JSONB,
  plain_text  TEXT,
  folder_id   UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_deleted  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at   TIMESTAMPTZ
);

CREATE INDEX idx_notes_user_id    ON public.notes(user_id);
CREATE INDEX idx_notes_folder_id  ON public.notes(folder_id);
CREATE INDEX idx_notes_tags       ON public.notes USING gin(tags);
CREATE INDEX idx_notes_updated_at ON public.notes(updated_at);
CREATE INDEX idx_notes_is_deleted ON public.notes(user_id, is_deleted);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_select ON public.notes
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notes_insert ON public.notes
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY notes_update ON public.notes
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notes_delete ON public.notes
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- Table: todos
-- --------------------------------------------------------------------------
CREATE TABLE public.todos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  detail         TEXT,
  priority       SMALLINT NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 4),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date       TIMESTAMPTZ,
  remind_at      TIMESTAMPTZ,
  remind_repeat  TEXT CHECK (remind_repeat IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  note_ids       UUID[] NOT NULL DEFAULT '{}',
  tags           TEXT[] NOT NULL DEFAULT '{}',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_deleted     BOOLEAN NOT NULL DEFAULT false,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_todos_user_id    ON public.todos(user_id);
CREATE INDEX idx_todos_status     ON public.todos(user_id, status);
CREATE INDEX idx_todos_due_date   ON public.todos(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_todos_tags       ON public.todos USING gin(tags);
CREATE INDEX idx_todos_updated_at ON public.todos(updated_at);
CREATE INDEX idx_todos_is_deleted ON public.todos(user_id, is_deleted);

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY todos_select ON public.todos
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY todos_insert ON public.todos
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY todos_update ON public.todos
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY todos_delete ON public.todos
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER trg_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- Table: calendar_events
-- --------------------------------------------------------------------------
CREATE TABLE public.calendar_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  start_at         TIMESTAMPTZ NOT NULL,
  end_at           TIMESTAMPTZ NOT NULL,
  is_all_day       BOOLEAN NOT NULL DEFAULT false,
  location         TEXT,
  color            TEXT,
  diary_content    JSONB,
  remind_at        TIMESTAMPTZ,
  repeat_rule      TEXT,
  repeat_parent_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  todo_ids         UUID[] NOT NULL DEFAULT '{}',
  is_deleted       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_user_id          ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_time_range       ON public.calendar_events(start_at, end_at);
CREATE INDEX idx_calendar_events_repeat_parent_id ON public.calendar_events(repeat_parent_id);
CREATE INDEX idx_calendar_events_updated_at       ON public.calendar_events(updated_at);
CREATE INDEX idx_calendar_events_is_deleted       ON public.calendar_events(user_id, is_deleted);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_events_select ON public.calendar_events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY calendar_events_insert ON public.calendar_events
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY calendar_events_update ON public.calendar_events
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY calendar_events_delete ON public.calendar_events
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- Table: attachments
-- --------------------------------------------------------------------------
CREATE TABLE public.attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_type  TEXT NOT NULL CHECK (parent_type IN ('note', 'todo', 'event')),
  parent_id    UUID NOT NULL,
  file_name    TEXT NOT NULL,
  file_size    INTEGER NOT NULL,
  mime_type    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_user_id   ON public.attachments(user_id);
CREATE INDEX idx_attachments_parent    ON public.attachments(parent_type, parent_id);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY attachments_select ON public.attachments
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY attachments_insert ON public.attachments
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY attachments_update ON public.attachments
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY attachments_delete ON public.attachments
  FOR DELETE USING (user_id = auth.uid());
