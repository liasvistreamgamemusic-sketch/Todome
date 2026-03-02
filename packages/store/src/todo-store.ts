import { create } from 'zustand';
import type { TodoStatus, TodoPriority } from './types';

export type TodoViewMode = 'list' | 'board' | 'due-date';
export type TodoSortBy = 'priority' | 'due_date' | 'created_at' | 'manual';
export type TodoGroupBy = 'status' | 'priority' | 'tag' | 'none';

export type TodoStoreState = {
  selectedTodoId: string | null;
  viewMode: TodoViewMode;
  filterStatus: TodoStatus | 'all';
  filterPriority: TodoPriority | 'all';
  filterTags: string[];
  sortBy: TodoSortBy;
  groupBy: TodoGroupBy;
  showCompleted: boolean;

  selectTodo: (id: string | null) => void;
  setViewMode: (mode: TodoViewMode) => void;
  setFilterStatus: (status: TodoStatus | 'all') => void;
  setFilterPriority: (priority: TodoPriority | 'all') => void;
  setFilterTags: (tags: string[]) => void;
  setSortBy: (sortBy: TodoSortBy) => void;
  setGroupBy: (groupBy: TodoGroupBy) => void;
  toggleShowCompleted: () => void;
};

export const useTodoStore = create<TodoStoreState>()((set) => ({
  selectedTodoId: null,
  viewMode: 'list',
  filterStatus: 'all',
  filterPriority: 'all',
  filterTags: [],
  sortBy: 'priority',
  groupBy: 'status',
  showCompleted: false,

  selectTodo: (id) => set({ selectedTodoId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),
  setFilterTags: (tags) => set({ filterTags: tags }),
  setSortBy: (sortBy) => set({ sortBy }),
  setGroupBy: (groupBy) => set({ groupBy }),
  toggleShowCompleted: () =>
    set((s) => ({ showCompleted: !s.showCompleted })),
}));
