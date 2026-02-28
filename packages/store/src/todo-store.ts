import { create } from 'zustand';
import type { Todo, TodoStatus, TodoPriority } from './types';

export type TodoViewMode = 'list' | 'board' | 'due-date';
export type TodoSortBy = 'priority' | 'due_date' | 'created_at' | 'manual';
export type TodoGroupBy = 'status' | 'priority' | 'tag' | 'none';

export type TodoStoreState = {
  // State
  todos: Todo[];
  selectedTodoId: string | null;
  viewMode: TodoViewMode;
  filterStatus: TodoStatus | 'all';
  filterPriority: TodoPriority | 'all';
  filterTags: string[];
  sortBy: TodoSortBy;
  groupBy: TodoGroupBy;
  showCompleted: boolean;

  // Actions
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, patch: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;

  selectTodo: (id: string | null) => void;
  setViewMode: (mode: TodoViewMode) => void;
  setFilterStatus: (status: TodoStatus | 'all') => void;
  setFilterPriority: (priority: TodoPriority | 'all') => void;
  setFilterTags: (tags: string[]) => void;
  setSortBy: (sortBy: TodoSortBy) => void;
  setGroupBy: (groupBy: TodoGroupBy) => void;
  toggleShowCompleted: () => void;

  toggleTodoStatus: (id: string) => void;

  // Computed
  filteredTodos: () => Todo[];
  groupedTodos: () => Record<string, Todo[]>;
};

const STATUS_CYCLE: TodoStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
];

const sortTodos = (todos: Todo[], sortBy: TodoSortBy): Todo[] => {
  const sorted = [...todos];
  switch (sortBy) {
    case 'priority':
      return sorted.sort((a, b) => a.priority - b.priority);
    case 'due_date':
      return sorted.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    case 'created_at':
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'manual':
      return sorted.sort((a, b) => a.sort_order - b.sort_order);
  }
};

const patchTodo = (
  todos: Todo[],
  id: string,
  patch: Partial<Todo>,
): Todo[] => todos.map((t) => (t.id === id ? { ...t, ...patch } : t));

export const useTodoStore = create<TodoStoreState>()((set, get) => ({
  // Initial state
  todos: [],
  selectedTodoId: null,
  viewMode: 'list',
  filterStatus: 'all',
  filterPriority: 'all',
  filterTags: [],
  sortBy: 'priority',
  groupBy: 'status',
  showCompleted: false,

  // Todo CRUD
  setTodos: (todos) => set({ todos }),
  addTodo: (todo) => set((s) => ({ todos: [...s.todos, todo] })),
  updateTodo: (id, patch) =>
    set((s) => ({ todos: patchTodo(s.todos, id, patch) })),
  deleteTodo: (id) =>
    set((s) => ({ todos: patchTodo(s.todos, id, { is_deleted: true }) })),

  // Selection & view
  selectTodo: (id) => set({ selectedTodoId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),
  setFilterTags: (tags) => set({ filterTags: tags }),
  setSortBy: (sortBy) => set({ sortBy }),
  setGroupBy: (groupBy) => set({ groupBy }),
  toggleShowCompleted: () =>
    set((s) => ({ showCompleted: !s.showCompleted })),

  // Cycle through statuses: pending -> in_progress -> completed -> cancelled -> pending
  toggleTodoStatus: (id) =>
    set((s) => {
      const todo = s.todos.find((t) => t.id === id);
      if (!todo) return s;

      const currentIndex = STATUS_CYCLE.indexOf(todo.status);
      const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length]!;
      const now = new Date().toISOString();
      const completed_at = nextStatus === 'completed' ? now : null;

      return {
        todos: patchTodo(s.todos, id, {
          status: nextStatus,
          completed_at,
          updated_at: now,
        }),
      };
    }),

  // Computed: filtered & sorted todos
  filteredTodos: () => {
    const {
      todos,
      filterStatus,
      filterPriority,
      filterTags,
      sortBy,
      showCompleted,
    } = get();

    let filtered = todos.filter((t) => !t.is_deleted);

    if (!showCompleted) {
      filtered = filtered.filter(
        (t) => t.status !== 'completed' && t.status !== 'cancelled',
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter((t) => t.priority === filterPriority);
    }

    if (filterTags.length > 0) {
      filtered = filtered.filter((t) =>
        filterTags.some((tag) => t.tags.includes(tag)),
      );
    }

    return sortTodos(filtered, sortBy);
  },

  // Computed: grouped todos (uses filteredTodos)
  groupedTodos: () => {
    const { groupBy } = get();
    const filtered = get().filteredTodos();

    if (groupBy === 'none') {
      return { all: filtered };
    }

    const groups: Record<string, Todo[]> = {};

    for (const todo of filtered) {
      let keys: string[];

      switch (groupBy) {
        case 'status':
          keys = [todo.status];
          break;
        case 'priority':
          keys = [String(todo.priority)];
          break;
        case 'tag':
          keys = todo.tags.length > 0 ? todo.tags : ['untagged'];
          break;
      }

      for (const key of keys) {
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key]!.push(todo);
      }
    }

    return groups;
  },
}));
