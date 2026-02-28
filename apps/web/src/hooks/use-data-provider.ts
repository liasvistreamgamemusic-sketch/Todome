import { useEffect, useState } from 'react';
import { supabase, localDb, syncEngine } from '@todome/db';
import type { Note, Folder, Todo, CalendarEvent } from '@todome/db';
import { useNoteStore, useTodoStore, useCalendarStore } from '@todome/store';

export type DataProviderState = {
  isLoading: boolean;
  error: Error | null;
};

async function loadFromSupabase(userId: string): Promise<void> {
  const [notesRes, foldersRes, todosRes, eventsRes] = await Promise.all([
    supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false }),
    supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order'),
    supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('sort_order'),
    supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('start_at'),
  ]);

  // Cache in localDb (best-effort — do not block store hydration on failure)
  await Promise.all([
    notesRes.data ? localDb.notes.bulkPut(notesRes.data as unknown as Note[]) : Promise.resolve(),
    foldersRes.data ? localDb.folders.bulkPut(foldersRes.data as unknown as Folder[]) : Promise.resolve(),
    todosRes.data ? localDb.todos.bulkPut(todosRes.data as unknown as Todo[]) : Promise.resolve(),
    eventsRes.data ? localDb.calendarEvents.bulkPut(eventsRes.data as unknown as CalendarEvent[]) : Promise.resolve(),
  ]);

  // Hydrate Zustand stores
  if (notesRes.data) useNoteStore.getState().setNotes(notesRes.data as unknown as Note[]);
  if (foldersRes.data) useNoteStore.getState().setFolders(foldersRes.data as unknown as Folder[]);
  if (todosRes.data) useTodoStore.getState().setTodos(todosRes.data as unknown as Todo[]);
  if (eventsRes.data) useCalendarStore.getState().setEvents(eventsRes.data as unknown as CalendarEvent[]);
}

async function loadFromLocalDb(): Promise<void> {
  const [notes, folders, todos, events] = await Promise.all([
    localDb.notes.filter((n) => !n.is_deleted).toArray(),
    localDb.folders.toArray(),
    localDb.todos.filter((t) => !t.is_deleted).toArray(),
    localDb.calendarEvents.filter((e) => !e.is_deleted).toArray(),
  ]);

  useNoteStore.getState().setNotes(notes);
  useNoteStore.getState().setFolders(folders);
  useTodoStore.getState().setTodos(todos);
  useCalendarStore.getState().setEvents(events);
}

/**
 * Loads data from Supabase on mount and syncs local changes every 30s.
 * Route protection is handled by middleware — this hook only loads data.
 */
export function useDataProvider(): DataProviderState {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialize(): Promise<void> {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) return;

        // Flush pending local changes before fetching fresh data
        if (syncEngine.isOnline) {
          await syncEngine.pushChanges().catch(() => {});
        }

        try {
          await loadFromSupabase(user.id);
        } catch {
          // Supabase unavailable (offline or misconfigured) — serve from local cache
          await loadFromLocalDb();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    // Listen for auth state changes (logout, token expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login';
      }
    });

    // Push queued local changes every 30s when online and not already syncing
    const interval = setInterval(() => {
      if (syncEngine.isOnline && !syncEngine.isSyncing) {
        syncEngine.pushChanges().catch(() => {});
      }
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  return { isLoading, error };
}
