// ---------------------------------------------------------------------------
// Todome – Offline operations queue
//
// Separate Dexie instance from the read cache. Stores pending mutations
// that were made while offline, to be flushed FIFO on reconnect.
// ---------------------------------------------------------------------------

import Dexie, { type EntityTable } from 'dexie';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TableName =
  | 'notes'
  | 'folders'
  | 'todos'
  | 'todo_lists'
  | 'calendar_events'
  | 'diaries';

export type OperationType = 'create' | 'update' | 'delete';

export interface PendingOperation {
  id?: number; // auto-increment
  user_id: string;
  table_name: TableName;
  operation: OperationType;
  entity_id: string;
  payload: Record<string, unknown>;
  queued_at: string; // ISO timestamp
  attempt_count: number;
  last_error: string | null;
  is_dead: boolean;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const queueDb = new Dexie('todome-offline-queue') as Dexie & {
  pending_ops: EntityTable<PendingOperation, 'id'>;
};

queueDb.version(1).stores({
  pending_ops: '++id, user_id, [table_name+entity_id+operation]',
});

// ---------------------------------------------------------------------------
// Guard: only run in browser
// ---------------------------------------------------------------------------

const isBrowser = typeof window !== 'undefined';

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Enqueue a pending operation. For 'update' operations, upserts by
 * table_name + entity_id to collapse rapid edits into a single queued op.
 */
export async function enqueueOperation(
  op: Omit<PendingOperation, 'id' | 'attempt_count' | 'last_error' | 'is_dead'>,
): Promise<void> {
  if (!isBrowser) return;
  try {
    if (op.operation === 'update') {
      // Upsert: replace existing pending update for same entity
      const existing = await queueDb.pending_ops
        .where('[table_name+entity_id+operation]')
        .equals([op.table_name, op.entity_id, 'update'])
        .first();

      if (existing) {
        await queueDb.pending_ops.update(existing.id!, {
          payload: { ...existing.payload, ...op.payload },
          queued_at: op.queued_at,
        });
        return;
      }
    }

    await queueDb.pending_ops.add({
      ...op,
      attempt_count: 0,
      last_error: null,
      is_dead: false,
    });
  } catch {
    // Queue failure is non-critical — the online mutation will handle it
  }
}

/** Get all pending ops for a user, ordered FIFO, excluding dead letters. */
export async function getPendingOps(
  userId: string,
): Promise<PendingOperation[]> {
  if (!isBrowser) return [];
  try {
    return await queueDb.pending_ops
      .where('user_id')
      .equals(userId)
      .filter((op) => !op.is_dead)
      .sortBy('id');
  } catch {
    return [];
  }
}

/** Count non-dead pending ops for a user. */
export async function getPendingCount(userId: string): Promise<number> {
  if (!isBrowser) return 0;
  try {
    return await queueDb.pending_ops
      .where('user_id')
      .equals(userId)
      .filter((op) => !op.is_dead)
      .count();
  } catch {
    return 0;
  }
}

/** Delete a successfully flushed operation. */
export async function deleteOperation(id: number): Promise<void> {
  if (!isBrowser) return;
  try {
    await queueDb.pending_ops.delete(id);
  } catch {
    // Non-critical
  }
}

/**
 * Mark an operation as failed. Increments attempt_count and records the error.
 * After 5 failed attempts, marks as dead letter.
 */
export async function markOperationFailed(
  id: number,
  error: string,
): Promise<void> {
  if (!isBrowser) return;
  try {
    const op = await queueDb.pending_ops.get(id);
    if (!op) return;

    const newCount = op.attempt_count + 1;
    await queueDb.pending_ops.update(id, {
      attempt_count: newCount,
      last_error: error,
      is_dead: newCount >= 5,
    });
  } catch {
    // Non-critical
  }
}

/** Clear all pending ops for a user (including dead letters). */
export async function clearUserQueue(userId: string): Promise<void> {
  if (!isBrowser) return;
  try {
    await queueDb.pending_ops.where('user_id').equals(userId).delete();
  } catch {
    // Non-critical
  }
}
