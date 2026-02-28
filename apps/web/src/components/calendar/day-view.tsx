'use client';

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  addHours,
  isToday,
  format,
  parseISO,
  differenceInMinutes,
  setHours,
  setMinutes,
} from 'date-fns';
import { BookOpen, CheckSquare } from 'lucide-react';
import { useCalendarStore, useTodoStore } from '@todome/store';
import type { CalendarEvent, Todo } from '@todome/store';
import { CalendarEventBlock } from './calendar-event-block';
import { isHoliday } from '@/lib/japanese-holidays';

type Props = {
  onCreateEvent: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onOpenDiary: (date: Date) => void;
};

const HOUR_HEIGHT = 60;
const TOTAL_HOURS = 24;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export const DayView = ({ onCreateEvent, onSelectEvent, onOpenDiary }: Props) => {
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const events = useCalendarStore((s) => s.events);
  const todos = useTodoStore((s) => s.todos);
  const selectDate = useCalendarStore((s) => s.selectDate);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState(0);

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
    const dayS = startOfDay(selectedDate);
    const dayE = endOfDay(selectedDate);
    return activeEvents.filter((e) => {
      if (!e.is_all_day) return false;
      const eventStart = parseISO(e.start_at);
      const eventEnd = parseISO(e.end_at);
      return eventStart <= dayE && eventEnd >= dayS;
    });
  }, [selectedDate, activeEvents]);

  const timedEvents = useMemo(() => {
    const dayS = startOfDay(selectedDate);
    const dayE = endOfDay(selectedDate);
    return activeEvents.filter((e) => {
      if (e.is_all_day) return false;
      const eventStart = parseISO(e.start_at);
      const eventEnd = parseISO(e.end_at);
      return eventStart < dayE && eventEnd > dayS;
    });
  }, [selectedDate, activeEvents]);

  const dueTodos = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return todos.filter(
      (t) =>
        !t.is_deleted &&
        t.due_date === dateKey &&
        t.status !== 'completed' &&
        t.status !== 'cancelled',
    );
  }, [selectedDate, todos]);

  const isCurrentDay = isToday(selectedDate);
  const holidayName = isHoliday(selectedDate);
  const dayOfWeek = selectedDate.getDay();

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
    (event: CalendarEvent) => {
      const eventStart = parseISO(event.start_at);
      const eventEnd = parseISO(event.end_at);
      const dayS = startOfDay(selectedDate);
      const dayE = endOfDay(selectedDate);

      const clampedStart = eventStart < dayS ? dayS : eventStart;
      const clampedEnd = eventEnd > dayE ? dayE : eventEnd;

      const topMinutes = differenceInMinutes(clampedStart, dayS);
      const durationMinutes = differenceInMinutes(clampedEnd, clampedStart);

      const top = (topMinutes / 60) * HOUR_HEIGHT;
      const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);

      return { top: `${top}px`, height: `${height}px` };
    },
    [selectedDate],
  );

  const handleTimeSlotClick = useCallback(
    (hour: number) => {
      const target = setMinutes(setHours(selectedDate, hour), 0);
      selectDate(target);
      onCreateEvent(target);
    },
    [selectedDate, selectDate, onCreateEvent],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Date header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex flex-col items-center">
          <span
            className={clsx(
              'text-xs',
              dayOfWeek === 0 && 'text-[#D32F2F]',
              dayOfWeek === 6 && 'text-[#4285F4]',
              dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-text-secondary',
            )}
          >
            {DAY_LABELS[dayOfWeek]}
          </span>
          <span
            className={clsx(
              'inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold',
              isCurrentDay && 'bg-[var(--accent)] text-white',
              !isCurrentDay && 'text-text-primary',
            )}
          >
            {format(selectedDate, 'd')}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text-primary">
            {format(selectedDate, 'yyyy年M月d日')}
          </span>
          {holidayName && (
            <span className="text-xs text-[#D32F2F]">{holidayName}</span>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => onOpenDiary(selectedDate)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
              'bg-bg-secondary text-text-secondary border border-[var(--border)]',
              'hover:bg-bg-tertiary transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            日記
          </button>
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="flex items-start gap-2 border-b border-[var(--border)] px-4 py-2">
          <span className="shrink-0 pt-1 text-[10px] text-text-tertiary">終日</span>
          <div className="flex flex-1 flex-wrap gap-1">
            {allDayEvents.map((event) => (
              <CalendarEventBlock
                key={event.id}
                event={event}
                onClick={onSelectEvent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
        {/* Time labels */}
        <div className="w-14 shrink-0">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="flex items-start justify-end pr-2"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              <span className="text-[10px] text-text-tertiary -translate-y-2">
                {format(hour, 'H:00')}
              </span>
            </div>
          ))}
        </div>

        {/* Event column */}
        <div className="relative flex-1">
          {/* Hour slot lines */}
          {hours.map((hour, idx) => (
            <button
              key={hour.toISOString()}
              type="button"
              onClick={() => handleTimeSlotClick(idx)}
              className={clsx(
                'block w-full border-b border-[var(--border)]/50',
                'hover:bg-bg-secondary/50 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]',
              )}
              style={{ height: `${HOUR_HEIGHT}px` }}
              aria-label={`${idx}:00 に予定を作成`}
            />
          ))}

          {/* 30-minute dividers */}
          {hours.map((hour) => (
            <div
              key={`half-${hour.toISOString()}`}
              className="absolute left-0 right-0 border-b border-dashed border-[var(--border)]/30 pointer-events-none"
              style={{ top: `${(hours.indexOf(hour)) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
            />
          ))}

          {/* Timed events */}
          {timedEvents.map((event) => {
            const pos = getEventPosition(event);
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

      {/* Todos due on this day */}
      {dueTodos.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckSquare className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="text-xs font-medium text-text-secondary">
              この日のTodo ({dueTodos.length})
            </span>
          </div>
          <ul className="space-y-1">
            {dueTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const TodoItem = ({ todo }: { todo: Todo }) => {
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
