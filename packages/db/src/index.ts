// ---------------------------------------------------------------------------
// @todome/db – public API
// ---------------------------------------------------------------------------

// Types & constants
export type {
  TiptapDocument,
  TiptapNode,
  TiptapMark,
  TodoPriority,
  TodoStatus,
  ParentType,
  RemindRepeat,
  SyncOperation,
  SyncableTable,
  Result,
  Note,
  Folder,
  Todo,
  CalendarEvent,
  Attachment,
  CreateNoteInput,
  UpdateNoteInput,
  CreateFolderInput,
  UpdateFolderInput,
  CreateTodoInput,
  UpdateTodoInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  CreateAttachmentInput,
  SyncQueueItem,
} from './types';

export {
  TODO_PRIORITIES,
  TODO_STATUSES,
  PARENT_TYPES,
  REMIND_REPEATS,
  SYNC_OPERATIONS,
  SYNCABLE_TABLES,
  Ok,
  Err,
} from './types';

// Supabase
export { supabase } from './supabase';
export type { Database } from './supabase';

// Local DB
export { TodomeLocalDB, localDb } from './local-db';

// Sync engine
export { SyncEngine, syncEngine } from './sync-engine';
