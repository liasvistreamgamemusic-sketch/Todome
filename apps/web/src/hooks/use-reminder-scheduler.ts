'use client';

import { useEffect, useRef } from 'react';
import { useUiStore } from '@todome/store';
import { useQueryClient } from '@tanstack/react-query';
import { sendNotification } from '@/lib/notifications';
import type { Todo, CalendarEvent } from '@todome/store';

const INTERVAL_MS = 60_000;

export function useReminderScheduler(): void {
  const notificationsEnabled = useUiStore((s) => s.notificationsEnabled);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const queryClient = useQueryClient();
  const notifiedIds = useRef(new Set<string>());

  useEffect(() => {
    if (!notificationsEnabled) return;

    function check(): void {
      const now = new Date();

      const todos = queryClient.getQueryData<Todo[]>(['todos']);
      if (todos) {
        for (const todo of todos) {
          const key = `todo-${todo.id}`;
          if (
            todo.remind_at &&
            !notifiedIds.current.has(key) &&
            new Date(todo.remind_at) <= now &&
            todo.status !== 'completed' &&
            todo.status !== 'cancelled'
          ) {
            notifiedIds.current.add(key);
            sendNotification('Todo\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC', `\u300C${todo.title}\u300D\u306E\u671F\u9650\u3067\u3059`, {
              sound: soundEnabled,
            });
          }
        }
      }

      const events = queryClient.getQueryData<CalendarEvent[]>(['calendarEvents']);
      if (events) {
        for (const event of events) {
          const key = `event-${event.id}`;
          if (
            event.remind_at &&
            !notifiedIds.current.has(key) &&
            new Date(event.remind_at) <= now
          ) {
            notifiedIds.current.add(key);
            sendNotification(
              '\u30AB\u30EC\u30F3\u30C0\u30FC\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC',
              `\u300C${event.title}\u300D\u307E\u3082\u306A\u304F\u958B\u59CB`,
              { sound: soundEnabled },
            );
          }
        }
      }
    }

    check();
    const intervalId = setInterval(check, INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [notificationsEnabled, soundEnabled, queryClient]);
}
