import type { Note } from '@todome/db';
import type { NoteFilter } from '@todome/store';

export type NoteSortBy = 'updated_at' | 'created_at' | 'title' | 'manual';

function sortNotes(notes: Note[], sortBy: NoteSortBy): Note[] {
  const sorted = [...notes];
  switch (sortBy) {
    case 'updated_at':
      return sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    case 'created_at':
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'manual':
      return sorted;
  }
}

export function filterAndSortNotes(
  notes: Note[],
  opts: {
    folderId: string | null;
    searchQuery: string;
    sortBy: NoteSortBy;
    noteFilter?: NoteFilter;
  },
): Note[] {
  const query = opts.searchQuery.toLowerCase().trim();
  const filter = opts.noteFilter ?? 'active';

  let filtered: Note[];
  switch (filter) {
    case 'archived':
      filtered = notes.filter((n) => n.is_archived && !n.is_deleted);
      break;
    default:
      filtered = notes.filter((n) => !n.is_deleted && !n.is_archived);
      break;
  }

  if (filter === 'active' && opts.folderId !== null) {
    filtered = filtered.filter((n) => n.folder_id === opts.folderId);
  }

  if (query) {
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        (n.plain_text ?? '').toLowerCase().includes(query) ||
        n.tags.some((t) => t.toLowerCase().includes(query)),
    );
  }

  const pinned = filtered.filter((n) => n.is_pinned);
  const unpinned = filtered.filter((n) => !n.is_pinned);

  return [...sortNotes(pinned, opts.sortBy), ...sortNotes(unpinned, opts.sortBy)];
}
