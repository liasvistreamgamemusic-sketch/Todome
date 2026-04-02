'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadTodoLists,
  createTodoList,
  updateTodoList,
  deleteTodoList,
} from '@todome/db';
import type { TodoList } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

export function useTodoLists() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.todoLists.all(userId ?? ''),
    queryFn: () => loadTodoLists(userId!),
    enabled: !!userId,
  });
}

export function useCreateTodoList() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (list: TodoList) => createTodoList(list),
    onMutate: async (list) => {
      const key = queryKeys.todoLists.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TodoList[]>(key);
      queryClient.setQueryData<TodoList[]>(key, (old) => [...(old ?? []), list]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.todoLists.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todoLists.all(userId!) });
    },
  });
}

export function useUpdateTodoList() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TodoList> }) =>
      updateTodoList(id, patch),
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.todoLists.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TodoList[]>(key);
      queryClient.setQueryData<TodoList[]>(key, (old) =>
        (old ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.todoLists.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todoLists.all(userId!) });
    },
  });
}

export function useDeleteTodoList() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (id: string) => deleteTodoList(id),
    onMutate: async (id) => {
      const key = queryKeys.todoLists.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TodoList[]>(key);
      queryClient.setQueryData<TodoList[]>(key, (old) =>
        (old ?? []).filter((l) => l.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.todoLists.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todoLists.all(userId!) });
    },
  });
}
