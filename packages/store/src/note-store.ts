import { create } from 'zustand';
import type { Note, Folder } from './types';

export type NoteSortBy = 'updated_at' | 'created_at' | 'title' | 'manual';
export type NoteViewMode = 'list' | 'card';

export type NoteStoreState = {
  // State
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  viewMode: NoteViewMode;
  sortBy: NoteSortBy;

  // Actions
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  restoreNote: (id: string) => void;

  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, patch: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;

  selectNote: (id: string | null) => void;
  selectFolder: (id: string | null) => void;

  setSearchQuery: (query: string) => void;
  setViewMode: (mode: NoteViewMode) => void;
  setSortBy: (sortBy: NoteSortBy) => void;

  pinNote: (id: string) => void;
  unpinNote: (id: string) => void;
  archiveNote: (id: string) => void;
  unarchiveNote: (id: string) => void;
  moveNoteToFolder: (noteId: string, folderId: string | null) => void;
  purgeIfEmpty: (id: string) => Note | undefined;

  // Computed
  filteredNotes: () => Note[];
};

const sortNotes = (notes: Note[], sortBy: NoteSortBy): Note[] => {
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
};

const patchNote = (notes: Note[], id: string, patch: Partial<Note>): Note[] =>
  notes.map((n) => (n.id === id ? { ...n, ...patch } : n));

export const useNoteStore = create<NoteStoreState>()((set, get) => ({
  // Initial state
  notes: [],
  folders: [],
  selectedNoteId: null,
  selectedFolderId: null,
  searchQuery: '',
  viewMode: 'list',
  sortBy: 'updated_at',

  // Note CRUD
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),
  updateNote: (id, patch) =>
    set((s) => ({ notes: patchNote(s.notes, id, patch) })),
  deleteNote: (id) =>
    set((s) => ({ notes: patchNote(s.notes, id, { is_deleted: true }) })),
  restoreNote: (id) =>
    set((s) => ({ notes: patchNote(s.notes, id, { is_deleted: false }) })),

  // Folder CRUD
  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((s) => ({ folders: [...s.folders, folder] })),
  updateFolder: (id, patch) =>
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),
  deleteFolder: (id) =>
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      selectedFolderId: s.selectedFolderId === id ? null : s.selectedFolderId,
    })),

  // Selection
  selectNote: (id) => set({ selectedNoteId: id }),
  selectFolder: (id) => set({ selectedFolderId: id }),

  // Filters & view
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (sortBy) => set({ sortBy }),

  // Pin / Archive
  pinNote: (id) =>
    set((s) => ({ notes: patchNote(s.notes, id, { is_pinned: true }) })),
  unpinNote: (id) =>
    set((s) => ({ notes: patchNote(s.notes, id, { is_pinned: false }) })),
  archiveNote: (id) =>
    set((s) => ({ notes: patchNote(s.notes, id, { is_archived: true }) })),
  unarchiveNote: (id) =>
    set((s) => ({ notes: patchNote(s.notes, id, { is_archived: false }) })),

  // Move
  moveNoteToFolder: (noteId, folderId) =>
    set((s) => ({
      notes: patchNote(s.notes, noteId, { folder_id: folderId }),
    })),

  // Purge empty note (Apple Notes-style). Returns the purged note so callers
  // can persist the deletion to DB, or undefined if not empty / not found.
  purgeIfEmpty: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return undefined;
    const hasTitle = note.title.trim().length > 0;
    const hasContent = (note.plain_text ?? '').trim().length > 0;
    if (hasTitle || hasContent) return undefined;
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    return note;
  },

  // Computed: filtered & sorted notes
  filteredNotes: () => {
    const { notes, selectedFolderId, searchQuery, sortBy } = get();
    const query = searchQuery.toLowerCase().trim();

    let filtered = notes.filter((n) => !n.is_deleted && !n.is_archived);

    if (selectedFolderId !== null) {
      filtered = filtered.filter((n) => n.folder_id === selectedFolderId);
    }

    if (query) {
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          (n.plain_text ?? '').toLowerCase().includes(query) ||
          n.tags.some((t) => t.toLowerCase().includes(query)),
      );
    }

    // Pinned notes always come first
    const pinned = filtered.filter((n) => n.is_pinned);
    const unpinned = filtered.filter((n) => !n.is_pinned);

    return [...sortNotes(pinned, sortBy), ...sortNotes(unpinned, sortBy)];
  },
}));
