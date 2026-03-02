import type { Note } from '@todome/db';

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
  },
): Note[] {
  const query = opts.searchQuery.toLowerCase().trim();

  let filtered = notes.filter((n) => !n.is_deleted && !n.is_archived);

  if (opts.folderId !== null) {
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
