-- ==========================================================================
-- Todome – todo lists & enhanced todo fields
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Table: todo_lists
-- --------------------------------------------------------------------------
CREATE TABLE public.todo_lists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT,
  icon         TEXT DEFAULT 'list',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_deleted   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_todo_lists_user_id    ON public.todo_lists(user_id);
CREATE INDEX idx_todo_lists_sort_order ON public.todo_lists(user_id, sort_order);

ALTER TABLE public.todo_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY todo_lists_select ON public.todo_lists
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY todo_lists_insert ON public.todo_lists
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY todo_lists_update ON public.todo_lists
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY todo_lists_delete ON public.todo_lists
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER trg_todo_lists_updated_at
  BEFORE UPDATE ON public.todo_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- Alter: todos – add list_id, is_flagged, subtasks
-- --------------------------------------------------------------------------
ALTER TABLE public.todos
  ADD COLUMN list_id    UUID REFERENCES public.todo_lists(id) ON DELETE SET NULL,
  ADD COLUMN is_flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN subtasks   JSONB NOT NULL DEFAULT '[]';

CREATE INDEX idx_todos_list_id    ON public.todos(list_id) WHERE list_id IS NOT NULL;
CREATE INDEX idx_todos_is_flagged ON public.todos(user_id, is_flagged) WHERE is_flagged = true;
