// ---------------------------------------------------------------------------
// Todome – shared data types
// ---------------------------------------------------------------------------

/** Tiptap-compatible JSON document structure. */
export interface TiptapDocument {
  type: 'doc';
  content: TiptapNode[];
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Enums / Unions
// ---------------------------------------------------------------------------

export const TODO_PRIORITIES = [1, 2, 3, 4] as const;
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

export const TODO_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export const PARENT_TYPES = ['note', 'todo', 'event'] as const;
export type ParentType = (typeof PARENT_TYPES)[number];

export const REMIND_REPEATS = [
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const;
export type RemindRepeat = (typeof REMIND_REPEATS)[number];

export const SYNC_OPERATIONS = ['create', 'update', 'delete'] as const;
export type SyncOperation = (typeof SYNC_OPERATIONS)[number];

export const SYNCABLE_TABLES = [
  'notes',
  'folders',
  'todos',
  'calendar_events',
  'attachments',
] as const;
export type SyncableTable = (typeof SYNCABLE_TABLES)[number];

// ---------------------------------------------------------------------------
// Result pattern
// ---------------------------------------------------------------------------

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E = Error>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: TiptapDocument | null;
  plain_text: string | null;
  folder_id: string | null;
  tags: string[];
  is_pinned: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  detail: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  due_date: string | null;
  remind_at: string | null;
  remind_repeat: RemindRepeat | null;
  note_ids: string[];
  tags: string[];
  sort_order: number;
  is_deleted: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  location: string | null;
  color: string | null;
  diary_content: TiptapDocument | null;
  remind_at: string | null;
  repeat_rule: string | null;
  repeat_parent_id: string | null;
  todo_ids: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  user_id: string;
  parent_type: ParentType;
  parent_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Create / Update input types
// ---------------------------------------------------------------------------

export interface CreateNoteInput {
  title?: string;
  content?: TiptapDocument | null;
  plain_text?: string | null;
  folder_id?: string | null;
  tags?: string[];
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  content?: TiptapDocument | null;
  plain_text?: string | null;
  folder_id?: string | null;
  tags?: string[];
  is_pinned?: boolean;
  is_archived?: boolean;
  is_deleted?: boolean;
}

export interface CreateFolderInput {
  name: string;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  sort_order?: number;
}

export interface UpdateFolderInput {
  name?: string;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  sort_order?: number;
}

export interface CreateTodoInput {
  title: string;
  detail?: string | null;
  priority?: TodoPriority;
  status?: TodoStatus;
  due_date?: string | null;
  remind_at?: string | null;
  remind_repeat?: RemindRepeat | null;
  note_ids?: string[];
  tags?: string[];
  sort_order?: number;
}

export interface UpdateTodoInput {
  title?: string;
  detail?: string | null;
  priority?: TodoPriority;
  status?: TodoStatus;
  due_date?: string | null;
  remind_at?: string | null;
  remind_repeat?: RemindRepeat | null;
  note_ids?: string[];
  tags?: string[];
  sort_order?: number;
  is_deleted?: boolean;
  completed_at?: string | null;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  is_all_day?: boolean;
  location?: string | null;
  color?: string | null;
  diary_content?: TiptapDocument | null;
  remind_at?: string | null;
  repeat_rule?: string | null;
  repeat_parent_id?: string | null;
  todo_ids?: string[];
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string | null;
  start_at?: string;
  end_at?: string;
  is_all_day?: boolean;
  location?: string | null;
  color?: string | null;
  diary_content?: TiptapDocument | null;
  remind_at?: string | null;
  repeat_rule?: string | null;
  repeat_parent_id?: string | null;
  todo_ids?: string[];
  is_deleted?: boolean;
}

export interface CreateAttachmentInput {
  parent_type: ParentType;
  parent_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
}

// ---------------------------------------------------------------------------
// Sync queue
// ---------------------------------------------------------------------------

export interface SyncQueueItem {
  id?: number;
  table: SyncableTable;
  record_id: string;
  operation: SyncOperation;
  data: Record<string, unknown>;
  timestamp: string;
}
