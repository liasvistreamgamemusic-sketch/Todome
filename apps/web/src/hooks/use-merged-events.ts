'use client';

import { useMemo } from 'react';
import { useCalendarEvents } from '@/hooks/queries';
import { useSubscriptionStore } from '@todome/store';
import type { DisplayEvent } from '@todome/db';

export function useMergedEvents(): {
  events: DisplayEvent[];
  isLoading: boolean;
} {
  const { data: localEvents = [], isLoading } = useCalendarEvents();
  const externalEventsMap = useSubscriptionStore((s) => s.eventsBySubscription);

  const merged = useMemo<DisplayEvent[]>(() => {
    const local: DisplayEvent[] = localEvents
      .filter((e) => !e.is_deleted)
      .map((event) => ({ source: 'local' as const, event }));

    const external: DisplayEvent[] = [];
    for (const events of Object.values(externalEventsMap)) {
      for (const event of events) {
        external.push({ source: 'external' as const, event });
      }
    }

    return [...local, ...external].sort((a, b) =>
      a.event.start_at.localeCompare(b.event.start_at),
    );
  }, [localEvents, externalEventsMap]);

  return { events: merged, isLoading };
}
