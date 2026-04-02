import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TodoStatus, TodoPriority } from './types';

export type TodoViewMode = 'list' | 'board' | 'due-date';
export type TodoSortBy = 'priority' | 'due_date' | 'created_at' | 'manual';
export type TodoGroupBy = 'status' | 'priority' | 'tag' | 'none';

export type TodoStoreState = {
  selectedTodoId: string | null;
  selectedListId: string | null;
  searchQuery: string;
  selectedTodoIds: Set<string>;
  isMultiSelectMode: boolean;
  viewMode: TodoViewMode;
  filterStatus: TodoStatus | 'all';
  filterPriority: TodoPriority | 'all';
  filterTags: string[];
  sortBy: TodoSortBy;
  groupBy: TodoGroupBy;
  showCompleted: boolean;

  selectTodo: (id: string | null) => void;
  setSelectedList: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleTodoSelection: (id: string) => void;
  selectAllTodos: (ids: string[]) => void;
  clearSelection: () => void;
  setMultiSelectMode: (mode: boolean) => void;
  setViewMode: (mode: TodoViewMode) => void;
  setFilterStatus: (status: TodoStatus | 'all') => void;
  setFilterPriority: (priority: TodoPriority | 'all') => void;
  setFilterTags: (tags: string[]) => void;
  setSortBy: (sortBy: TodoSortBy) => void;
  setGroupBy: (groupBy: TodoGroupBy) => void;
  toggleShowCompleted: () => void;
};

export const useTodoStore = create<TodoStoreState>()(
  persist(
    (set) => ({
      selectedTodoId: null,
      selectedListId: null,
      searchQuery: '',
      selectedTodoIds: new Set(),
      isMultiSelectMode: false,
      viewMode: 'list',
      filterStatus: 'all',
      filterPriority: 'all',
      filterTags: [],
      sortBy: 'priority',
      groupBy: 'status',
      showCompleted: false,

      selectTodo: (id) => set({ selectedTodoId: id }),
      setSelectedList: (id) => set({ selectedListId: id }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleTodoSelection: (id) => set((s) => {
        const next = new Set(s.selectedTodoIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selectedTodoIds: next };
      }),
      selectAllTodos: (ids) => set({ selectedTodoIds: new Set(ids) }),
      clearSelection: () => set({ selectedTodoIds: new Set(), isMultiSelectMode: false }),
      setMultiSelectMode: (mode) => set({ isMultiSelectMode: mode, selectedTodoIds: new Set() }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setFilterStatus: (status) => set({ filterStatus: status }),
      setFilterPriority: (priority) => set({ filterPriority: priority }),
      setFilterTags: (tags) => set({ filterTags: tags }),
      setSortBy: (sortBy) => set({ sortBy }),
      setGroupBy: (groupBy) => set({ groupBy }),
      toggleShowCompleted: () =>
        set((s) => ({ showCompleted: !s.showCompleted })),
    }),
    {
      name: 'todome-todo-store',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') return sessionStorage;
        return localStorage;
      }),
      partialize: (state) => ({
        selectedListId: state.selectedListId,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        groupBy: state.groupBy,
        showCompleted: state.showCompleted,
        filterStatus: state.filterStatus,
        filterPriority: state.filterPriority,
      }),
    },
  ),
);
