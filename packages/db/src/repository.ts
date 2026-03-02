// ---------------------------------------------------------------------------
// Todome – Repository layer
//
// Direct Supabase CRUD operations. No local caching.
// ---------------------------------------------------------------------------

import { supabase } from './supabase';
import type {
  Note,
  Folder,
  Todo,
  CalendarEvent,
} from './types';

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function loadNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Note[];
}

export async function createNote(note: Note): Promise<void> {
  const { error } = await supabase.from('notes').insert(note as never);
  if (error) throw error;
}

export async function updateNote(
  id: string,
  patch: Partial<Note>,
): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update(patch as never)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ is_deleted: true, updated_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw error;
}

export async function purgeNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export async function loadFolders(userId: string): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order');

  if (error) throw error;
  return data as Folder[];
}

export async function createFolder(folder: Folder): Promise<void> {
  const { error } = await supabase.from('folders').insert(folder as never);
  if (error) throw error;
}

export async function updateFolder(
  id: string,
  patch: Partial<Folder>,
): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .update(patch as never)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Todos
// ---------------------------------------------------------------------------

export async function loadTodos(userId: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('sort_order');

  if (error) throw error;
  return data as Todo[];
}

export async function createTodo(todo: Todo): Promise<void> {
  const { error } = await supabase.from('todos').insert(todo as never);
  if (error) throw error;
}

export async function updateTodo(
  id: string,
  patch: Partial<Todo>,
): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update(patch as never)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update({ is_deleted: true, updated_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Calendar Events
// ---------------------------------------------------------------------------

export async function loadCalendarEvents(
  userId: string,
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('start_at');

  if (error) throw error;
  return data as CalendarEvent[];
}

export async function createCalendarEvent(event: CalendarEvent): Promise<void> {
  const { error } = await supabase.from('calendar_events').insert(event as never);
  if (error) throw error;
}

export async function updateCalendarEvent(
  id: string,
  patch: Partial<CalendarEvent>,
): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .update(patch as never)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .update({ is_deleted: true, updated_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw error;
}
