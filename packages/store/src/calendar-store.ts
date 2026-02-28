import { create } from 'zustand';
import type { CalendarEvent } from './types';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

export type CalendarStoreState = {
  // State
  events: CalendarEvent[];
  selectedDate: Date;
  selectedEventId: string | null;
  viewMode: CalendarViewMode;

  // Actions
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  selectDate: (date: Date) => void;
  selectEvent: (id: string | null) => void;
  setViewMode: (mode: CalendarViewMode) => void;

  navigateMonthPrev: () => void;
  navigateMonthNext: () => void;
  navigateWeekPrev: () => void;
  navigateWeekNext: () => void;
  navigateDayPrev: () => void;
  navigateDayNext: () => void;

  // Computed
  eventsForSelectedDate: () => CalendarEvent[];
  eventsForSelectedMonth: () => CalendarEvent[];
};

/**
 * Check if two date ranges overlap.
 * An event overlaps a range [rangeStart, rangeEnd) if
 * event.start_at < rangeEnd AND event.end_at > rangeStart.
 */
const eventOverlapsRange = (
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): boolean => {
  const eventStart = new Date(event.start_at);
  const eventEnd = new Date(event.end_at);
  return eventStart < rangeEnd && eventEnd > rangeStart;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const startOfMonth = (date: Date): Date => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfMonth = (date: Date): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 1);
  result.setHours(0, 0, 0, 0);
  return result;
};

const patchEvent = (
  events: CalendarEvent[],
  id: string,
  patch: Partial<CalendarEvent>,
): CalendarEvent[] =>
  events.map((e) => (e.id === id ? { ...e, ...patch } : e));

export const useCalendarStore = create<CalendarStoreState>()((set, get) => ({
  // Initial state
  events: [],
  selectedDate: new Date(),
  selectedEventId: null,
  viewMode: 'month',

  // Event CRUD
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  updateEvent: (id, patch) =>
    set((s) => ({ events: patchEvent(s.events, id, patch) })),
  deleteEvent: (id) =>
    set((s) => ({
      events: patchEvent(s.events, id, { is_deleted: true }),
    })),

  // Selection
  selectDate: (date) => set({ selectedDate: date }),
  selectEvent: (id) => set({ selectedEventId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),

  // Navigation
  navigateMonthPrev: () =>
    set((s) => ({ selectedDate: addMonths(s.selectedDate, -1) })),
  navigateMonthNext: () =>
    set((s) => ({ selectedDate: addMonths(s.selectedDate, 1) })),
  navigateWeekPrev: () =>
    set((s) => ({ selectedDate: addDays(s.selectedDate, -7) })),
  navigateWeekNext: () =>
    set((s) => ({ selectedDate: addDays(s.selectedDate, 7) })),
  navigateDayPrev: () =>
    set((s) => ({ selectedDate: addDays(s.selectedDate, -1) })),
  navigateDayNext: () =>
    set((s) => ({ selectedDate: addDays(s.selectedDate, 1) })),

  // Computed: events for the selected day
  eventsForSelectedDate: () => {
    const { events, selectedDate } = get();
    const dayStart = startOfDay(selectedDate);
    const dayEnd = addDays(dayStart, 1);

    return events
      .filter((e) => !e.is_deleted && eventOverlapsRange(e, dayStart, dayEnd))
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  },

  // Computed: events for the selected month
  eventsForSelectedMonth: () => {
    const { events, selectedDate } = get();
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    return events
      .filter(
        (e) => !e.is_deleted && eventOverlapsRange(e, monthStart, monthEnd),
      )
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  },
}));
