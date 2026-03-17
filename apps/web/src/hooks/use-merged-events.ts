'use client';

import { useMemo } from 'react';
import {
  useCalendarEvents,
  useSharedCalendars,
  useSharedCalendarEvents,
} from '@/hooks/queries';
import { useSubscriptionStore } from '@todome/store';
import type { DisplayEvent } from '@todome/db';

export function useMergedEvents(): {
  events: DisplayEvent[];
  isLoading: boolean;
} {
  const { data: localEvents = [], isLoading: localLoading } =
    useCalendarEvents();
  const externalEventsMap = useSubscriptionStore(
    (s) => s.eventsBySubscription,
  );
  const { data: sharedCalendars = [] } = useSharedCalendars();
  const { data: sharedEvents = [], isLoading: sharedLoading } =
    useSharedCalendarEvents();

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

    const calendarMap = new Map(sharedCalendars.map((c) => [c.id, c]));
    const shared: DisplayEvent[] = sharedEvents
      .filter((e) => !e.is_deleted)
      .map((event) => ({
        source: 'shared' as const,
        event,
        calendar: calendarMap.get(event.shared_calendar_id)!,
      }))
      .filter((d) => d.calendar != null);

    // Deduplicate: when same event exists in personal + shared calendars,
    // keep personal as primary and skip duplicates from shared.
    const all = [...local, ...external, ...shared];
    const seen = new Set<string>();
    for (const d of local) {
      const key = `${d.event.title}|${d.event.start_at}|${d.event.end_at}`;
      seen.add(key);
    }
    const deduped = all.filter((d) => {
      if (d.source !== 'shared') return true;
      const key = `${d.event.title}|${d.event.start_at}|${d.event.end_at}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.sort((a, b) =>
      a.event.start_at.localeCompare(b.event.start_at),
    );
  }, [localEvents, externalEventsMap, sharedEvents, sharedCalendars]);

  return { events: merged, isLoading: localLoading || sharedLoading };
}
