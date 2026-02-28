/**
 * RRULE utility functions for recurring calendar events.
 *
 * Wraps the `rrule` library to provide a simple API for
 * parsing, generating occurrences, and creating RRULE strings.
 */

import { RRule, type Options as RRuleOptions } from 'rrule';
import type { CalendarEvent } from '@todome/store';

/**
 * Parse an RRULE string into an RRule instance.
 */
export const parseRepeatRule = (rule: string): RRule => {
  return RRule.fromString(rule);
};

/**
 * Expand a recurring event into individual occurrences within a date range.
 *
 * Each occurrence is a shallow copy of the original event with adjusted
 * start_at / end_at values. The `id` is suffixed with the occurrence
 * index to keep them unique in lists.
 */
export const generateOccurrences = (
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] => {
  if (!event.repeat_rule) {
    return [event];
  }

  const rrule = parseRepeatRule(event.repeat_rule);
  const eventStart = new Date(event.start_at);
  const eventEnd = new Date(event.end_at);
  const durationMs = eventEnd.getTime() - eventStart.getTime();

  // rrule.between is exclusive on both ends by default;
  // we pass inc=true to include the boundaries.
  const occurrenceDates = rrule.between(rangeStart, rangeEnd, true);

  return occurrenceDates.map((occDate, idx) => {
    const occEnd = new Date(occDate.getTime() + durationMs);
    return {
      ...event,
      id: `${event.id}_occ_${idx}`,
      start_at: occDate.toISOString(),
      end_at: occEnd.toISOString(),
      repeat_parent_id: event.id,
    };
  });
};

type CreateRepeatRuleOptions = {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  byDay?: number[];
  count?: number;
  until?: Date;
};

const FREQ_MAP: Record<CreateRepeatRuleOptions['freq'], number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
};

/**
 * Create an RRULE string from a simplified options object.
 *
 * `byDay` uses RRule weekday constants (0=MO, 1=TU, ..., 6=SU).
 */
export const createRepeatRule = (options: CreateRepeatRuleOptions): string => {
  const rruleOpts: Partial<RRuleOptions> = {
    freq: FREQ_MAP[options.freq],
    interval: options.interval ?? 1,
  };

  if (options.byDay && options.byDay.length > 0) {
    const weekdays = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];
    rruleOpts.byweekday = options.byDay.map((d) => weekdays[d]!);
  }

  if (options.count !== undefined) {
    rruleOpts.count = options.count;
  }

  if (options.until !== undefined) {
    rruleOpts.until = options.until;
  }

  const rule = new RRule(rruleOpts);
  return rule.toString();
};
