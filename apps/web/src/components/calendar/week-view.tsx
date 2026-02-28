'use client';

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval,
  startOfDay,
  endOfDay,
  isSameDay,
  isToday,
  format,
  parseISO,
  differenceInMinutes,
  addHours,
  setHours,
  setMinutes,
} from 'date-fns';
import { useCalendarStore, useUiStore } from '@todome/store';
import type { CalendarEvent } from '@todome/store';
import { CalendarEventBlock } from './calendar-event-block';
import { isHoliday } from '@/lib/japanese-holidays';

type Props = {
  onCreateEvent: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
};

const HOUR_HEIGHT = 60; // px per hour
const TOTAL_HOURS = 24;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export const WeekView = ({ onCreateEvent, onSelectEvent }: Props) => {
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const events = useCalendarStore((s) => s.events);
  const selectDate = useCalendarStore((s) => s.selectDate);
  const weekStart = useUiStore((s) => s.calendarWeekStart);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState(0);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: weekStart });
    const end = endOfWeek(selectedDate, { weekStartsOn: weekStart });
    return eachDayOfInterval({ start, end });
  }, [selectedDate, weekStart]);

  const hours = useMemo(() => {
    const dayStart = startOfDay(new Date());
    return eachHourOfInterval({
      start: dayStart,
      end: addHours(dayStart, TOTAL_HOURS - 1),
    });
  }, []);

  const activeEvents = useMemo(
    () => events.filter((e) => !e.is_deleted),
    [events],
  );

  const allDayEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of weekDays) {
      const dateKey = format(day, 'yyyy-MM-dd');
      map.set(
        dateKey,
        activeEvents.filter((e) => {
          if (!e.is_all_day) return false;
          const eventStart = parseISO(e.start_at);
          const eventEnd = parseISO(e.end_at);
          return eventStart <= endOfDay(day) && eventEnd >= startOfDay(day);
        }),
      );
    }
    return map;
  }, [weekDays, activeEvents]);

  const timedEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of weekDays) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayS = startOfDay(day);
      const dayE = endOfDay(day);
      map.set(
        dateKey,
        activeEvents.filter((e) => {
          if (e.is_all_day) return false;
          const eventStart = parseISO(e.start_at);
          const eventEnd = parseISO(e.end_at);
          return eventStart < dayE && eventEnd > dayS;
        }),
      );
    }
    return map;
  }, [weekDays, activeEvents]);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const topPx = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, topPx - 200);
    }
  }, []);

  // Update current time indicator
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTimeTop((now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT);
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  const getEventPosition = useCallback(
    (event: CalendarEvent, day: Date) => {
      const eventStart = parseISO(event.start_at);
      const eventEnd = parseISO(event.end_at);
      const dayS = startOfDay(day);
      const dayE = endOfDay(day);

      const clampedStart = eventStart < dayS ? dayS : eventStart;
      const clampedEnd = eventEnd > dayE ? dayE : eventEnd;

      const topMinutes = differenceInMinutes(clampedStart, dayS);
      const durationMinutes = differenceInMinutes(clampedEnd, clampedStart);

      const top = (topMinutes / 60) * HOUR_HEIGHT;
      const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);

      return { top: `${top}px`, height: `${height}px` };
    },
    [],
  );

  const handleTimeSlotClick = useCallback(
    (day: Date, hour: number) => {
      const target = setMinutes(setHours(day, hour), 0);
      selectDate(target);
      onCreateEvent(target);
    },
    [selectDate, onCreateEvent],
  );

  const todayInWeek = weekDays.some((d) => isToday(d));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header row */}
      <div className="flex border-b border-[var(--border)]">
        {/* Time axis spacer */}
        <div className="w-14 shrink-0" />

        {/* Day headers */}
        <div className="grid flex-1 grid-cols-7">
          {weekDays.map((day) => {
            const holidayName = isHoliday(day);
            const isSun = day.getDay() === 0;
            const isSat = day.getDay() === 6;
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => selectDate(day)}
                className={clsx(
                  'flex flex-col items-center py-2 text-center transition-colors hover:bg-bg-secondary',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]',
                )}
              >
                <span
                  className={clsx(
                    'text-xs',
                    isSun && 'text-[#D32F2F]',
                    isSat && 'text-[#4285F4]',
                    !isSun && !isSat && 'text-text-secondary',
                    holidayName && 'text-[#D32F2F]',
                  )}
                >
                  {DAY_LABELS[day.getDay()]}
                </span>
                <span
                  className={clsx(
                    'mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                    isToday(day) && 'bg-[var(--accent)] text-white',
                    isSameDay(day, selectedDate) && !isToday(day) && 'ring-2 ring-[var(--accent)]',
                    !isToday(day) && isSun && 'text-[#D32F2F]',
                    !isToday(day) && isSat && 'text-[#4285F4]',
                    !isToday(day) && !isSun && !isSat && 'text-text-primary',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {holidayName && (
                  <span className="mt-0.5 truncate text-[9px] text-[#D32F2F] max-w-full px-1">
                    {holidayName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* All-day events row */}
      <div className="flex border-b border-[var(--border)] min-h-[32px]">
        <div className="w-14 shrink-0 flex items-center justify-center text-[10px] text-text-tertiary">
          終日
        </div>
        <div className="grid flex-1 grid-cols-7">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayAllDay = allDayEvents.get(dateKey) ?? [];
            return (
              <div
                key={dateKey}
                className="flex flex-col gap-px border-r border-[var(--border)] p-0.5 min-h-[28px]"
              >
                {dayAllDay.map((event) => (
                  <CalendarEventBlock
                    key={event.id}
                    event={event}
                    onClick={onSelectEvent}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
        {/* Time labels */}
        <div className="w-14 shrink-0">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="flex h-[60px] items-start justify-end pr-2 pt-[-6px]"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              <span className="text-[10px] text-text-tertiary -translate-y-2">
                {format(hour, 'H:00')}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="relative grid flex-1 grid-cols-7">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTimed = timedEvents.get(dateKey) ?? [];
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dateKey}
                className={clsx(
                  'relative border-r border-[var(--border)]',
                  isCurrentDay && 'bg-[var(--accent)]/[0.03]',
                )}
              >
                {/* Hour slot lines */}
                {hours.map((hour, idx) => (
                  <button
                    key={hour.toISOString()}
                    type="button"
                    onClick={() => handleTimeSlotClick(day, idx)}
                    className={clsx(
                      'block w-full border-b border-[var(--border)]/50',
                      'hover:bg-bg-secondary/50 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]',
                    )}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    aria-label={`${format(day, 'M/d')} ${idx}:00 に予定を作成`}
                  />
                ))}

                {/* Timed events */}
                {dayTimed.map((event) => {
                  const pos = getEventPosition(event, day);
                  return (
                    <CalendarEventBlock
                      key={event.id}
                      event={event}
                      positioned
                      top={pos.top}
                      height={pos.height}
                      onClick={onSelectEvent}
                    />
                  );
                })}

                {/* Current time indicator */}
                {isCurrentDay && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${currentTimeTop}px` }}
                  >
                    <div className="relative flex items-center">
                      <span className="absolute -left-1 h-2.5 w-2.5 rounded-full bg-[#D32F2F]" />
                      <span className="h-[2px] w-full bg-[#D32F2F]" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
