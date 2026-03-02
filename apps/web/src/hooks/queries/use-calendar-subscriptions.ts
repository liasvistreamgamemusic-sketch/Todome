'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadCalendarSubscriptions,
  createCalendarSubscription,
  updateCalendarSubscription,
  deleteCalendarSubscription,
} from '@todome/db';
import type { CalendarSubscription } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

export function useCalendarSubscriptions() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.calendarSubscriptions.all(userId ?? ''),
    queryFn: () => loadCalendarSubscriptions(userId!),
    enabled: !!userId,
  });
}

export function useCreateCalendarSubscription() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (sub: CalendarSubscription) => createCalendarSubscription(sub),
    onMutate: async (sub) => {
      const key = queryKeys.calendarSubscriptions.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CalendarSubscription[]>(key);
      queryClient.setQueryData<CalendarSubscription[]>(key, (old) => [
        ...(old ?? []),
        sub,
      ]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.calendarSubscriptions.all(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarSubscriptions.all(userId!),
      });
    },
  });
}

export function useUpdateCalendarSubscription() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<CalendarSubscription>;
    }) => updateCalendarSubscription(id, patch),
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.calendarSubscriptions.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CalendarSubscription[]>(key);
      queryClient.setQueryData<CalendarSubscription[]>(key, (old) =>
        (old ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.calendarSubscriptions.all(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarSubscriptions.all(userId!),
      });
    },
  });
}

export function useDeleteCalendarSubscription() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (id: string) => deleteCalendarSubscription(id),
    onMutate: async (id) => {
      const key = queryKeys.calendarSubscriptions.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CalendarSubscription[]>(key);
      queryClient.setQueryData<CalendarSubscription[]>(key, (old) =>
        (old ?? []).filter((s) => s.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.calendarSubscriptions.all(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarSubscriptions.all(userId!),
      });
    },
  });
}
