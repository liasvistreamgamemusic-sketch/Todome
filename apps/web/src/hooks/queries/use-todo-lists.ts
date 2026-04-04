'use client';

import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadTodoLists,
  getCachedTodoLists,
  cacheTodoLists,
  offlineCreateTodoList,
  offlineUpdateTodoList,
  offlineDeleteTodoList,
} from '@todome/db';
import type { TodoList } from '@todome/db';
import { useOnline } from '@todome/hooks';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

/** Seed TanStack Query from IndexedDB on cold start. */
function useSeedTodoListsFromCache() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;
    const key = queryKeys.todoLists.all(userId);
    if (!queryClient.getQueryData(key)) {
      getCachedTodoLists(userId).then((cached) => {
        if (cached.length > 0 && !queryClient.getQueryData(key)) {
          queryClient.setQueryData(key, cached);
        }
      });
    }
  }, [userId, queryClient]);
}

export function useTodoLists() {
  const userId = useUserId();
  const isOnline = useOnline();
  useSeedTodoListsFromCache();

  return useQuery({
    queryKey: queryKeys.todoLists.all(userId ?? ''),
    queryFn: async () => {
      if (!isOnline) {
        return (await getCachedTodoLists(userId!)) ?? [];
      }
      const data = await loadTodoLists(userId!);
      cacheTodoLists(data, userId!);
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateTodoList() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: (list: TodoList) => offlineCreateTodoList(isOnline, list),
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
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.todoLists.all(userId!) });
      }
    },
  });
}

export function useUpdateTodoList() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TodoList> }) =>
      offlineUpdateTodoList(isOnline, id, patch, userId!),
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
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.todoLists.all(userId!) });
      }
    },
  });
}

export function useDeleteTodoList() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: (id: string) => offlineDeleteTodoList(isOnline, id, userId!),
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
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.todoLists.all(userId!) });
      }
    },
  });
}
