import type { Todo, TodoStatus, TodoPriority } from '@todome/db';

export type TodoSortBy = 'priority' | 'due_date' | 'created_at' | 'manual';
export type TodoGroupBy = 'status' | 'priority' | 'tag' | 'none';

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
  },
): Todo[] {
  let filtered = todos.filter((t) => !t.is_deleted);

  if (!opts.showCompleted) {
    filtered = filtered.filter(
      (t) => t.status !== 'completed' && t.status !== 'cancelled',
    );
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
