'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadDiaries,
  createDiary,
  updateDiary,
  deleteDiary,
} from '@todome/db';
import type { Diary } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

export function useDiaries() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.diaries.all(userId ?? ''),
    queryFn: () => loadDiaries(userId!),
    enabled: !!userId,
  });
}

export function useCreateDiary() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (diary: Diary) => createDiary(diary),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.diaries.all(userId!) });
    },
  });
}

export function useUpdateDiary() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Diary> }) =>
      updateDiary(id, patch),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.diaries.all(userId!) });
    },
  });
}

export function useDeleteDiary() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (id: string) => deleteDiary(id),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.diaries.all(userId!) });
    },
  });
}
