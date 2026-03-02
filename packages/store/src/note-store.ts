import { create } from 'zustand';

export type NoteSortBy = 'updated_at' | 'created_at' | 'title' | 'manual';
export type NoteViewMode = 'list' | 'card';
export type NoteFilter = 'active' | 'archived';

export type NoteStoreState = {
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  viewMode: NoteViewMode;
  sortBy: NoteSortBy;
  noteFilter: NoteFilter;

  selectNote: (id: string | null) => void;
  selectFolder: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: NoteViewMode) => void;
  setSortBy: (sortBy: NoteSortBy) => void;
  setNoteFilter: (filter: NoteFilter) => void;
};

export const useNoteStore = create<NoteStoreState>()((set) => ({
  selectedNoteId: null,
  selectedFolderId: null,
  searchQuery: '',
  viewMode: 'list',
  sortBy: 'updated_at',
  noteFilter: 'active',

  selectNote: (id) => set({ selectedNoteId: id }),
  selectFolder: (id) => set({ selectedFolderId: id, noteFilter: 'active', selectedNoteId: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (sortBy) => set({ sortBy }),
  setNoteFilter: (filter) => set({ noteFilter: filter, selectedFolderId: null, selectedNoteId: null }),
}));
