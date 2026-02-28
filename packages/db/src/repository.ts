// ---------------------------------------------------------------------------
// Todome – Repository layer
//
// Bridges localDb (IndexedDB/Dexie) + supabase (remote) + syncEngine (queue).
//
// Load strategy  : Supabase first, upsert results into localDb as cache,
//                  fallback to localDb when offline or on error.
// Write strategy : Write to localDb immediately, enqueue for Supabase sync,
//                  and attempt an immediate push for updates when online.
// ---------------------------------------------------------------------------

import { supabase } from './supabase';
import { localDb } from './local-db';
import { syncEngine } from './sync-engine';
import type {
  Note,
  Folder,
  Todo,
  CalendarEvent,
} from './types';

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/**
 * Load all non-deleted notes for the given user.
 * Tries Supabase first; on failure falls back to the local IndexedDB cache.
 */
export async function loadNotes(userId: string): Promise<Note[]> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (error) throw error;

    const notes = data as Note[];

    // Upsert into local cache for offline use.
    await localDb.notes.bulkPut(notes);

    return notes;
  } catch {
    // Offline or Supabase unavailable – serve from local cache.
    return localDb.notes
      .where('user_id')
      .equals(userId)
      .filter((n) => !n.is_deleted)
      .toArray();
  }
}

/**
 * Persist a new note to localDb and enqueue it for Supabase sync.
 */
export async function createNote(note: Note): Promise<void> {
  await localDb.notes.put(note);
  await syncEngine.enqueue(
    'notes',
    note.id,
    'create',
    note as unknown as Record<string, unknown>,
  );
  if (syncEngine.isOnline) {
    syncEngine.pushChanges().catch(() => {});
  }
}

/**
 * Apply a partial update to a note in localDb and enqueue the patch for sync.
 * Immediately attempts to push if the device is online.
 */
export async function updateNote(
  id: string,
  patch: Partial<Note>,
  currentNote: Note,
): Promise<void> {
  const updated: Note = { ...currentNote, ...patch };

  await localDb.notes.put(updated);
  await syncEngine.enqueue(
    'notes',
    id,
    'update',
    patch as unknown as Record<string, unknown>,
  );

  if (syncEngine.isOnline) {
    syncEngine.pushChanges().catch(() => {});
  }
}

/**
 * Soft-delete a note by setting `is_deleted: true` in localDb and enqueueing
 * the deletion for Supabase sync.
 */
export async function deleteNote(id: string, currentNote: Note): Promise<void> {
  await localDb.notes.put({ ...currentNote, is_deleted: true });
  await syncEngine.enqueue('notes', id, 'delete', { is_deleted: true });
  if (syncEngine.isOnline) {
    syncEngine.pushChanges().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

/**
 * Load all folders for the given user.
 * Tries Supabase first; on failure falls back to the local IndexedDB cache.
 *
 * Note: Folder has no `is_deleted` field, so no deleted filter is applied.
 */
export async function loadFolders(userId: string): Promise<Folder[]> {
  try {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const folders = data as Folder[];

    await localDb.folders.bulkPut(folders);

    return folders;
  } catch {
    return localDb.folders
      .where('user_id')
      .equals(userId)
      .toArray();
  }
}

/**
 * Persist a new folder to localDb and enqueue it for Supabase sync.
 */
export async function createFolder(folder: Folder): Promise<void> {
  await localDb.folders.put(folder);
  await syncEngine.enqueue(
    'folders',
    folder.id,
    'create',
    folder as unknown as Record<string, unknown>,
  );
}

/**
 * Apply a partial update to a folder in localDb and enqueue the patch for sync.
 * Immediately attempts to push if the device is online.
 */
export async function updateFolder(
  id: string,
  patch: Partial<Folder>,
  current: Folder,
): Promise<void> {
  const updated: Folder = { ...current, ...patch };

  await localDb.folders.put(updated);
  await syncEngine.enqueue(
    'folders',
    id,
    'update',
    patch as unknown as Record<string, unknown>,
  );

  if (syncEngine.isOnline) {
    syncEngine.pushChanges().catch(() => {});
  }
}

/**
 * Hard-delete a folder from localDb and enqueue the deletion for Supabase sync.
 *
 * Folders have no `is_deleted` column, so we remove the row locally and send
 * a `delete` operation which the sync engine maps to a Supabase soft-delete
 * via `{ is_deleted: true }` if the server schema supports it, or the server
 * can handle a hard delete.  The payload `{ is_deleted: true }` is the
 * canonical pattern used by SyncEngine.pushSingleChange for 'delete' ops.
 */
export async function deleteFolder(id: string): Promise<void> {
  await localDb.folders.delete(id);
  await syncEngine.enqueue('folders', id, 'delete', { is_deleted: true });
}

// ---------------------------------------------------------------------------
// Todos
// ---------------------------------------------------------------------------

/**
 * Load all non-deleted todos for the given user.
 * Tries Supabase first; on failure falls back to the local IndexedDB cache.
 */
export async function loadTodos(userId: string): Promise<Todo[]> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (error) throw error;

    const todos = data as Todo[];

    await localDb.todos.bulkPut(todos);

    return todos;
  } catch {
    return localDb.todos
      .where('user_id')
      .equals(userId)
      .filter((t) => !t.is_deleted)
      .toArray();
  }
}

