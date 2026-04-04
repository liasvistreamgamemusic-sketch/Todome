'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOnline } from '@todome/hooks';
import { flushQueue, getPendingCount } from '@todome/db';
import { useUiStore } from '@todome/store';
import { useUserId } from './queries/use-auth';

// Maps offline queue table names to TanStack Query key prefixes
const TABLE_TO_KEY_MAP: Record<string, string> = {
  notes: 'notes',
  folders: 'folders',
  todos: 'todos',
  todo_lists: 'todoLists',
  calendar_events: 'calendarEvents',
  diaries: 'diaries',
};

export function useOfflineSync() {
  const isOnline = useOnline();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const { setSyncStatus, setPendingOpCount, setSyncError } = useUiStore();
  const isFlushing = useRef(false);
  const prevOnline = useRef(isOnline);

  // Detect offline -> online transition
  useEffect(() => {
    if (prevOnline.current === false && isOnline && userId && !isFlushing.current) {
      isFlushing.current = true;
      setSyncStatus('syncing');

      flushQueue(userId, (affectedTables) => {
        // Invalidate all affected query keys
        for (const table of affectedTables) {
          const keyPrefix = TABLE_TO_KEY_MAP[table];
          if (keyPrefix) {
            queryClient.invalidateQueries({ queryKey: [keyPrefix] });
          }
        }
      })
        .then((result) => {
          if (result.failed > 0) {
            setSyncStatus('error');
            setSyncError(result.errors[0] ?? null);
          } else {
            setSyncStatus('synced');
            setSyncError(null);
            // Full refresh from Supabase
            queryClient.invalidateQueries();
            setTimeout(() => setSyncStatus('idle'), 3000);
          }
          getPendingCount(userId).then(setPendingOpCount);
        })
        .catch((err) => {
          setSyncStatus('error');
          setSyncError(String(err));
        })
        .finally(() => {
          isFlushing.current = false;
        });
    }
    prevOnline.current = isOnline;
  }, [isOnline, userId, queryClient, setSyncStatus, setSyncError, setPendingOpCount]);

  // Poll pending count
  useEffect(() => {
    if (!userId) return;
    const update = () => getPendingCount(userId).then(setPendingOpCount);
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [userId, setPendingOpCount]);
}
