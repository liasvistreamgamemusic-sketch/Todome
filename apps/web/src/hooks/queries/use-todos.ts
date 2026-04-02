'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { addDays, addMonths, addYears } from 'date-fns';
import {
  loadTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from '@todome/db';
import type { Todo, RemindRepeat } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

function computeNextDueDate(currentDueDate: string, repeat: RemindRepeat): string | null {
  const current = new Date(currentDueDate);
  switch (repeat) {
    case 'daily': return addDays(current, 1).toISOString();
    case 'weekly': return addDays(current, 7).toISOString();
    case 'monthly': return addMonths(current, 1).toISOString();
    case 'yearly': return addYears(current, 1).toISOString();
    default: return null;
  }
}

export function useTodos() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.todos.all(userId ?? ''),
    queryFn: () => loadTodos(userId!),
    enabled: !!userId,
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (todo: Todo) => createTodo(todo),
    onMutate: async (todo) => {
      const key = queryKeys.todos.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Todo[]>(key);
      queryClient.setQueryData<Todo[]>(key, (old) => [...(old ?? []), todo]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.todos.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.all(userId!) });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Todo> }) =>
      updateTodo(id, patch),
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.todos.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Todo[]>(key);
      queryClient.setQueryData<Todo[]>(key, (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.todos.all(userId!), context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.all(userId!) });

      // Auto-create next occurrence for recurring todos
      if (variables.patch.status === 'completed') {
        const todos = queryClient.getQueryData<Todo[]>(queryKeys.todos.all(userId!));
        const todo = todos?.find((t) => t.id === variables.id);
        if (todo && todo.remind_repeat && todo.remind_repeat !== 'none' && todo.due_date) {
          const nextDueDate = computeNextDueDate(todo.due_date, todo.remind_repeat);
          if (nextDueDate) {
            const now = new Date().toISOString();
            const maxOrder = (todos ?? []).reduce((max, t) => Math.max(max, t.sort_order), 0);
            const nextTodo: Todo = {
              id: crypto.randomUUID(),
              user_id: todo.user_id,
              title: todo.title,
              detail: todo.detail,
              priority: todo.priority,
              status: 'pending',
              due_date: nextDueDate,
              remind_at: null,
              remind_repeat: todo.remind_repeat,
              note_ids: [],
              tags: [...todo.tags],
              list_id: todo.list_id,
              is_flagged: todo.is_flagged,
              subtasks: [],
              sort_order: maxOrder + 1,
              is_deleted: false,
              completed_at: null,
              created_at: now,
              updated_at: now,
            };
            createTodo(nextTodo);
            queryClient.invalidateQueries({ queryKey: queryKeys.todos.all(userId!) });
          }
        }
      }
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onMutate: async (id) => {
      const key = queryKeys.todos.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Todo[]>(key);
      queryClient.setQueryData<Todo[]>(key, (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.todos.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.all(userId!) });
    },
  });
}
