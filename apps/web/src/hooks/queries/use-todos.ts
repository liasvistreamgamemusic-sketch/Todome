'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from '@todome/db';
import type { Todo } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.all(userId!) });
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
