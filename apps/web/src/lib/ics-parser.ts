import ICAL from 'ical.js';
import { addMonths, subMonths } from 'date-fns';

export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'other';

export type ParsedExternalEvent = {
  id: string;
  subscription_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  location: string | null;
  color: string;
  provider: CalendarProvider;
  ics_uid: string;
};

const MAX_EVENTS_PER_SUBSCRIPTION = 2000;

/**
 * Parse ICS text into ExternalCalendarEvent array.
 */
export function parseIcsToEvents(
  icsText: string,
  subscriptionId: string,
  color: string,
  provider: CalendarProvider,
): ParsedExternalEvent[] {
  const jcalData = ICAL.parse(icsText);
  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents('vevent');

  const now = new Date();
  const rangeStart = subMonths(now, 6);
  const rangeEnd = addMonths(now, 6);

  const events: ParsedExternalEvent[] = [];

  for (const vevent of vevents) {
    if (events.length >= MAX_EVENTS_PER_SUBSCRIPTION) break;

    try {
      const event = new ICAL.Event(vevent);
      const uid = event.uid ?? vevent.getFirstPropertyValue('uid') ?? '';

      if (event.isRecurring()) {
        expandRecurringEvent(
          event,
          uid,
          subscriptionId,
          color,
          provider,
          rangeStart,
          rangeEnd,
          events,
        );
      } else {
        const parsed = parseSingleEvent(
          event,
          uid,
          subscriptionId,
          color,
          provider,
        );
        if (parsed) events.push(parsed);
      }
    } catch {
      // Skip malformed events
    }
  }

  return events;
}

function parseSingleEvent(
  event: ICAL.Event,
  uid: string,
  subscriptionId: string,
  color: string,
  provider: CalendarProvider,
): ParsedExternalEvent | null {
  const dtstart = event.startDate;
  const dtend = event.endDate;
  if (!dtstart) return null;

  const isAllDay = dtstart.isDate;
  const startAt = dtstart.toJSDate().toISOString();
  const endAt = dtend
    ? dtend.toJSDate().toISOString()
    : startAt;

  return {
    id: `${subscriptionId}:${uid}`,
    subscription_id: subscriptionId,
    title: event.summary ?? '(Untitled)',
    description: event.description ?? null,
    start_at: startAt,
    end_at: endAt,
    is_all_day: isAllDay,
    location: event.location ?? null,
    color,
    provider,
    ics_uid: uid,
  };
}

function expandRecurringEvent(
  event: ICAL.Event,
  uid: string,
  subscriptionId: string,
  color: string,
  provider: CalendarProvider,
  rangeStart: Date,
  rangeEnd: Date,
  events: ParsedExternalEvent[],
): void {
  const iterator = event.iterator();
  let next = iterator.next();
  let count = 0;
  const maxOccurrences = 200;

  while (next && count < maxOccurrences) {
    if (events.length >= MAX_EVENTS_PER_SUBSCRIPTION) return;

    const occurrenceDate = next.toJSDate();

    if (occurrenceDate > rangeEnd) break;

    if (occurrenceDate >= rangeStart) {
      const duration = event.duration;
      const endDate = next.clone();
      if (duration) {
        endDate.addDuration(duration);
      }

      events.push({
        id: `${subscriptionId}:${uid}:${next.toICALString()}`,
        subscription_id: subscriptionId,
        title: event.summary ?? '(Untitled)',
        description: event.description ?? null,
        start_at: occurrenceDate.toISOString(),
        end_at: endDate.toJSDate().toISOString(),
        is_all_day: next.isDate,
        location: event.location ?? null,
        color,
        provider,
        ics_uid: uid,
      });
    }

    next = iterator.next();
    count++;
  }
}

/**
 * Auto-detect provider from ICS URL domain.
 */
export function detectProvider(url: string): CalendarProvider {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes('google.com') || hostname.includes('googleapis.com')) {
      return 'google';
    }
    if (
      hostname.includes('outlook.live.com') ||
      hostname.includes('outlook.office365.com') ||
      hostname.includes('outlook.office.com') ||
      hostname.includes('microsoft.com')
    ) {
      return 'outlook';
    }
    if (hostname.includes('icloud.com') || hostname.includes('apple.com')) {
      return 'apple';
    }

    return 'other';
  } catch {
    return 'other';
  }
}

/**
 * Infer subscription name from ICS data or URL.
 */
export function inferSubscriptionName(icsText: string, url: string): string {
  try {
    const jcalData = ICAL.parse(icsText);
    const comp = new ICAL.Component(jcalData);
    const calName = comp.getFirstPropertyValue('x-wr-calname');
    if (calName && typeof calName === 'string') return calName;
  } catch {
    // Fall through
  }

  try {
    return new URL(url).hostname;
  } catch {
    return 'External Calendar';
  }
}
