'use client';

import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadCalendarEvents,
  getCachedCalendarEvents,
  cacheCalendarEvents,
  offlineCreateCalendarEvent,
  offlineUpdateCalendarEvent,
  offlineDeleteCalendarEvent,
} from '@todome/db';
import type { CalendarEvent } from '@todome/db';
import { useOnline } from '@todome/hooks';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

/** Seed TanStack Query from IndexedDB on cold start. */
function useSeedCalendarEventsFromCache() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;
    const key = queryKeys.calendarEvents.all(userId);
    if (!queryClient.getQueryData(key)) {
      getCachedCalendarEvents(userId).then((cached) => {
        if (cached.length > 0 && !queryClient.getQueryData(key)) {
          queryClient.setQueryData(key, cached);
        }
      });
    }
  }, [userId, queryClient]);
}

export function useCalendarEvents() {
  const userId = useUserId();
  const isOnline = useOnline();
  useSeedCalendarEventsFromCache();

  return useQuery({
    queryKey: queryKeys.calendarEvents.all(userId ?? ''),
    queryFn: async () => {
      if (!isOnline) {
        return (await getCachedCalendarEvents(userId!)) ?? [];
      }
      const data = await loadCalendarEvents(userId!);
      cacheCalendarEvents(data, userId!);
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: (event: CalendarEvent) =>
      offlineCreateCalendarEvent(isOnline, event),
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
      if (isOnline) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.calendarEvents.all(userId!),
        });
      }
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<CalendarEvent>;
    }) => offlineUpdateCalendarEvent(isOnline, id, patch, userId!),
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
      if (isOnline) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.calendarEvents.all(userId!),
        });
      }
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const isOnline = useOnline();

  return useMutation({
    mutationFn: (id: string) =>
      offlineDeleteCalendarEvent(isOnline, id, userId!),
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
      if (isOnline) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.calendarEvents.all(userId!),
        });
      }
    },
  });
}
