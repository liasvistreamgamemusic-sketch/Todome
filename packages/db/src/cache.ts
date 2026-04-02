// ---------------------------------------------------------------------------
// Todome – IndexedDB read-only cache layer
//
// Stores copies of Supabase responses for instant display on app startup.
// NEVER used for writes — all mutations go directly to Supabase.
// ---------------------------------------------------------------------------

import Dexie, { type EntityTable } from 'dexie';
import type { Note, NoteSummary, Folder } from './types';

// ---------------------------------------------------------------------------
// Database schema
// ---------------------------------------------------------------------------

interface CachedNote {
  id: string;
  user_id: string;
  title: string;
  content: Note['content'];
  plain_text: string | null;
  folder_id: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

interface CachedFolder {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const db = new Dexie('todome-cache') as Dexie & {
  notes: EntityTable<CachedNote, 'id'>;
  folders: EntityTable<CachedFolder, 'id'>;
};

db.version(1).stores({
  notes: 'id, user_id, folder_id, updated_at',
  folders: 'id, user_id',
});

// ---------------------------------------------------------------------------
// Guard: only run in browser
// ---------------------------------------------------------------------------

const isBrowser = typeof window !== 'undefined';

// ---------------------------------------------------------------------------
// Notes – read
// ---------------------------------------------------------------------------

export async function getCachedNoteSummaries(
  userId: string,
): Promise<NoteSummary[]> {
  if (!isBrowser) return [];
  try {
    const rows = await db.notes
      .where('user_id')
      .equals(userId)
      .filter((n) => !n.is_deleted)
      .reverse()
      .sortBy('updated_at');
    // Strip content to match NoteSummary shape
    return rows.map(({ content: _, ...rest }) => rest);
  } catch {
    return [];
  }
}

export async function getCachedNoteById(id: string): Promise<Note | null> {
  if (!isBrowser) return null;
  try {
    const row = await db.notes.get(id);
    return (row as Note) ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Notes – write (cache update only, NOT Supabase)
// ---------------------------------------------------------------------------

export async function cacheNoteSummaries(
  summaries: NoteSummary[],
  userId: string,
): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.transaction('rw', db.notes, async () => {
      // Collect existing content so we don't lose it when overwriting
      const existing = await db.notes.where('user_id').equals(userId).toArray();
      const contentMap = new Map<string, Note['content']>();
      for (const row of existing) {
        if (row.content) contentMap.set(row.id, row.content);
      }

      // Replace all cached notes for this user (removes deleted ones too)
      await db.notes.where('user_id').equals(userId).delete();
      await db.notes.bulkPut(
        summaries.map((s) => ({
          ...s,
          content: contentMap.get(s.id) ?? null,
        })),
      );
    });
  } catch {
    // Cache failure is non-critical
  }
}

export async function cacheNote(note: Note): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.notes.put(note as CachedNote);
  } catch {
    // Cache failure is non-critical
  }
}

export async function removeCachedNote(id: string): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.notes.delete(id);
  } catch {
    // Cache failure is non-critical
  }
}

// ---------------------------------------------------------------------------
// Folders – read
// ---------------------------------------------------------------------------

export async function getCachedFolders(userId: string): Promise<Folder[]> {
  if (!isBrowser) return [];
  try {
    return (await db.folders
      .where('user_id')
      .equals(userId)
      .sortBy('sort_order')) as Folder[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Folders – write (cache update only)
// ---------------------------------------------------------------------------

export async function cacheFolders(
  folders: Folder[],
  userId: string,
): Promise<void> {
  if (!isBrowser) return;
  try {
    await db.transaction('rw', db.folders, async () => {
      await db.folders.where('user_id').equals(userId).delete();
      await db.folders.bulkPut(folders as CachedFolder[]);
    });
  } catch {
    // Cache failure is non-critical
  }
}
