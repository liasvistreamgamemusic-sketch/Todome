import type { CalendarEvent } from '@todome/db';

function eventOverlapsRange(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const eventStart = new Date(event.start_at);
  const eventEnd = new Date(event.end_at);
  return eventStart < rangeEnd && eventEnd > rangeStart;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function eventsForDate(
  events: CalendarEvent[],
  date: Date,
): CalendarEvent[] {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);

  return events
    .filter((e) => !e.is_deleted && eventOverlapsRange(e, dayStart, dayEnd))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
}

export function eventsForMonth(
  events: CalendarEvent[],
  date: Date,
): CalendarEvent[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  return events
    .filter(
      (e) => !e.is_deleted && eventOverlapsRange(e, monthStart, monthEnd),
    )
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
}
