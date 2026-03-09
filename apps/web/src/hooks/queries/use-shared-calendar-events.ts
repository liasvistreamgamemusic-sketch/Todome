'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  loadSharedCalendarEvents,
  createSharedCalendarEvent,
  updateSharedCalendarEvent,
  deleteSharedCalendarEvent,
} from '@todome/db';
import type { SharedCalendarEvent } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';
import { useSharedCalendars } from './use-shared-calendars';

export function useSharedCalendarEvents() {
  const userId = useUserId();
  const { data: calendars = [] } = useSharedCalendars();

  const visibleCalendarIds = calendars.map((c) => c.id);

  return useQuery({
    queryKey: queryKeys.sharedCalendars.events(userId ?? ''),
    queryFn: () => loadSharedCalendarEvents(visibleCalendarIds),
    enabled: !!userId && visibleCalendarIds.length > 0,
  });
}

export function useCreateSharedCalendarEvent() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (event: SharedCalendarEvent) =>
      createSharedCalendarEvent(event),
    onMutate: async (event) => {
      const key = queryKeys.sharedCalendars.events(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SharedCalendarEvent[]>(key);
      queryClient.setQueryData<SharedCalendarEvent[]>(key, (old) => [
        ...(old ?? []),
        event,
      ]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.sharedCalendars.events(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sharedCalendars.events(userId!),
      });
    },
  });
}

export function useUpdateSharedCalendarEvent() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<SharedCalendarEvent>;
    }) => updateSharedCalendarEvent(id, patch),
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.sharedCalendars.events(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SharedCalendarEvent[]>(key);
      queryClient.setQueryData<SharedCalendarEvent[]>(key, (old) =>
        (old ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.sharedCalendars.events(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sharedCalendars.events(userId!),
      });
    },
  });
}

export function useDeleteSharedCalendarEvent() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: (id: string) => deleteSharedCalendarEvent(id),
    onMutate: async (id) => {
      const key = queryKeys.sharedCalendars.events(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SharedCalendarEvent[]>(key);
      queryClient.setQueryData<SharedCalendarEvent[]>(key, (old) =>
        (old ?? []).filter((e) => e.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.sharedCalendars.events(userId!),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sharedCalendars.events(userId!),
      });
    },
  });
}
