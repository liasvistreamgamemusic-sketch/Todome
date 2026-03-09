// ---------------------------------------------------------------------------
// Todome – Repository layer
//
// Direct Supabase CRUD operations. No local caching.
// ---------------------------------------------------------------------------

import { supabase } from './supabase';
import type {
  Note,
  NoteSummary,
  Folder,
  Todo,
  CalendarEvent,
  CalendarSubscription,
  Diary,
  SharedCalendar,
  SharedCalendarMember,
  SharedCalendarEvent,
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

const NOTE_SUMMARY_COLUMNS = 'id, user_id, title, plain_text, folder_id, is_pinned, is_archived, is_deleted, created_at, updated_at, synced_at';

export async function loadNoteSummaries(userId: string): Promise<NoteSummary[]> {
  const { data, error } = await supabase
    .from('notes')
    .select(NOTE_SUMMARY_COLUMNS)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as NoteSummary[];
}

export async function loadNoteById(id: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Note;
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

// ---------------------------------------------------------------------------
// Diaries
// ---------------------------------------------------------------------------

export async function loadDiaries(userId: string): Promise<Diary[]> {
  const { data, error } = await supabase
    .from('diaries')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('date', { ascending: false });

  if (error) throw error;
  return data as Diary[];
}

export async function createDiary(diary: Diary): Promise<void> {
  const { error } = await supabase.from('diaries').insert(diary as never);
  if (error) throw error;
}

export async function updateDiary(
  id: string,
  patch: Partial<Diary>,
): Promise<void> {
  const { error } = await supabase
    .from('diaries')
    .update(patch as never)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDiary(id: string): Promise<void> {
  const { error } = await supabase
    .from('diaries')
    .update({ is_deleted: true, updated_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Calendar Subscriptions
// ---------------------------------------------------------------------------

export async function loadCalendarSubscriptions(
  userId: string,
): Promise<CalendarSubscription[]> {
  const { data, error } = await supabase
    .from('calendar_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at');

  if (error) throw error;
  return data as CalendarSubscription[];
}

export async function createCalendarSubscription(
  sub: CalendarSubscription,
): Promise<void> {
  const { error } = await supabase
    .from('calendar_subscriptions')
    .insert(sub as never);
  if (error) throw error;
}

export async function updateCalendarSubscription(
  id: string,
  patch: Partial<CalendarSubscription>,
): Promise<void> {
  const { error } = await supabase
    .from('calendar_subscriptions')
    .update(patch as never)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCalendarSubscription(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_subscriptions')
    .update({ is_deleted: true, updated_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Shared Calendars
// ---------------------------------------------------------------------------

export async function loadSharedCalendars(
  userId: string,
): Promise<SharedCalendar[]> {
  const [owned, member] = await Promise.all([
    supabase
      .from('shared_calendars')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at'),
    supabase
      .from('shared_calendar_members')
      .select('shared_calendar_id, shared_calendars(*)')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  if (owned.error) throw owned.error;
  if (member.error) throw member.error;

  const map = new Map<string, SharedCalendar>();
  for (const cal of owned.data as SharedCalendar[]) {
    map.set(cal.id, cal);
  }
  for (const row of member.data as { shared_calendar_id: string; shared_calendars: SharedCalendar }[]) {
    if (row.shared_calendars && !map.has(row.shared_calendar_id)) {
      map.set(row.shared_calendar_id, row.shared_calendars);
    }
  }

  return Array.from(map.values());
}

export async function createSharedCalendar(cal: SharedCalendar): Promise<void> {
  const { error } = await supabase.from('shared_calendars').insert(cal as never);
  if (error) throw error;
}

export async function updateSharedCalendar(
  id: string,
  patch: Partial<SharedCalendar>,
): Promise<void> {
  const { error } = await supabase
    .from('shared_calendars')
    .update(patch as never)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSharedCalendar(id: string): Promise<void> {
  const { error } = await supabase
    .from('shared_calendars')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Shared Calendar Members
// ---------------------------------------------------------------------------

export async function loadSharedCalendarMembers(
  calendarId: string,
): Promise<SharedCalendarMember[]> {
  const { data, error } = await supabase
    .from('shared_calendar_members')
    .select('*')
    .eq('shared_calendar_id', calendarId)
    .order('created_at');

  if (error) throw error;
  return data as SharedCalendarMember[];
}

export async function createInviteToken(
  calendarId: string,
): Promise<SharedCalendarMember> {
  const { data, error } = await supabase
    .from('shared_calendar_members')
    .insert({ shared_calendar_id: calendarId } as never)
    .select('*')
    .single();

  if (error) throw error;
  return data as SharedCalendarMember;
}

export async function claimInvite(
  token: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('shared_calendar_members')
    .update({ user_id: userId, status: 'active' } as never)
    .eq('invite_token', token)
    .is('user_id', null)
    .eq('status', 'pending');
  if (error) throw error;
}

export async function removeSharedCalendarMember(
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from('shared_calendar_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() } as never)
    .eq('id', memberId);
  if (error) throw error;
}

export async function updateMemberVisibility(
  memberId: string,
  isVisible: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('shared_calendar_members')
    .update({ is_visible: isVisible } as never)
    .eq('id', memberId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Shared Calendar Events
// ---------------------------------------------------------------------------

export async function loadSharedCalendarEvents(
  calendarIds: string[],
): Promise<SharedCalendarEvent[]> {
  if (calendarIds.length === 0) return [];

  const { data, error } = await supabase
    .from('shared_calendar_events')
    .select('*')
    .in('shared_calendar_id', calendarIds)
    .eq('is_deleted', false)
    .order('start_at');

  if (error) throw error;
  return data as SharedCalendarEvent[];
}

export async function createSharedCalendarEvent(
  event: SharedCalendarEvent,
): Promise<void> {
  const { error } = await supabase
    .from('shared_calendar_events')
    .insert(event as never);
  if (error) throw error;
}

export async function updateSharedCalendarEvent(
  id: string,
  patch: Partial<SharedCalendarEvent>,
): Promise<void> {
  const { error } = await supabase
    .from('shared_calendar_events')
    .update(patch as never)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSharedCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('shared_calendar_events')
    .update({ is_deleted: true, updated_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw error;
}
