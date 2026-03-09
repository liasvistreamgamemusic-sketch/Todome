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

    return [...local, ...external, ...shared].sort((a, b) =>
      a.event.start_at.localeCompare(b.event.start_at),
    );
  }, [localEvents, externalEventsMap, sharedEvents, sharedCalendars]);

  return { events: merged, isLoading: localLoading || sharedLoading };
}
