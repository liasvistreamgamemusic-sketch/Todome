'use client';

import { useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isWeekend,
  format,
  parseISO,
} from 'date-fns';
import { useCalendarStore, useUiStore, useTodoStore } from '@todome/store';
import type { CalendarEvent } from '@todome/store';
import { useIsMobile } from '@todome/hooks';
import { isHoliday } from '@/lib/japanese-holidays';

type Props = {
  onCreateEvent: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
};

const DAY_LABELS_SUN: string[] = ['日', '月', '火', '水', '木', '金', '土'];
const DAY_LABELS_MON: string[] = ['月', '火', '水', '木', '金', '土', '日'];

export const MonthView = ({ onCreateEvent, onSelectEvent }: Props) => {
  const isMobile = useIsMobile();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const events = useCalendarStore((s) => s.events);
  const selectDate = useCalendarStore((s) => s.selectDate);
  const weekStart = useUiStore((s) => s.calendarWeekStart);
  const todos = useTodoStore((s) => s.todos);

  const maxVisibleEvents = isMobile ? 1 : 3;

  const dayLabels = weekStart === 0 ? DAY_LABELS_SUN : DAY_LABELS_MON;

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: weekStart });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: weekStart });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [selectedDate, weekStart]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const activeEvents = events.filter((e) => !e.is_deleted);

    for (const event of activeEvents) {
      const dateKey = format(parseISO(event.start_at), 'yyyy-MM-dd');
      const existing = map.get(dateKey);
      if (existing) {
        existing.push(event);
      } else {
        map.set(dateKey, [event]);
      }
    }
    return map;
  }, [events]);

  const todosWithDueDate = useMemo(() => {
    const map = new Map<string, number>();
    const activeTodos = todos.filter(
      (t) => !t.is_deleted && t.due_date && t.status !== 'completed' && t.status !== 'cancelled',
    );
    for (const todo of activeTodos) {
      if (todo.due_date) {
        const count = map.get(todo.due_date) ?? 0;
        map.set(todo.due_date, count + 1);
      }
    }
    return map;
  }, [todos]);

  const handleDateClick = useCallback(
    (day: Date) => {
      if (isMobile) {
        selectDate(day);
        const { setViewMode } = useCalendarStore.getState();
        setViewMode('day');
        return;
      }
      selectDate(day);
    },
    [selectDate, isMobile],
  );

  const handleDateDoubleClick = useCallback(
    (day: Date) => {
      onCreateEvent(day);
    },
    [onCreateEvent],
  );

  const weekCount = calendarDays.length / 7;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {dayLabels.map((label, i) => {
          const isSun = (weekStart === 0 && i === 0) || (weekStart === 1 && i === 6);
          const isSat = (weekStart === 0 && i === 6) || (weekStart === 1 && i === 5);
          return (
            <div
              key={label}
              className={clsx(
                'py-1.5 text-center text-xs font-medium md:py-2',
                isSun && 'text-[#D32F2F]',
                isSat && 'text-[#4285F4]',
                !isSun && !isSat && 'text-text-secondary',
              )}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div
        className="grid flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
      >
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          const todoCount = todosWithDueDate.get(dateKey) ?? 0;
          const holidayName = isHoliday(day);
          const inMonth = isSameMonth(day, selectedDate);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const weekend = isWeekend(day);
          const dayOfWeek = day.getDay();
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;

          const visibleEvents = dayEvents.slice(0, maxVisibleEvents);
          const overflowCount = dayEvents.length - maxVisibleEvents;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => handleDateClick(day)}
              onDoubleClick={() => handleDateDoubleClick(day)}
              className={clsx(
                'flex flex-col gap-0.5 border-b border-r border-[var(--border)] p-1 text-left',
                'transition-colors duration-100',
                'hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]',
                !inMonth && 'opacity-40',
                weekend && inMonth && 'bg-bg-secondary/50',
                selected && 'ring-2 ring-inset ring-[var(--accent)]',
              )}
            >
              {/* Date number */}
              <div className="flex items-center gap-1">
                <span
                  className={clsx(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    today && 'bg-[var(--accent)] text-white',
                    !today && isSunday && 'text-[#D32F2F]',
                    !today && isSaturday && 'text-[#4285F4]',
                    !today && !isSunday && !isSaturday && 'text-text-primary',
                    holidayName && !today && 'text-[#D32F2F]',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {holidayName && (
                  <span className="truncate text-[10px] text-[#D32F2F]">
                    {holidayName}
                  </span>
                )}
              </div>

              {/* Events */}
              <div className="flex flex-col gap-px overflow-hidden">
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }
                    }}
                    className={clsx(
                      'truncate rounded px-1 py-px text-[10px] leading-tight',
                      'cursor-pointer hover:opacity-80 transition-opacity',
                    )}
                    style={{
                      backgroundColor: `${event.color ?? 'var(--accent)'}20`,
                      color: event.color ?? 'var(--accent)',
                    }}
                  >
                    {event.is_all_day
                      ? event.title
                      : `${format(parseISO(event.start_at), 'H:mm')} ${event.title}`}
                  </div>
                ))}
                {overflowCount > 0 && (
                  <span className="text-[10px] text-text-tertiary pl-1">
                    +{overflowCount} more
                  </span>
                )}
              </div>

              {/* Todo dots */}
              {todoCount > 0 && (
                <div className="flex items-center gap-0.5 pl-0.5">
                  {Array.from({ length: Math.min(todoCount, 4) }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[#F57C00]"
                    />
                  ))}
                  {todoCount > 4 && (
                    <span className="text-[9px] text-text-tertiary">
                      +{todoCount - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
