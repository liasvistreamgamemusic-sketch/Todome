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
  is_pinned: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

/** Lightweight note type for list display (excludes heavy content field). */
export type NoteSummary = Omit<Note, 'content'>;

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
  note_ids: string[];
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
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  content?: TiptapDocument | null;
  plain_text?: string | null;
  folder_id?: string | null;
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
  note_ids?: string[];
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
  note_ids?: string[];
  is_deleted?: boolean;
}

// ---------------------------------------------------------------------------
// Calendar Subscription (ICS/iCal)
// ---------------------------------------------------------------------------

export const CALENDAR_PROVIDERS = ['google', 'outlook', 'apple', 'other'] as const;
export type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];

export interface CalendarSubscription {
  id: string;
  user_id: string;
  name: string;
  url: string;
  color: string;
  provider: CalendarProvider;
  is_enabled: boolean;
  last_synced_at: string | null;
  etag: string | null;
  error_message: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCalendarSubscriptionInput {
  name: string;
  url: string;
  color?: string;
  provider?: CalendarProvider;
  is_enabled?: boolean;
}

export interface UpdateCalendarSubscriptionInput {
  name?: string;
  url?: string;
  color?: string;
  provider?: CalendarProvider;
  is_enabled?: boolean;
  last_synced_at?: string | null;
  etag?: string | null;
  error_message?: string | null;
  is_deleted?: boolean;
}

/** Read-only event parsed from an ICS subscription (client-side only). */
export interface ExternalCalendarEvent {
  /** Deterministic ID: `${subscriptionId}:${ics_uid}` */
  id: string;
  subscription_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  location: string | null;
  color: string;
  provider: CalendarProvider;
  ics_uid: string;
}

/** Discriminated union for rendering both local and external events. */
export type DisplayEvent =
  | { source: 'local'; event: CalendarEvent }
  | { source: 'external'; event: ExternalCalendarEvent };

// ---------------------------------------------------------------------------
// Diary
// ---------------------------------------------------------------------------

export const DIARY_MOODS = ['great', 'good', 'neutral', 'bad', 'terrible'] as const;
export type DiaryMood = (typeof DIARY_MOODS)[number];

export const DIARY_WEATHERS = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'windy'] as const;
export type DiaryWeather = (typeof DIARY_WEATHERS)[number];

export const DIARY_RATINGS = [1, 2, 3, 4, 5] as const;
export type DiaryRating = (typeof DIARY_RATINGS)[number];

export interface Diary {
  id: string;
  user_id: string;
  date: string;
  events_text: TiptapDocument | null;
  summary: TiptapDocument | null;
  rating: DiaryRating | null;
  mood: DiaryMood | null;
  weather: DiaryWeather | null;
  gratitude: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDiaryInput {
  date: string;
  events_text?: TiptapDocument | null;
  summary?: TiptapDocument | null;
  rating?: DiaryRating | null;
  mood?: DiaryMood | null;
  weather?: DiaryWeather | null;
  gratitude?: string[];
}

export interface UpdateDiaryInput {
  date?: string;
  events_text?: TiptapDocument | null;
  summary?: TiptapDocument | null;
  rating?: DiaryRating | null;
  mood?: DiaryMood | null;
  weather?: DiaryWeather | null;
  gratitude?: string[];
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

