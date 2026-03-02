'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@todome/db';
import type { CalendarEvent } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

export function useCalendarEvents() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.calendarEvents.all(userId ?? ''),
    queryFn: () => loadCalendarEvents(userId!),
    enabled: !!userId,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (event: CalendarEvent) => createCalendarEvent(event),
    onMutate: async (event) => {
      const key = queryKeys.calendarEvents.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CalendarEvent[]>(key);
      queryClient.setQueryData<CalendarEvent[]>(key, (old) => [
        ...(old ?? []),
        event,
      ]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.calendarEvents.all(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarEvents.all(userId!),
      });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<CalendarEvent>;
    }) => updateCalendarEvent(id, patch),
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.calendarEvents.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CalendarEvent[]>(key);
      queryClient.setQueryData<CalendarEvent[]>(key, (old) =>
        (old ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.calendarEvents.all(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarEvents.all(userId!),
      });
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onMutate: async (id) => {
      const key = queryKeys.calendarEvents.all(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CalendarEvent[]>(key);
      queryClient.setQueryData<CalendarEvent[]>(key, (old) =>
        (old ?? []).filter((e) => e.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.calendarEvents.all(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendarEvents.all(userId!),
      });
    },
  });
}
