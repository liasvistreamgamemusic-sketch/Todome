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

/** Extract date components from ICAL.Time without timezone conversion. */
function icalDateToISO(t: ICAL.Time): string {
  const y = t.year;
  const m = String(t.month).padStart(2, '0');
  const d = String(t.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Convert all-day event dates to ISO strings without TZ shift.
 * For VALUE=DATE types, ical.js toJSDate() applies local TZ offset
 * which shifts dates when serialized to UTC via toISOString().
 * ICS spec: DTEND is exclusive for all-day events, so we subtract 1 day.
 */
function allDayDates(
  dtstart: ICAL.Time,
  dtend: ICAL.Time | null,
): { startAt: string; endAt: string } {
  const startAt = `${icalDateToISO(dtstart)}T00:00:00.000`;
  if (dtend && dtend.isDate) {
    const inclusive = dtend.clone();
    inclusive.day -= 1;
    return { startAt, endAt: `${icalDateToISO(inclusive)}T23:59:59.999` };
  }
  return { startAt, endAt: startAt };
}

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

  let startAt: string;
  let endAt: string;
  if (isAllDay) {
    ({ startAt, endAt } = allDayDates(dtstart, dtend));
  } else {
    startAt = dtstart.toJSDate().toISOString();
    endAt = dtend ? dtend.toJSDate().toISOString() : startAt;
  }

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
      const isAllDay = next.isDate;
      const duration = event.duration;
      const endDate = next.clone();
      if (duration) {
        endDate.addDuration(duration);
      }

      let startAt: string;
      let endAt: string;
      if (isAllDay) {
        ({ startAt, endAt } = allDayDates(next, endDate));
      } else {
        startAt = occurrenceDate.toISOString();
        endAt = endDate.toJSDate().toISOString();
      }

      events.push({
        id: `${subscriptionId}:${uid}:${next.toICALString()}`,
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
    // Normalize webcal:// to https:// before parsing
    const normalized = url.replace(/^webcal:\/\//i, 'https://');
    const hostname = new URL(normalized).hostname.toLowerCase();

    if (hostname.includes('google.com') || hostname.includes('googleapis.com')) {
      return 'google';
    }
    if (
      hostname.includes('outlook.live.com') ||
      hostname.includes('outlook.office365.com') ||
      hostname.includes('outlook.office.com') ||
      hostname.includes('calendar.live.com') ||
      hostname.includes('calendar.office365.com') ||
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

/** Known Outlook privacy-placeholder summaries. */
const OUTLOOK_PLACEHOLDER_TITLES = new Set([
  '仮の予定',
  '空き時間',
  '予定あり',
  'Tentative',
  'Free',
  'Busy',
]);

/** Check whether a title is an Outlook free/busy placeholder. */
export function isOutlookPlaceholderTitle(title: string): boolean {
  return OUTLOOK_PLACEHOLDER_TITLES.has(title.trim());
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