/**
 * Persist a new todo to localDb and enqueue it for Supabase sync.
 */
export async function createTodo(todo: Todo): Promise<void> {
  await localDb.todos.put(todo);
  await syncEngine.enqueue(
    'todos',
    todo.id,
    'create',
    todo as unknown as Record<string, unknown>,
  );
}

/**
 * Apply a partial update to a todo in localDb and enqueue the patch for sync.
 * Immediately attempts to push if the device is online.
 */
export async function updateTodo(
  id: string,
  patch: Partial<Todo>,
  current: Todo,
): Promise<void> {
  const updated: Todo = { ...current, ...patch };

  await localDb.todos.put(updated);
  await syncEngine.enqueue(
    'todos',
    id,
    'update',
    patch as unknown as Record<string, unknown>,
  );

  if (syncEngine.isOnline) {
    syncEngine.pushChanges().catch(() => {});
  }
}

/**
 * Soft-delete a todo by setting `is_deleted: true` in localDb and enqueueing
 * the deletion for Supabase sync.
 */
export async function deleteTodo(id: string, current: Todo): Promise<void> {
  await localDb.todos.put({ ...current, is_deleted: true });
  await syncEngine.enqueue('todos', id, 'delete', { is_deleted: true });
}

// ---------------------------------------------------------------------------
// Calendar Events
// ---------------------------------------------------------------------------

/**
 * Load all non-deleted calendar events for the given user.
 * Tries Supabase first; on failure falls back to the local IndexedDB cache.
 */
export async function loadCalendarEvents(
  userId: string,
): Promise<CalendarEvent[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (error) throw error;

    const events = data as CalendarEvent[];

    // localDb uses the camelCase table name `calendarEvents`.
    await localDb.calendarEvents.bulkPut(events);

    return events;
  } catch {
    return localDb.calendarEvents
      .where('user_id')
      .equals(userId)
      .filter((e) => !e.is_deleted)
      .toArray();
  }
}

/**
 * Persist a new calendar event to localDb and enqueue it for Supabase sync.
 */
export async function createCalendarEvent(event: CalendarEvent): Promise<void> {
  await localDb.calendarEvents.put(event);
  await syncEngine.enqueue(
    'calendar_events',
    event.id,
    'create',
    event as unknown as Record<string, unknown>,
  );
}

/**
 * Apply a partial update to a calendar event in localDb and enqueue the patch
 * for sync.  Immediately attempts to push if the device is online.
 */
export async function updateCalendarEvent(
  id: string,
  patch: Partial<CalendarEvent>,
  current: CalendarEvent,
): Promise<void> {
  const updated: CalendarEvent = { ...current, ...patch };

  await localDb.calendarEvents.put(updated);
  await syncEngine.enqueue(
    'calendar_events',
    id,
    'update',
    patch as unknown as Record<string, unknown>,
  );

  if (syncEngine.isOnline) {
    syncEngine.pushChanges().catch(() => {});
  }
}

/**
 * Soft-delete a calendar event by setting `is_deleted: true` in localDb and
 * enqueueing the deletion for Supabase sync.
 */
export async function deleteCalendarEvent(
  id: string,
  current: CalendarEvent,
): Promise<void> {
  await localDb.calendarEvents.put({ ...current, is_deleted: true });
  await syncEngine.enqueue(
    'calendar_events',
    id,
    'delete',
    { is_deleted: true },
  );
}
