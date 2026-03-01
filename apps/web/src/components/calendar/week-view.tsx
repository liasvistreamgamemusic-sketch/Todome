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
import { BookOpen, CheckSquare } from 'lucide-react';
import { useCalendarStore, useUiStore, useTodoStore } from '@todome/store';
import type { CalendarEvent, Todo } from '@todome/store';
import { useIsMobile } from '@todome/hooks';
import { CalendarEventBlock } from './calendar-event-block';
import { isHoliday } from '@/lib/japanese-holidays';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';

type Props = {
  onCreateEvent: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenDiary: (date: Date) => void;
};

const TOTAL_HOURS = 24;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export const WeekView = ({ onCreateEvent, onSelectEvent, onOpenDiary }: Props) => {
  const isMobile = useIsMobile();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const events = useCalendarStore((s) => s.events);
  const selectDate = useCalendarStore((s) => s.selectDate);
  const weekStart = useUiStore((s) => s.calendarWeekStart);
  const todos = useTodoStore((s) => s.todos);
  const navigateWeekPrev = useCalendarStore((s) => s.navigateWeekPrev);
  const navigateWeekNext = useCalendarStore((s) => s.navigateWeekNext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState(0);
  const swipe = useSwipeNavigation(navigateWeekNext, navigateWeekPrev);

  const hourHeight = isMobile ? 48 : 60;

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

  // For mobile: events for selected day only
  const selectedDayAllDay = useMemo(() => {
    if (!isMobile) return [];
    const dayS = startOfDay(selectedDate);
    const dayE = endOfDay(selectedDate);
    return activeEvents.filter((e) => {
      if (!e.is_all_day) return false;
      const eventStart = parseISO(e.start_at);
      const eventEnd = parseISO(e.end_at);
      return eventStart <= dayE && eventEnd >= dayS;
    });
  }, [isMobile, selectedDate, activeEvents]);

  const selectedDayTimed = useMemo(() => {
    if (!isMobile) return [];
    const dayS = startOfDay(selectedDate);
    const dayE = endOfDay(selectedDate);
    return activeEvents.filter((e) => {
      if (e.is_all_day) return false;
      const eventStart = parseISO(e.start_at);
      const eventEnd = parseISO(e.end_at);
      return eventStart < dayE && eventEnd > dayS;
    });
  }, [isMobile, selectedDate, activeEvents]);

  // For mobile: todos for selected day
  const dueTodos = useMemo(() => {
    if (!isMobile) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return todos.filter(
      (t) =>
        !t.is_deleted &&
        t.due_date === dateKey &&
        t.status !== 'completed' &&
        t.status !== 'cancelled',
    );
  }, [isMobile, selectedDate, todos]);

  // For desktop: all-day events by day
  const allDayEvents = useMemo(() => {
    if (isMobile) return new Map<string, CalendarEvent[]>();
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
  }, [isMobile, weekDays, activeEvents]);

  // For desktop: timed events by day
  const timedEvents = useMemo(() => {
    if (isMobile) return new Map<string, CalendarEvent[]>();
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
  }, [isMobile, weekDays, activeEvents]);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const topPx = (now.getHours() + now.getMinutes() / 60) * hourHeight;
      scrollRef.current.scrollTop = Math.max(0, topPx - 200);
    }
  }, [hourHeight]);

  // Update current time indicator
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTimeTop((now.getHours() + now.getMinutes() / 60) * hourHeight);
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [hourHeight]);

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

      const top = (topMinutes / 60) * hourHeight;
      const height = Math.max((durationMinutes / 60) * hourHeight, 20);

      return { top: `${top}px`, height: `${height}px` };
    },
    [hourHeight],
  );

  const handleTimeSlotClick = useCallback(
    (day: Date, hour: number) => {
      const target = setMinutes(setHours(day, hour), 0);
      selectDate(target);
      onCreateEvent(target);
    },
    [selectDate, onCreateEvent],
  );

  const isCurrentDay = isToday(selectedDate);

  // ─── MOBILE LAYOUT ─────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden" {...swipe}>
        {/* Week day strip */}
        <div className="grid grid-cols-7 border-b border-[var(--border)]">
          {weekDays.map((day) => {
            const holidayName = isHoliday(day);
            const isSun = day.getDay() === 0;
            const isSat = day.getDay() === 6;
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => selectDate(day)}
                className={clsx(
                  'flex flex-col items-center py-1.5 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]',
                )}
              >
                <span
                  className={clsx(
                    'text-[10px]',
                    (isSun || holidayName) && 'text-[#D32F2F]',
                    isSat && !holidayName && 'text-[#4285F4]',
                    !isSun && !isSat && !holidayName && 'text-text-secondary',
                  )}
                >
                  {DAY_LABELS[day.getDay()]}
                </span>
                <span
                  className={clsx(
                    'mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                    today && 'bg-[var(--accent)] text-white',
                    selected && !today && 'ring-2 ring-[var(--accent)]',
                    !today && isSun && 'text-[#D32F2F]',
                    !today && isSat && 'text-[#4285F4]',
                    !today && !isSun && !isSat && 'text-text-primary',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected day all-day events */}
        {selectedDayAllDay.length > 0 && (
          <div className="flex items-start gap-2 border-b border-[var(--border)] px-3 py-1.5">
            <span className="shrink-0 pt-1 text-[10px] text-text-tertiary">終日</span>
            <div className="flex flex-1 flex-wrap gap-1">
              {selectedDayAllDay.map((event) => (
                <CalendarEventBlock key={event.id} event={event} onClick={onSelectEvent} />
              ))}
            </div>
          </div>
        )}

        {/* Selected day time grid */}
        <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
          <div className="w-10 shrink-0">
            {hours.map((hour) => (
              <div
                key={hour.toISOString()}
                className="flex items-start justify-end pr-2"
                style={{ height: `${hourHeight}px` }}
              >
                <span className="text-[10px] text-text-tertiary -translate-y-2">
                  {format(hour, 'H:00')}
                </span>
              </div>
            ))}
          </div>

          <div className="relative flex-1">
            {hours.map((hour, idx) => (
              <button
                key={hour.toISOString()}
                type="button"
                onClick={() => handleTimeSlotClick(selectedDate, idx)}
                className={clsx(
                  'block w-full border-b border-[var(--border)]/50',
                  'hover:bg-bg-secondary/50 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]',
                )}
                style={{ height: `${hourHeight}px` }}
                aria-label={`${idx}:00 に予定を作成`}
              />
            ))}

            {/* 30-minute dividers */}
            {hours.map((hour, idx) => (
              <div
                key={`half-${hour.toISOString()}`}
                className="absolute left-0 right-0 border-b border-dashed border-[var(--border)]/30 pointer-events-none"
                style={{ top: `${idx * hourHeight + hourHeight / 2}px` }}
              />
            ))}

            {/* Timed events */}
            {selectedDayTimed.map((event) => {
              const pos = getEventPosition(event, selectedDate);
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
        </div>

        {/* Todos due on selected day */}
        {dueTodos.length > 0 && (
          <div className="border-t border-[var(--border)] px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="text-xs font-medium text-text-secondary">
                この日のTodo ({dueTodos.length})
              </span>
            </div>
            <ul className="space-y-0.5">
              {dueTodos.map((todo) => (
                <MobileTodoItem key={todo.id} todo={todo} />
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ─── DESKTOP LAYOUT (unchanged) ────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col overflow-hidden" {...swipe}>
      {/* Header row */}
      <div className="flex border-b border-[var(--border)]">
        <div className="w-14 shrink-0" />
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
                  <CalendarEventBlock key={event.id} event={event} onClick={onSelectEvent} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
        <div className="w-14 shrink-0">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="flex h-[60px] items-start justify-end pr-2 pt-[-6px]"
              style={{ height: `${hourHeight}px` }}
            >
              <span className="text-[10px] text-text-tertiary -translate-y-2">
                {format(hour, 'H:00')}
              </span>
            </div>
          ))}
        </div>

        <div className="relative grid flex-1 grid-cols-7">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTimed = timedEvents.get(dateKey) ?? [];
            const dayIsToday = isToday(day);

            return (
              <div
                key={dateKey}
                className={clsx(
                  'relative border-r border-[var(--border)]',
                  dayIsToday && 'bg-[var(--accent)]/[0.03]',
                )}
              >
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
                    style={{ height: `${hourHeight}px` }}
                    aria-label={`${format(day, 'M/d')} ${idx}:00 に予定を作成`}
                  />
                ))}

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

                {dayIsToday && (
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

const MobileTodoItem = ({ todo }: { todo: Todo }) => {
  const priorityColors: Record<number, string> = {
    1: 'bg-[#D32F2F]',
    2: 'bg-[#F57C00]',
    3: 'bg-[#4285F4]',
    4: 'bg-text-tertiary',
  };

  return (
    <li className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-text-primary hover:bg-bg-secondary transition-colors">
      <span
        className={clsx(
          'h-2 w-2 shrink-0 rounded-full',
          priorityColors[todo.priority] ?? 'bg-text-tertiary',
        )}
      />
      <span className="truncate">{todo.title}</span>
    </li>
  );
};
