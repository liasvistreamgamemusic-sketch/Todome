import { useEffect, useState } from 'react';
import { supabase, localDb, syncEngine } from '@todome/db';
import type { Note, Folder, Todo, CalendarEvent } from '@todome/db';
import { useNoteStore, useTodoStore, useCalendarStore } from '@todome/store';

export type DataProviderState = {
  isLoading: boolean;
  error: Error | null;
};

// ---------------------------------------------------------------------------
// Phase 1: Instant load from IndexedDB (~10ms)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Phase 2: Background refresh from Supabase with pending-create merge
// ---------------------------------------------------------------------------

/**
 * Merge helper: preserves locally-created items whose push to Supabase
 * has not yet completed (still sitting in the syncQueue).
 */
async function getPendingCreateIds(table: string): Promise<Set<string>> {
  const pending = await localDb.syncQueue
    .filter((item) => item.table === table && item.operation === 'create')
    .toArray();
  return new Set(pending.map((p) => p.record_id));
}

async function refreshFromSupabase(userId: string): Promise<void> {
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

  const supabaseNotes = (notesRes.data ?? []) as unknown as Note[];
  const supabaseFolders = (foldersRes.data ?? []) as unknown as Folder[];
  const supabaseTodos = (todosRes.data ?? []) as unknown as Todo[];
  const supabaseEvents = (eventsRes.data ?? []) as unknown as CalendarEvent[];

  // Merge pending creates that Supabase doesn't know about yet
  const [pendingNoteIds, pendingTodoIds, pendingEventIds] = await Promise.all([
    getPendingCreateIds('notes'),
    getPendingCreateIds('todos'),
    getPendingCreateIds('calendar_events'),
  ]);

  const mergedNotes = await mergeWithPending(supabaseNotes, pendingNoteIds, localDb.notes);
  const mergedTodos = await mergeWithPending(supabaseTodos, pendingTodoIds, localDb.todos);
  const mergedEvents = await mergeWithPending(supabaseEvents, pendingEventIds, localDb.calendarEvents);

  // Cache Supabase results in IndexedDB (best-effort)
  await Promise.all([
    supabaseNotes.length > 0 ? localDb.notes.bulkPut(supabaseNotes) : Promise.resolve(),
    supabaseFolders.length > 0 ? localDb.folders.bulkPut(supabaseFolders) : Promise.resolve(),
    supabaseTodos.length > 0 ? localDb.todos.bulkPut(supabaseTodos) : Promise.resolve(),
    supabaseEvents.length > 0 ? localDb.calendarEvents.bulkPut(supabaseEvents) : Promise.resolve(),
  ]);

  // Update Zustand stores with merged data
  useNoteStore.getState().setNotes(mergedNotes);
  useNoteStore.getState().setFolders(supabaseFolders);
  useTodoStore.getState().setTodos(mergedTodos);
  useCalendarStore.getState().setEvents(mergedEvents);
}

async function mergeWithPending<T extends { id: string; is_deleted?: boolean }>(
  remoteItems: T[],
  pendingCreateIds: Set<string>,
  dexieTable: { where: (key: string) => { anyOf: (ids: string[]) => { toArray: () => Promise<T[]> } } },
): Promise<T[]> {
  if (pendingCreateIds.size === 0) return remoteItems;

  const remoteIds = new Set(remoteItems.map((item) => item.id));
  // Items in syncQueue but not yet on Supabase
  const missingIds = [...pendingCreateIds].filter((id) => !remoteIds.has(id));
  if (missingIds.length === 0) return remoteItems;

  const pendingItems = await dexieTable.where('id').anyOf(missingIds).toArray();
  return [
    ...remoteItems,
    ...pendingItems.filter((item) => !item.is_deleted),
  ];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Local-first data provider: shows IndexedDB data instantly, then
 * refreshes from Supabase in the background.
 * Route protection is handled by middleware — this hook only loads data.
 */
export function useDataProvider(): DataProviderState {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialize(): Promise<void> {
      try {
        // Phase 1: Show cached data instantly
        await loadFromLocalDb();
        if (cancelled) return;
        setIsLoading(false);

        // Phase 2: Background sync with Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled || !session?.user) return;

        const userId = session.user.id;

        // Push pending changes first (prevents ghost items on pull)
        if (syncEngine.isOnline) {
          await syncEngine.pushChanges().catch(() => {});
        }
        if (cancelled) return;

        // Pull fresh data and merge with any remaining pending creates
        await refreshFromSupabase(userId);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
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

    // Sync every 30s: push local changes, then refresh stores from Supabase
    const interval = setInterval(async () => {
      if (!syncEngine.isOnline || syncEngine.isSyncing) return;
      await syncEngine.pushChanges().catch(() => {});
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await refreshFromSupabase(session.user.id).catch(() => {});
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
