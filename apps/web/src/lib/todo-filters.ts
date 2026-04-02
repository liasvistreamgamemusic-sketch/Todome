import type { Todo, TodoStatus, TodoPriority } from '@todome/db';

export type TodoSortBy = 'priority' | 'due_date' | 'created_at' | 'manual';
export type TodoGroupBy = 'status' | 'priority' | 'tag' | 'list' | 'none';

export type SmartListId = 'today' | 'scheduled' | 'all' | 'flagged' | 'completed';

export function isSmartListId(id: string | null): id is SmartListId {
  return id === 'today' || id === 'scheduled' || id === 'all' || id === 'flagged' || id === 'completed';
}

function sortTodos(todos: Todo[], sortBy: TodoSortBy): Todo[] {
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
}

export function filterTodos(
  todos: Todo[],
  opts: {
    filterStatus: TodoStatus | 'all';
    filterPriority: TodoPriority | 'all';
    filterTags: string[];
    sortBy: TodoSortBy;
    showCompleted: boolean;
    listId?: string | null;
    searchQuery?: string;
  },
): Todo[] {
  let filtered = todos.filter((t) => !t.is_deleted);

  // Smart list filtering
  if (opts.listId && isSmartListId(opts.listId)) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    switch (opts.listId) {
      case 'today':
        filtered = filtered.filter(
          (t) => t.due_date && t.due_date >= todayStart && t.due_date < todayEnd &&
            t.status !== 'completed' && t.status !== 'cancelled',
        );
        break;
      case 'scheduled':
        filtered = filtered.filter(
          (t) => t.due_date && t.status !== 'completed' && t.status !== 'cancelled',
        );
        break;
      case 'all':
        filtered = filtered.filter(
          (t) => t.status !== 'completed' && t.status !== 'cancelled',
        );
        break;
      case 'flagged':
        filtered = filtered.filter(
          (t) => t.is_flagged && t.status !== 'completed' && t.status !== 'cancelled',
        );
        break;
      case 'completed':
        filtered = filtered.filter((t) => t.status === 'completed');
        break;
    }
  } else if (opts.listId) {
    // User-created list
    filtered = filtered.filter((t) => t.list_id === opts.listId);
    if (!opts.showCompleted) {
      filtered = filtered.filter(
        (t) => t.status !== 'completed' && t.status !== 'cancelled',
      );
    }
  } else {
    // No list selected - show all (with completed filter)
    if (!opts.showCompleted) {
      filtered = filtered.filter(
        (t) => t.status !== 'completed' && t.status !== 'cancelled',
      );
    }
  }

  if (opts.filterStatus !== 'all') {
    filtered = filtered.filter((t) => t.status === opts.filterStatus);
  }

  if (opts.filterPriority !== 'all') {
    filtered = filtered.filter((t) => t.priority === opts.filterPriority);
  }

  if (opts.filterTags.length > 0) {
    filtered = filtered.filter((t) =>
      opts.filterTags.some((tag) => t.tags.includes(tag)),
    );
  }

  // Search filter
  if (opts.searchQuery) {
    const q = opts.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.detail && t.detail.toLowerCase().includes(q)) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.subtasks.some((s) => s.title.toLowerCase().includes(q)),
    );
  }

  return sortTodos(filtered, opts.sortBy);
}

export function groupTodos(
  todos: Todo[],
  groupBy: TodoGroupBy,
): Record<string, Todo[]> {
  if (groupBy === 'none') {
    return { all: todos };
  }

  const groups: Record<string, Todo[]> = {};

  for (const todo of todos) {
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
      case 'list':
        keys = [todo.list_id ?? 'no-list'];
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
}

export const STATUS_CYCLE: TodoStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
];

export function getSmartListCounts(todos: Todo[]): Record<SmartListId, number> {
  const active = todos.filter((t) => !t.is_deleted);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  return {
    today: active.filter(
      (t) => t.due_date && t.due_date >= todayStart && t.due_date < todayEnd &&
        t.status !== 'completed' && t.status !== 'cancelled',
    ).length,
    scheduled: active.filter(
      (t) => t.due_date && t.status !== 'completed' && t.status !== 'cancelled',
    ).length,
    all: active.filter(
      (t) => t.status !== 'completed' && t.status !== 'cancelled',
    ).length,
    flagged: active.filter(
      (t) => t.is_flagged && t.status !== 'completed' && t.status !== 'cancelled',
    ).length,
    completed: active.filter((t) => t.status === 'completed').length,
  };
}

export function getListCounts(todos: Todo[]): Record<string, number> {
  const active = todos.filter(
    (t) => !t.is_deleted && t.status !== 'completed' && t.status !== 'cancelled',
  );
  const counts: Record<string, number> = {};
  for (const todo of active) {
    if (todo.list_id) {
      counts[todo.list_id] = (counts[todo.list_id] ?? 0) + 1;
    }
  }
  return counts;
}
