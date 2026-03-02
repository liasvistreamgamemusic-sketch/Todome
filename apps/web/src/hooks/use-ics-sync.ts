'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useCalendarSubscriptions, useUpdateCalendarSubscription } from '@/hooks/queries';
import { useSubscriptionStore } from '@todome/store';
import type { CalendarSubscription } from '@todome/db';
import { fetchIcs } from '@/lib/ics-fetch';
import { parseIcsToEvents } from '@/lib/ics-parser';

const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function useIcsSync() {
  const { data: subscriptions } = useCalendarSubscriptions();
  const updateSub = useUpdateCalendarSubscription();
  const setEvents = useSubscriptionStore((s) => s.setEvents);
  const clearEvents = useSubscriptionStore((s) => s.clearEvents);
  const setSyncStatus = useSubscriptionStore((s) => s.setSyncStatus);
  const hasSyncedRef = useRef(false);

  const syncSubscription = useCallback(
    async (sub: CalendarSubscription) => {
      if (!sub.is_enabled) return;
      setSyncStatus(sub.id, 'syncing');

      try {
        const result = await fetchIcs(sub.url, sub.etag);

        if (result === null) {
          // 304 Not Modified
          setSyncStatus(sub.id, 'idle');
          return;
        }

        const events = parseIcsToEvents(
          result.body,
          sub.id,
          sub.color,
          sub.provider,
        );

        setEvents(sub.id, events);
        setSyncStatus(sub.id, 'idle');

        updateSub.mutate({
          id: sub.id,
          patch: {
            last_synced_at: new Date().toISOString(),
            etag: result.etag ?? null,
            error_message: null,
          },
        });
      } catch (err) {
        setSyncStatus(sub.id, 'error');
        updateSub.mutate({
          id: sub.id,
          patch: {
            error_message:
              err instanceof Error ? err.message : 'Sync failed',
          },
        });
      }
    },
    [setSyncStatus, setEvents, updateSub],
  );

  const syncAll = useCallback(async () => {
    if (!subscriptions?.length) return;
    await Promise.allSettled(
      subscriptions
        .filter((s) => s.is_enabled)
        .map((s) => syncSubscription(s)),
    );
  }, [subscriptions, syncSubscription]);

  // Sync on mount (only once when subscriptions first load)
  useEffect(() => {
    if (!subscriptions?.length || hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    syncAll();
  }, [subscriptions, syncAll]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(syncAll, SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [syncAll]);

  // Clean up events for removed subscriptions
  useEffect(() => {
    if (!subscriptions) return;
    const activeIds = new Set(subscriptions.map((s) => s.id));
    const store = useSubscriptionStore.getState();
    for (const key of Object.keys(store.eventsBySubscription)) {
      if (!activeIds.has(key)) {
        clearEvents(key);
      }
    }
  }, [subscriptions, clearEvents]);

  return { syncAll, syncSubscription };
}
