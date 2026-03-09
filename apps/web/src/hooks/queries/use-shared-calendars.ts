'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadSharedCalendars,
  createSharedCalendar,
  updateSharedCalendar,
  deleteSharedCalendar,
} from '@todome/db';
import type { SharedCalendar } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

export function useSharedCalendars() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.sharedCalendars.all(userId ?? ''),
    queryFn: () => loadSharedCalendars(userId!),
    enabled: !!userId,
  });
}

export function useCreateSharedCalendar() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (cal: SharedCalendar) => createSharedCalendar(cal),
    onMutate: async (cal) => {
      const key = queryKeys.sharedCalendars.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SharedCalendar[]>(key);
      queryClient.setQueryData<SharedCalendar[]>(key, (old) => [
        ...(old ?? []),
        cal,
      ]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.sharedCalendars.all(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sharedCalendars.all(userId!),
      });
    },
  });
}

export function useUpdateSharedCalendar() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<SharedCalendar>;
    }) => updateSharedCalendar(id, patch),
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.sharedCalendars.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SharedCalendar[]>(key);
      queryClient.setQueryData<SharedCalendar[]>(key, (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.sharedCalendars.all(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sharedCalendars.all(userId!),
      });
    },
  });
}

export function useDeleteSharedCalendar() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (id: string) => deleteSharedCalendar(id),
    onMutate: async (id) => {
      const key = queryKeys.sharedCalendars.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SharedCalendar[]>(key);
      queryClient.setQueryData<SharedCalendar[]>(key, (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.sharedCalendars.all(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sharedCalendars.all(userId!),
      });
    },
  });
}
