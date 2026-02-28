import type { Table } from 'dexie';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { localDb } from './local-db';
import type {
  Note,
  Folder,
  Todo,
  CalendarEvent,
  Attachment,
  SyncQueueItem,
  SyncableTable,
  Result,
} from './types';
import { Ok, Err, SYNCABLE_TABLES } from './types';

/**
 * Untyped Supabase client reference.
 *
 * When the table name is a runtime-dynamic union (`SyncableTable`), the
 * generated Database generic collapses to `never` for insert / update calls.
 * Casting to the base `SupabaseClient` (without the Database generic) lets
 * the PostgREST builder accept `Record<string, unknown>` payloads.
 *
 * This is safe because the sync queue already stores pre-validated data and
 * Supabase enforces the real schema on the server side.
 */
const untypedSupabase = supabase as unknown as SupabaseClient;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type SyncableRow = Note | Folder | Todo | CalendarEvent | Attachment;

/** Map SyncableTable name to the corresponding Dexie table. */
const getDexieTable = (
  tableName: SyncableTable,
): Table<SyncableRow, string> => {
  const map: Record<SyncableTable, Table<SyncableRow, string>> = {
    notes: localDb.notes as unknown as Table<SyncableRow, string>,
    folders: localDb.folders as unknown as Table<SyncableRow, string>,
    todos: localDb.todos as unknown as Table<SyncableRow, string>,
    calendar_events:
      localDb.calendarEvents as unknown as Table<SyncableRow, string>,
    attachments: localDb.attachments as unknown as Table<SyncableRow, string>,
  };
  return map[tableName];
};

/**
 * Determine if a remote row is newer than the local one using `updated_at`.
 * Returns `true` when the remote row should overwrite the local row.
 */
const isRemoteNewer = (
  remote: Record<string, unknown>,
  local: Record<string, unknown> | undefined,
): boolean => {
  if (!local) return true;
  const remoteDate = remote['updated_at'] ?? remote['created_at'];
  const localDate = local['updated_at'] ?? local['created_at'];
  if (typeof remoteDate !== 'string' || typeof localDate !== 'string') {
    return true;
  }
  return new Date(remoteDate).getTime() >= new Date(localDate).getTime();
};

const LAST_SYNC_PREFIX = 'todome_last_sync_';

