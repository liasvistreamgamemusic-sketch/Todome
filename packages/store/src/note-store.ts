import { create } from 'zustand';

export type NoteSortBy = 'updated_at' | 'created_at' | 'title' | 'manual';
export type NoteViewMode = 'list' | 'card';

export type NoteStoreState = {
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  viewMode: NoteViewMode;
  sortBy: NoteSortBy;

  selectNote: (id: string | null) => void;
  selectFolder: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: NoteViewMode) => void;
  setSortBy: (sortBy: NoteSortBy) => void;
};

export const useNoteStore = create<NoteStoreState>()((set) => ({
  selectedNoteId: null,
  selectedFolderId: null,
  searchQuery: '',
  viewMode: 'list',
  sortBy: 'updated_at',

  selectNote: (id) => set({ selectedNoteId: id }),
  selectFolder: (id) => set({ selectedFolderId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (sortBy) => set({ sortBy }),
}));
