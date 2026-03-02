import { create } from 'zustand';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

export type CalendarStoreState = {
  selectedDate: Date;
  selectedEventId: string | null;
  viewMode: CalendarViewMode;

  selectDate: (date: Date) => void;
  selectEvent: (id: string | null) => void;
  setViewMode: (mode: CalendarViewMode) => void;

  navigateMonthPrev: () => void;
  navigateMonthNext: () => void;
  navigateWeekPrev: () => void;
  navigateWeekNext: () => void;
  navigateDayPrev: () => void;
  navigateDayNext: () => void;
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

export const useCalendarStore = create<CalendarStoreState>()((set) => ({
  selectedDate: new Date(),
  selectedEventId: null,
  viewMode: 'month',

  selectDate: (date) => set({ selectedDate: date }),
  selectEvent: (id) => set({ selectedEventId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),

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
}));