const getLastSyncTime = (table: SyncableTable): string | null => {
  if (typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage.getItem(`${LAST_SYNC_PREFIX}${table}`);
};

const setLastSyncTime = (table: SyncableTable, iso: string): void => {
  if (typeof globalThis.localStorage === 'undefined') return;
  globalThis.localStorage.setItem(`${LAST_SYNC_PREFIX}${table}`, iso);
};

// ---------------------------------------------------------------------------
// SyncEngine
// ---------------------------------------------------------------------------

export class SyncEngine {
  private _online: boolean;
  private _syncInProgress = false;
  private _cleanupListeners: (() => void)[] = [];

  constructor() {
    this._online =
      typeof globalThis.navigator !== 'undefined'
        ? globalThis.navigator.onLine
        : true;

    if (typeof globalThis.window !== 'undefined') {
      const onOnline = (): void => {
        this._online = true;
      };
      const onOffline = (): void => {
        this._online = false;
      };
      globalThis.window.addEventListener('online', onOnline);
      globalThis.window.addEventListener('offline', onOffline);

      this._cleanupListeners.push(() => {
        globalThis.window.removeEventListener('online', onOnline);
        globalThis.window.removeEventListener('offline', onOffline);
      });
    }
  }

  /** Whether the browser currently reports an active network connection. */
  get isOnline(): boolean {
    return this._online;
  }

  /** Whether a sync cycle is currently running. */
  get isSyncing(): boolean {
    return this._syncInProgress;
  }

  // -----------------------------------------------------------------------
  // Push local changes to Supabase
  // -----------------------------------------------------------------------

  async pushChanges(): Promise<Result<number>> {
    if (!this._online) {
      return Err(new Error('Device is offline'));
    }

    try {
      const pending = await localDb.syncQueue.toArray();
      if (pending.length === 0) return Ok(0);

      let pushed = 0;

      for (const item of pending) {
        const result = await this.pushSingleChange(item);
        if (result.ok) {
          await localDb.syncQueue.delete(item.id as number);
          pushed++;
        } else {
          // Stop on first failure to preserve ordering guarantees.
          return Err(result.error);
        }
      }

      return Ok(pushed);
    } catch (err) {
      return Err(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private async pushSingleChange(
    item: SyncQueueItem,
  ): Promise<Result<void>> {
    const { table, record_id, operation, data } = item;

    try {
      switch (operation) {
        case 'create': {
          const { error } = await untypedSupabase
            .from(table)
            .insert(data);
          if (error) return Err(new Error(error.message));
          break;
        }
        case 'update': {
          const { error } = await untypedSupabase
            .from(table)
            .update(data)
            .eq('id', record_id);
          if (error) return Err(new Error(error.message));
          break;
        }
        case 'delete': {
          const { error } = await untypedSupabase
            .from(table)
            .update({ is_deleted: true })
            .eq('id', record_id);
          if (error) return Err(new Error(error.message));
          break;
        }
      }

      return Ok(undefined);
    } catch (err) {
      return Err(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // -----------------------------------------------------------------------
  // Pull remote changes into Dexie
  // -----------------------------------------------------------------------

  async pullChanges(
    table: SyncableTable,
    since?: string | null,
  ): Promise<Result<number>> {
    if (!this._online) {
      return Err(new Error('Device is offline'));
    }

    try {
      let query = untypedSupabase.from(table).select('*');
      if (since) {
        query = query.gt('updated_at', since);
      }

      // Attachments do not have updated_at, order by created_at instead.
      const orderCol = table === 'attachments' ? 'created_at' : 'updated_at';
      query = query.order(orderCol, { ascending: true });

      const { data, error } = await query;
      if (error) return Err(new Error(error.message));
      if (!data || data.length === 0) return Ok(0);

      const dexieTable = getDexieTable(table);
      let upserted = 0;

      for (const remoteRow of data) {
        const remote = remoteRow as unknown as Record<string, unknown>;
        const id = remote['id'] as string;
        const local = (await dexieTable.get(id)) as
          | Record<string, unknown>
          | undefined;

        if (isRemoteNewer(remote, local)) {
          await dexieTable.put(remote as unknown as SyncableRow);
          upserted++;
        }
      }

      // Persist the most recent timestamp so next pull is incremental.
      const lastRow = data[data.length - 1] as unknown as Record<
        string,
        unknown
      >;
      const ts = (lastRow[orderCol] as string) ?? new Date().toISOString();
      setLastSyncTime(table, ts);

      return Ok(upserted);
    } catch (err) {
      return Err(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // -----------------------------------------------------------------------
  // Full sync cycle
  // -----------------------------------------------------------------------

  async sync(): Promise<Result<{ pushed: number; pulled: number }>> {
    if (this._syncInProgress) {
      return Err(new Error('Sync already in progress'));
    }

    if (!this._online) {
      return Err(new Error('Device is offline'));
    }

    this._syncInProgress = true;

    try {
      // 1. Push local changes first to minimise conflict window.
      const pushResult = await this.pushChanges();
      const pushed = pushResult.ok ? pushResult.value : 0;

      // 2. Pull remote changes for every syncable table.
      let totalPulled = 0;
      for (const table of SYNCABLE_TABLES) {
        const since = getLastSyncTime(table);
        const pullResult = await this.pullChanges(table, since);
        if (pullResult.ok) {
          totalPulled += pullResult.value;
        }
      }

      return Ok({ pushed, pulled: totalPulled });
    } catch (err) {
      return Err(err instanceof Error ? err : new Error(String(err)));
    } finally {
      this._syncInProgress = false;
    }
  }

  // -----------------------------------------------------------------------
  // Enqueue a change for later push
  // -----------------------------------------------------------------------

  async enqueue(
    table: SyncableTable,
    recordId: string,
    operation: SyncQueueItem['operation'],
    data: Record<string, unknown>,
  ): Promise<Result<number>> {
    try {
      const id = await localDb.syncQueue.add({
        table,
        record_id: recordId,
        operation,
        data,
        timestamp: new Date().toISOString(),
      });
      return Ok(id);
    } catch (err) {
      return Err(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  destroy(): void {
    for (const cleanup of this._cleanupListeners) {
      cleanup();
    }
    this._cleanupListeners = [];
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const syncEngine = new SyncEngine();
