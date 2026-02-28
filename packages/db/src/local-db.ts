import Dexie, { type Table } from 'dexie';
import type {
  Note,
  Folder,
  Todo,
  CalendarEvent,
  Attachment,
  SyncQueueItem,
} from './types';

// ---------------------------------------------------------------------------
// Local IndexedDB database via Dexie
// ---------------------------------------------------------------------------

export class TodomeLocalDB extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  todos!: Table<Todo, string>;
  calendarEvents!: Table<CalendarEvent, string>;
  attachments!: Table<Attachment, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('todome');

    this.version(1).stores({
      // Primary key first, then indexed fields.
      // Multi-entry indexes prefixed with *.
      notes:
        'id, user_id, folder_id, *tags, is_pinned, is_archived, is_deleted, updated_at',
      folders:
        'id, user_id, parent_id, sort_order',
      todos:
        'id, user_id, status, priority, due_date, *tags, sort_order, is_deleted, updated_at',
      calendarEvents:
        'id, user_id, start_at, end_at, repeat_parent_id, is_deleted, updated_at',
      attachments:
        'id, user_id, [parent_type+parent_id]',
      syncQueue:
        '++id, table, record_id, timestamp',
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

export const localDb = new TodomeLocalDB();
