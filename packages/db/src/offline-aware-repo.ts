// ---------------------------------------------------------------------------
// Todome – Offline-aware repository wrappers
//
// Wraps each mutation: online → direct Supabase call, offline → enqueue.
// Shared calendars are excluded (multi-user).
// ---------------------------------------------------------------------------

import { enqueueOperation } from './offline-queue';
import {
  createNote,
  updateNote,
  deleteNote,
  createFolder,
  updateFolder,
  deleteFolder,
  createTodo,
  updateTodo,
  deleteTodo,
  createTodoList,
  updateTodoList,
  deleteTodoList,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  createDiary,
  updateDiary,
  deleteDiary,
} from './repository';
import type {
  Note,
  Folder,
  Todo,
  TodoList,
  CalendarEvent,
  Diary,
} from './types';

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function offlineCreateNote(
  isOnline: boolean,
  note: Note,
): Promise<void> {
  if (isOnline) return createNote(note);
  await enqueueOperation({
    user_id: note.user_id,
    table_name: 'notes',
    operation: 'create',
    entity_id: note.id,
    payload: note as unknown as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineUpdateNote(
  isOnline: boolean,
  id: string,
  patch: Partial<Note>,
  userId: string,
): Promise<void> {
  if (isOnline) return updateNote(id, patch);
  await enqueueOperation({
    user_id: userId,
    table_name: 'notes',
    operation: 'update',
    entity_id: id,
    payload: { id, ...patch } as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineDeleteNote(
  isOnline: boolean,
  id: string,
  userId: string,
): Promise<void> {
  if (isOnline) return deleteNote(id);
  await enqueueOperation({
    user_id: userId,
    table_name: 'notes',
    operation: 'delete',
    entity_id: id,
    payload: { id },
    queued_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export async function offlineCreateFolder(
  isOnline: boolean,
  folder: Folder,
): Promise<void> {
  if (isOnline) return createFolder(folder);
  await enqueueOperation({
    user_id: folder.user_id,
    table_name: 'folders',
    operation: 'create',
    entity_id: folder.id,
    payload: folder as unknown as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineUpdateFolder(
  isOnline: boolean,
  id: string,
  patch: Partial<Folder>,
  userId: string,
): Promise<void> {
  if (isOnline) return updateFolder(id, patch);
  await enqueueOperation({
    user_id: userId,
    table_name: 'folders',
    operation: 'update',
    entity_id: id,
    payload: { id, ...patch } as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineDeleteFolder(
  isOnline: boolean,
  id: string,
  userId: string,
): Promise<void> {
  if (isOnline) return deleteFolder(id);
  await enqueueOperation({
    user_id: userId,
    table_name: 'folders',
    operation: 'delete',
    entity_id: id,
    payload: { id },
    queued_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Todos
// ---------------------------------------------------------------------------

export async function offlineCreateTodo(
  isOnline: boolean,
  todo: Todo,
): Promise<void> {
  if (isOnline) return createTodo(todo);
  await enqueueOperation({
    user_id: todo.user_id,
    table_name: 'todos',
    operation: 'create',
    entity_id: todo.id,
    payload: todo as unknown as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineUpdateTodo(
  isOnline: boolean,
  id: string,
  patch: Partial<Todo>,
  userId: string,
): Promise<void> {
  if (isOnline) return updateTodo(id, patch);
  await enqueueOperation({
    user_id: userId,
    table_name: 'todos',
    operation: 'update',
    entity_id: id,
    payload: { id, ...patch } as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineDeleteTodo(
  isOnline: boolean,
  id: string,
  userId: string,
): Promise<void> {
  if (isOnline) return deleteTodo(id);
  await enqueueOperation({
    user_id: userId,
    table_name: 'todos',
    operation: 'delete',
    entity_id: id,
    payload: { id },
    queued_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Todo Lists
// ---------------------------------------------------------------------------

export async function offlineCreateTodoList(
  isOnline: boolean,
  list: TodoList,
): Promise<void> {
  if (isOnline) return createTodoList(list);
  await enqueueOperation({
    user_id: list.user_id,
    table_name: 'todo_lists',
    operation: 'create',
    entity_id: list.id,
    payload: list as unknown as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineUpdateTodoList(
  isOnline: boolean,
  id: string,
  patch: Partial<TodoList>,
  userId: string,
): Promise<void> {
  if (isOnline) return updateTodoList(id, patch);
  await enqueueOperation({
    user_id: userId,
    table_name: 'todo_lists',
    operation: 'update',
    entity_id: id,
    payload: { id, ...patch } as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineDeleteTodoList(
  isOnline: boolean,
  id: string,
  userId: string,
): Promise<void> {
  if (isOnline) return deleteTodoList(id);
  await enqueueOperation({
    user_id: userId,
    table_name: 'todo_lists',
    operation: 'delete',
    entity_id: id,
    payload: { id },
    queued_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Calendar Events
// ---------------------------------------------------------------------------

export async function offlineCreateCalendarEvent(
  isOnline: boolean,
  event: CalendarEvent,
): Promise<void> {
  if (isOnline) return createCalendarEvent(event);
  await enqueueOperation({
    user_id: event.user_id,
    table_name: 'calendar_events',
    operation: 'create',
    entity_id: event.id,
    payload: event as unknown as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineUpdateCalendarEvent(
  isOnline: boolean,
  id: string,
  patch: Partial<CalendarEvent>,
  userId: string,
): Promise<void> {
  if (isOnline) return updateCalendarEvent(id, patch);
  await enqueueOperation({
    user_id: userId,
    table_name: 'calendar_events',
    operation: 'update',
    entity_id: id,
    payload: { id, ...patch } as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineDeleteCalendarEvent(
  isOnline: boolean,
  id: string,
  userId: string,
): Promise<void> {
  if (isOnline) return deleteCalendarEvent(id);
  await enqueueOperation({
    user_id: userId,
    table_name: 'calendar_events',
    operation: 'delete',
    entity_id: id,
    payload: { id },
    queued_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Diaries
// ---------------------------------------------------------------------------

export async function offlineCreateDiary(
  isOnline: boolean,
  diary: Diary,
): Promise<void> {
  if (isOnline) return createDiary(diary);
  await enqueueOperation({
    user_id: diary.user_id,
    table_name: 'diaries',
    operation: 'create',
    entity_id: diary.id,
    payload: diary as unknown as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineUpdateDiary(
  isOnline: boolean,
  id: string,
  patch: Partial<Diary>,
  userId: string,
): Promise<void> {
  if (isOnline) return updateDiary(id, patch);
  await enqueueOperation({
    user_id: userId,
    table_name: 'diaries',
    operation: 'update',
    entity_id: id,
    payload: { id, ...patch } as Record<string, unknown>,
    queued_at: new Date().toISOString(),
  });
}

export async function offlineDeleteDiary(
  isOnline: boolean,
  id: string,
  userId: string,
): Promise<void> {
  if (isOnline) return deleteDiary(id);
  await enqueueOperation({
    user_id: userId,
    table_name: 'diaries',
    operation: 'delete',
    entity_id: id,
    payload: { id },
    queued_at: new Date().toISOString(),
  });
}
