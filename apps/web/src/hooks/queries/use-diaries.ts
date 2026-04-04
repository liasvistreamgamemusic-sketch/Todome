'use client';

import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadDiaries,
  getCachedDiaries,
  cacheDiaries,
  offlineCreateDiary,
  offlineUpdateDiary,
  offlineDeleteDiary,
} from '@todome/db';
import type { Diary } from '@todome/db';
import { useOnline } from '@todome/hooks';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

/** Seed TanStack Query from IndexedDB on cold start. */
function useSeedDiariesFromCache() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;
    const key = queryKeys.diaries.all(userId);
    if (!queryClient.getQueryData(key)) {
      getCachedDiaries(userId).then((cached) => {
        if (cached.length > 0 && !queryClient.getQueryData(key)) {
          queryClient.setQueryData(key, cached);
        }
      });
    }
  }, [userId, queryClient]);
}

export function useDiaries() {
  const userId = useUserId();
  const isOnline = useOnline();
  useSeedDiariesFromCache();

  return useQuery({
    queryKey: queryKeys.diaries.all(userId ?? ''),
    queryFn: async () => {
      if (!isOnline) {
        return (await getCachedDiaries(userId!)) ?? [];
      }
      const data = await loadDiaries(userId!);
      cacheDiaries(data, userId!);
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateDiary() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: (diary: Diary) => offlineCreateDiary(isOnline, diary),
    onMutate: async (diary) => {
      const key = queryKeys.diaries.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Diary[]>(key);
      queryClient.setQueryData<Diary[]>(key, (old) => [diary, ...(old ?? [])]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.diaries.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.diaries.all(userId!) });
      }
    },
  });
}

export function useUpdateDiary() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Diary> }) =>
      offlineUpdateDiary(isOnline, id, patch, userId!),
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.diaries.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Diary[]>(key);
      queryClient.setQueryData<Diary[]>(key, (old) =>
        (old ?? []).map((d) => (d.id === id ? { ...d, ...patch } : d)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.diaries.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.diaries.all(userId!) });
      }
    },
  });
}

export function useDeleteDiary() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: (id: string) => offlineDeleteDiary(isOnline, id, userId!),
    onMutate: async (id) => {
      const key = queryKeys.diaries.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Diary[]>(key);
      queryClient.setQueryData<Diary[]>(key, (old) =>
        (old ?? []).filter((d) => d.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.diaries.all(userId!), context.previous);
      }
    },
    onSettled: () => {
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.diaries.all(userId!) });
      }
    },
  });
}
