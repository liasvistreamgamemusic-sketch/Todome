// ---------------------------------------------------------------------------
// Todome – IndexedDB read-only cache layer
//
// Stores copies of Supabase responses for instant display on app startup.
// NEVER used for writes — all mutations go directly to Supabase.
// ---------------------------------------------------------------------------

import Dexie, { type EntityTable } from 'dexie';
import type {
  Note,
  NoteSummary,
  Folder,
  Todo,
  TodoList,
  CalendarEvent,
  Diary,
} from './types';

// ---------------------------------------------------------------------------
// Database schema
// ---------------------------------------------------------------------------

interface CachedNote {
  id: string;
  user_id: string;
  title: string;
  content: Note['content'];
  plain_text: string | null;
  folder_id: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

interface CachedFolder {
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

interface CachedTodo {
  id: string;
  user_id: string;
  title: string;
  detail: string | null;
  priority: number;
  status: string;
  due_date: string | null;
  remind_at: string | null;
  remind_repeat: string | null;
  reminded_at: string | null;
  note_ids: string[];
  tags: string[];
  list_id: string | null;
  is_flagged: boolean;
  subtasks: unknown[];
  sort_order: number;
  is_deleted: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CachedTodoList {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface CachedCalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  location: string | null;
  color: string | null;
  diary_content: unknown | null;
  remind_at: string | null;
  reminded_at: string | null;
  repeat_rule: string | null;
  repeat_parent_id: string | null;
  todo_ids: string[];
  note_ids: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface CachedDiary {
  id: string;
  user_id: string;
  date: string;
  events_text: unknown | null;
  summary: unknown | null;
  rating: number | null;
  mood: string | null;
  weather: string | null;
  gratitude: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

const db = new Dexie('todome-cache') as Dexie & {
  notes: EntityTable<CachedNote, 'id'>;
  folders: EntityTable<CachedFolder, 'id'>;
  todos: EntityTable<CachedTodo, 'id'>;
  todo_lists: EntityTable<CachedTodoList, 'id'>;
  calendar_events: EntityTable<CachedCalendarEvent, 'id'>;
  diaries: EntityTable<CachedDiary, 'id'>;
};

db.version(1).stores({
  notes: 'id, user_id, folder_id, updated_at',
  folders: 'id, user_id',
});

db.version(2).stores({
  notes: 'id, user_id, folder_id, updated_at',
  folders: 'id, user_id',
  todos: 'id, user_id, list_id, updated_at',
  todo_lists: 'id, user_id',
  calendar_events: 'id, user_id, updated_at',
  diaries: 'id, user_id, date, updated_at',
});

// ---------------------------------------------------------------------------
// Guard: only run in browser
// ---------------------------------------------------------------------------

const isBrowser = typeof window !== 'undefined';

// ---------------------------------------------------------------------------
// Notes – read
// ---------------------------------------------------------------------------

export async function getCachedNoteSummaries(
  userId: string,
): Promise<NoteSummary[]> {
  if (!isBrowser) return [];
  try {
    const rows = await db.notes
      .where('user_id')
      .equals(userId)
      .filter((n) => !n.is_deleted)
      .reverse()
      .sortBy('updated_at');
    // Strip content to match NoteSummary shape
    return rows.map(({ content: _, ...rest }) => rest);
  } catch {
    return [];
  }
}

export async function getCachedNoteById(id: string): Promise<Note | null> {
  if (!isBrowser) return null;
  try {
    const row = await db.notes.get(id);
    return (row as Note) ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Notes – write (cache update only, NOT Supabase)
// ---------------------------------------------------------------------------

export async function cacheNoteSummaries(
  summaries: NoteSummary[],
  userId: string,
): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.transaction('rw', db.notes, async () => {
      // Collect existing content so we don't lose it when overwriting
      const existing = await db.notes.where('user_id').equals(userId).toArray();
      const contentMap = new Map<string, Note['content']>();
      for (const row of existing) {
        if (row.content) contentMap.set(row.id, row.content);
      }

      // Replace all cached notes for this user (removes deleted ones too)
      await db.notes.where('user_id').equals(userId).delete();
      await db.notes.bulkPut(
        summaries.map((s) => ({
          ...s,
          content: contentMap.get(s.id) ?? null,
        })),
      );
    });
  } catch {
    // Cache failure is non-critical
  }
}

export async function cacheNote(note: Note): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.notes.put(note as CachedNote);
  } catch {
    // Cache failure is non-critical
  }
}

export async function removeCachedNote(id: string): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.notes.delete(id);
  } catch {
    // Cache failure is non-critical
  }
}

// ---------------------------------------------------------------------------
// Folders – read
// ---------------------------------------------------------------------------

export async function getCachedFolders(userId: string): Promise<Folder[]> {
  if (!isBrowser) return [];
  try {
    return (await db.folders
      .where('user_id')
      .equals(userId)
      .sortBy('sort_order')) as Folder[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Folders – write (cache update only)
// ---------------------------------------------------------------------------

export async function cacheFolders(
  folders: Folder[],
  userId: string,
): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.transaction('rw', db.folders, async () => {
      await db.folders.where('user_id').equals(userId).delete();
      await db.folders.bulkPut(folders as CachedFolder[]);
    });
  } catch {
    // Cache failure is non-critical
  }
}

// ---------------------------------------------------------------------------
// Todos – read
// ---------------------------------------------------------------------------

export async function getCachedTodos(userId: string): Promise<Todo[]> {
  if (!isBrowser) return [];
  try {
    return (await db.todos
      .where('user_id')
      .equals(userId)
      .filter((t) => !t.is_deleted)
      .sortBy('sort_order')) as unknown as Todo[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Todos – write (cache update only)
// ---------------------------------------------------------------------------

export async function cacheTodos(
  todos: Todo[],
  userId: string,
): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.transaction('rw', db.todos, async () => {
      await db.todos.where('user_id').equals(userId).delete();
      await db.todos.bulkPut(todos as unknown as CachedTodo[]);
    });
  } catch {
    // Cache failure is non-critical
  }
}

// ---------------------------------------------------------------------------
// Todo Lists – read
// ---------------------------------------------------------------------------

export async function getCachedTodoLists(userId: string): Promise<TodoList[]> {
  if (!isBrowser) return [];
  try {
    return (await db.todo_lists
      .where('user_id')
      .equals(userId)
      .filter((l) => !l.is_deleted)
      .sortBy('sort_order')) as unknown as TodoList[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Todo Lists – write (cache update only)
// ---------------------------------------------------------------------------

export async function cacheTodoLists(
  lists: TodoList[],
  userId: string,
): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.transaction('rw', db.todo_lists, async () => {
      await db.todo_lists.where('user_id').equals(userId).delete();
      await db.todo_lists.bulkPut(lists as unknown as CachedTodoList[]);
    });
  } catch {
    // Cache failure is non-critical
  }
}

// ---------------------------------------------------------------------------
// Calendar Events – read
// ---------------------------------------------------------------------------

export async function getCachedCalendarEvents(
  userId: string,
): Promise<CalendarEvent[]> {
  if (!isBrowser) return [];
  try {
    return (await db.calendar_events
      .where('user_id')
      .equals(userId)
      .filter((e) => !e.is_deleted)
      .sortBy('start_at')) as unknown as CalendarEvent[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Calendar Events – write (cache update only)
// ---------------------------------------------------------------------------

export async function cacheCalendarEvents(
  events: CalendarEvent[],
  userId: string,
): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.transaction('rw', db.calendar_events, async () => {
      await db.calendar_events.where('user_id').equals(userId).delete();
      await db.calendar_events.bulkPut(
        events as unknown as CachedCalendarEvent[],
      );
    });
  } catch {
    // Cache failure is non-critical
  }
}

// ---------------------------------------------------------------------------
// Diaries – read
// ---------------------------------------------------------------------------

export async function getCachedDiaries(userId: string): Promise<Diary[]> {
  if (!isBrowser) return [];
  try {
    return (await db.diaries
      .where('user_id')
      .equals(userId)
      .filter((d) => !d.is_deleted)
      .reverse()
      .sortBy('date')) as unknown as Diary[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Diaries – write (cache update only)
// ---------------------------------------------------------------------------

export async function cacheDiaries(
  diaries: Diary[],
  userId: string,
): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.transaction('rw', db.diaries, async () => {
      await db.diaries.where('user_id').equals(userId).delete();
      await db.diaries.bulkPut(diaries as unknown as CachedDiary[]);
    });
  } catch {
    // Cache failure is non-critical
  }
}
