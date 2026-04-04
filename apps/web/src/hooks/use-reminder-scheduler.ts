'use client';

import { useEffect, useRef } from 'react';
import { useUiStore } from '@todome/store';
import { useQueryClient } from '@tanstack/react-query';
import { useUserId } from '@/hooks/queries';
import { queryKeys } from '@/hooks/queries/keys';
import { sendNotification } from '@/lib/notifications';
import { supabase } from '@todome/db';
import type { Todo, CalendarEvent } from '@todome/store';

const INTERVAL_MS = 60_000;

/** True if this reminder has already been handled (server-side or client-side). */
function alreadyReminded(remindAt: string, remindedAt: string | null): boolean {
  if (!remindedAt) return false;
  return new Date(remindedAt) >= new Date(remindAt);
}

export function useReminderScheduler(): void {
  const notificationsEnabled = useUiStore((s) => s.notificationsEnabled);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const queryClient = useQueryClient();
  const userId = useUserId();
  const notifiedIds = useRef(new Set<string>());

  useEffect(() => {
    if (!notificationsEnabled || !userId) return;
    const uid = userId;

    function check(): void {
      const now = new Date();

      const todos = queryClient.getQueryData<Todo[]>(queryKeys.todos.all(uid));
      if (todos) {
        for (const todo of todos) {
          const key = `todo-${todo.id}`;
          if (
            todo.remind_at &&
            !notifiedIds.current.has(key) &&
            new Date(todo.remind_at) <= now &&
            !alreadyReminded(todo.remind_at, todo.reminded_at) &&
            todo.status !== 'completed' &&
            todo.status !== 'cancelled'
          ) {
            notifiedIds.current.add(key);
            sendNotification('Todoリマインダー', `「${todo.title}」の期限です`, {
              sound: soundEnabled,
            });
            // Mark as reminded in DB so server-side won't re-send
            supabase
              .from('todos')
              .update({ reminded_at: now.toISOString() } as never)
              .eq('id', todo.id)
              .then(() => {});
          }
        }
      }

      const events = queryClient.getQueryData<CalendarEvent[]>(queryKeys.calendarEvents.all(uid));
      if (events) {
        for (const event of events) {
          const key = `event-${event.id}`;
          if (
            event.remind_at &&
            !notifiedIds.current.has(key) &&
            new Date(event.remind_at) <= now &&
            !alreadyReminded(event.remind_at, event.reminded_at) &&
            !event.is_deleted
          ) {
            notifiedIds.current.add(key);
            sendNotification(
              'カレンダーリマインダー',
              `「${event.title}」まもなく開始`,
              { sound: soundEnabled },
            );
            // Mark as reminded in DB so server-side won't re-send
            supabase
              .from('calendar_events')
              .update({ reminded_at: now.toISOString() } as never)
              .eq('id', event.id)
              .then(() => {});
          }
        }
      }
    }

    check();
    const intervalId = setInterval(check, INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [notificationsEnabled, soundEnabled, queryClient, userId]);
}
