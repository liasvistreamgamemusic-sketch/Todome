'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@todome/db';
import { queryKeys } from './keys';
import { useUserId } from './use-auth';

/**
 * Subscribes to Supabase Realtime for all data tables.
 * On any change, invalidates the relevant TanStack Query cache
 * so data re-fetches automatically.
 *
 * Mount this once in AppShell or a layout component.
 */
export function useRealtimeSync(): void {
  const queryClient = useQueryClient();
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;

    // Debounce notes refetch to batch rapid save echo-backs (2s)
    let notesDebounceTimer: ReturnType<typeof setTimeout> | undefined;
    const debouncedNotesRefetch = () => {
      if (notesDebounceTimer) clearTimeout(notesDebounceTimer);
      notesDebounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.notes.all(userId),
        });
      }, 2000);
    };

    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`,
        },
        debouncedNotesRefetch,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.refetchQueries({
            queryKey: queryKeys.folders.all(userId),
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.refetchQueries({
            queryKey: queryKeys.todos.all(userId),
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.refetchQueries({
            queryKey: queryKeys.calendarEvents.all(userId),
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diaries',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.refetchQueries({
            queryKey: queryKeys.diaries.all(userId),
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.refetchQueries({
            queryKey: queryKeys.calendarSubscriptions.all(userId),
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_calendars',
        },
        () => {
          queryClient.refetchQueries({
            queryKey: queryKeys.sharedCalendars.all(userId),
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_calendar_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.refetchQueries({
            queryKey: queryKeys.sharedCalendars.all(userId),
          });
          queryClient.refetchQueries({
            queryKey: queryKeys.sharedCalendars.events(userId),
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_calendar_events',
        },
        () => {
          queryClient.refetchQueries({
            queryKey: queryKeys.sharedCalendars.events(userId),
          });
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[realtime] subscribed to db-changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[realtime] channel error:', err);
        } else if (status === 'TIMED_OUT') {
          console.warn('[realtime] subscription timed out');
        }
      });

    return () => {
      if (notesDebounceTimer) clearTimeout(notesDebounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
