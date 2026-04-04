// ---------------------------------------------------------------------------
// Todome – Queue flush engine
//
// Processes pending offline operations FIFO, calling the appropriate
// repository functions. Stops on first failure (fail-fast).
// ---------------------------------------------------------------------------

import {
  getPendingOps,
  deleteOperation,
  markOperationFailed,
} from './offline-queue';
import type { TableName, OperationType } from './offline-queue';
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
// Types
// ---------------------------------------------------------------------------

export interface FlushResult {
  flushed: number;
  failed: number;
  errors: string[];
  affectedTables: string[];
}

// ---------------------------------------------------------------------------
// Repository dispatch
// ---------------------------------------------------------------------------

type RepoFn = (payload: Record<string, unknown>) => Promise<void>;

function getRepoFn(
  table: TableName,
  operation: OperationType,
): RepoFn {
  const dispatch: Record<TableName, Record<OperationType, RepoFn>> = {
    notes: {
      create: (p) => createNote(p as unknown as Note),
      update: (p) => {
        const { id, ...patch } = p;
        return updateNote(id as string, patch as Partial<Note>);
      },
      delete: (p) => deleteNote(p.id as string),
    },
    folders: {
      create: (p) => createFolder(p as unknown as Folder),
      update: (p) => {
        const { id, ...patch } = p;
        return updateFolder(id as string, patch as Partial<Folder>);
      },
      delete: (p) => deleteFolder(p.id as string),
    },
    todos: {
      create: (p) => createTodo(p as unknown as Todo),
      update: (p) => {
        const { id, ...patch } = p;
        return updateTodo(id as string, patch as Partial<Todo>);
      },
      delete: (p) => deleteTodo(p.id as string),
    },
    todo_lists: {
      create: (p) => createTodoList(p as unknown as TodoList),
      update: (p) => {
        const { id, ...patch } = p;
        return updateTodoList(id as string, patch as Partial<TodoList>);
      },
      delete: (p) => deleteTodoList(p.id as string),
    },
    calendar_events: {
      create: (p) => createCalendarEvent(p as unknown as CalendarEvent),
      update: (p) => {
        const { id, ...patch } = p;
        return updateCalendarEvent(
          id as string,
          patch as Partial<CalendarEvent>,
        );
      },
      delete: (p) => deleteCalendarEvent(p.id as string),
    },
    diaries: {
      create: (p) => createDiary(p as unknown as Diary),
      update: (p) => {
        const { id, ...patch } = p;
        return updateDiary(id as string, patch as Partial<Diary>);
      },
      delete: (p) => deleteDiary(p.id as string),
    },
  };

  return dispatch[table][operation];
}

// ---------------------------------------------------------------------------
// Flush
// ---------------------------------------------------------------------------

/**
 * Flush all pending operations for a user, processing FIFO.
 * Stops on the first failure (fail-fast).
 *
 * @param userId - The user whose queue to flush
 * @param onSuccess - Called with affected table names when all ops flush
 */
export async function flushQueue(
  userId: string,
  onSuccess?: (affectedTables: string[]) => void,
): Promise<FlushResult> {
  const ops = await getPendingOps(userId);
  const result: FlushResult = {
    flushed: 0,
    failed: 0,
    errors: [],
    affectedTables: [],
  };

  if (ops.length === 0) return result;

  const affectedSet = new Set<string>();

  for (const op of ops) {
    try {
      const fn = getRepoFn(op.table_name, op.operation);
      await fn(op.payload);
      await deleteOperation(op.id!);
      result.flushed++;
      affectedSet.add(op.table_name);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      await markOperationFailed(op.id!, message);
      result.failed++;
      result.errors.push(message);
      // Fail-fast: stop processing on first failure
      break;
    }
  }

  result.affectedTables = Array.from(affectedSet);

  if (result.affectedTables.length > 0 && onSuccess) {
    onSuccess(result.affectedTables);
  }

  return result;
}
