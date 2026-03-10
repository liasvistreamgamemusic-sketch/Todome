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
  addHours,
  setHours,
  setMinutes,
} from 'date-fns';
import { BookOpen, CheckSquare, Users } from 'lucide-react';
import { useCalendarStore, useUiStore, useSubscriptionStore, useTranslation } from '@todome/store';
import type { CalendarEvent, Todo } from '@todome/store';
import type { CalendarProvider } from '@todome/db';
import { useCalendarEvents, useTodos, useDiaries, useSharedCalendarEvents } from '@/hooks/queries';
import { useIsMobile } from '@todome/hooks';
import { CalendarEventBlock } from './calendar-event-block';
import { isHoliday } from '@/lib/japanese-holidays';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import { computeEventLayouts } from '@/lib/event-layout';
import { computeAllDayLayout } from '@/lib/all-day-layout';
import { ProviderIcon } from './provider-icon';

/** Unified event shape for rendering local, external, and shared events. */
type MergedEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  color: string | null;
  is_deleted?: boolean;
  provider?: CalendarProvider;
  isShared?: boolean;
};

type Props = {
  onCreateEvent: (date: Date) => void;
  onSelectEvent: (event: { id: string }) => void;
  onOpenDiary: (date: Date) => void;
};

const TOTAL_HOURS = 24;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export const WeekView = ({ onCreateEvent, onSelectEvent, onOpenDiary }: Props) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const { data: events = [] } = useCalendarEvents();
  const externalEventsMap = useSubscriptionStore((s) => s.eventsBySubscription);
  const externalEvents = useMemo(() => Object.values(externalEventsMap).flat(), [externalEventsMap]);
  const { data: sharedEvents = [] } = useSharedCalendarEvents();
  const showPersonalCalendar = useCalendarStore((s) => s.showPersonalCalendar);
  const hiddenSharedCalendarIds = useCalendarStore((s) => s.hiddenSharedCalendarIds);
  const selectDate = useCalendarStore((s) => s.selectDate);
  const weekStart = useUiStore((s) => s.calendarWeekStart);
  const { data: allTodos = [] } = useTodos();
  const { data: diaries = [] } = useDiaries();
  const diaryDates = useMemo(() => {
    const set = new Set<string>();
    for (const diary of diaries) {
      if (!diary.is_deleted) set.add(diary.date);
    }
    return set;
  }, [diaries]);
  const navigateWeekPrev = useCalendarStore((s) => s.navigateWeekPrev);
  const navigateWeekNext = useCalendarStore((s) => s.navigateWeekNext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState(0);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
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

  const activeEvents = useMemo<MergedEvent[]>(() => {
    const local: MergedEvent[] = showPersonalCalendar
      ? events
          .filter((e: CalendarEvent) => !e.is_deleted)
          .map((e) => ({ ...e, provider: undefined }))
      : [];
    const external: MergedEvent[] = showPersonalCalendar
      ? externalEvents.map((e) => ({ ...e, is_deleted: false }))
      : [];
    const shared: MergedEvent[] = sharedEvents
      .filter((e) => !e.is_deleted && !hiddenSharedCalendarIds.has(e.shared_calendar_id))
      .map((e) => ({ ...e, provider: undefined, isShared: true }));
    return [...local, ...external, ...shared];
  }, [events, externalEvents, sharedEvents, showPersonalCalendar, hiddenSharedCalendarIds]);

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
    return allTodos.filter(
      (t: Todo) =>
        !t.is_deleted &&
        t.due_date === dateKey &&
        t.status !== 'completed' &&
        t.status !== 'cancelled',
    );
  }, [isMobile, selectedDate, allTodos]);

  // For desktop: spanning layout for all-day events
  const allDaySpanLayout = useMemo(() => {
    if (isMobile) return null;
    const allDayEvents = activeEvents.filter((e) => e.is_all_day);
    return computeAllDayLayout(weekDays, allDayEvents, Infinity);
  }, [isMobile, weekDays, activeEvents]);

  // For desktop: timed events by day
  const timedEvents = useMemo(() => {
    if (isMobile) return new Map<string, MergedEvent[]>();
    const map = new Map<string, MergedEvent[]>();
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

  // Detect scrollbar width for grid alignment (Windows shows visible scrollbar)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setScrollbarWidth(el.offsetWidth - el.clientWidth);
    // Measure after content renders
    const raf = requestAnimationFrame(measure);
    // Re-measure on resize (e.g. window resize may toggle scrollbar)
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, []);

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

  // Pre-compute overlap layouts for each day (desktop)
  const dayLayouts = useMemo(() => {
    if (isMobile) return new Map<string, Map<string, import('@/lib/event-layout').EventLayout>>();
    const map = new Map<string, Map<string, import('@/lib/event-layout').EventLayout>>();
    for (const day of weekDays) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayTimed = timedEvents.get(dateKey) ?? [];
      map.set(dateKey, computeEventLayouts(dayTimed, day, hourHeight));
    }
    return map;
  }, [isMobile, weekDays, timedEvents, hourHeight]);

  // Mobile: layout for selected day
  const mobileDayLayout = useMemo(() => {
    if (!isMobile) return new Map<string, import('@/lib/event-layout').EventLayout>();
    return computeEventLayouts(selectedDayTimed, selectedDate, hourHeight);
  }, [isMobile, selectedDayTimed, selectedDate, hourHeight]);

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
            <span className="shrink-0 pt-1 text-[10px] text-text-tertiary">{t('calendar.allDay')}</span>
            <div className="flex flex-1 flex-wrap gap-1">
              {selectedDayAllDay.map((event) => (
                <CalendarEventBlock key={event.id} event={event} onClick={onSelectEvent} provider={event.provider} isShared={event.isShared} />
              ))}
            </div>
          </div>
        )}

        {/* Selected day time grid */}
        <div ref={scrollRef} className="scrollbar-overlay flex flex-1">
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
              const layout = mobileDayLayout.get(event.id);
              if (!layout) return null;
              return (
                <CalendarEventBlock
                  key={event.id}
                  event={event}
                  positioned
                  top={`${layout.top}px`}
                  height={`${layout.height}px`}
                  column={layout.column}
                  totalColumns={layout.totalColumns}
                  onClick={onSelectEvent}
                  provider={event.provider}
                  isShared={event.isShared}
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
                {t('calendar.thisDaysTodos')} ({dueTodos.length})
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
      {/* Header row — right padding matches scrollbar width for grid alignment */}
      <div className="flex border-b border-[var(--border)]" style={{ paddingRight: scrollbarWidth }}>
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
                {diaryDates.has(format(day, 'yyyy-MM-dd')) && (
                  <BookOpen
                    className="mt-0.5 h-3 w-3 text-[#7986CB] cursor-pointer hover:opacity-70"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDiary(day);
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* All-day events row — right padding matches scrollbar width for grid alignment */}
      <div className="flex border-b border-[var(--border)]" style={{ paddingRight: scrollbarWidth, minHeight: '32px' }}>
        <div className="w-14 shrink-0 flex items-center justify-center text-[10px] text-text-tertiary">
          {t('calendar.allDay')}
        </div>
        <div className="relative flex-1">
          {/* Grid lines for columns */}
          <div className="grid grid-cols-7 h-full">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="border-r border-[var(--border)]" />
            ))}
          </div>
          {/* Spanning bars */}
          {allDaySpanLayout && (
            <div
              className="absolute inset-0"
              style={{ minHeight: allDaySpanLayout.laneCount > 0 ? `${allDaySpanLayout.laneCount * 22 + 4}px` : undefined }}
            >
              {allDaySpanLayout.spans.map((span) => {
                const barHeight = 18;
                const barGap = 2;
                const leftPct = (span.startCol / 7) * 100;
                const widthPct = (span.colSpan / 7) * 100;
                const topPx = span.lane * (barHeight + barGap) + 2;
                const eventColor = span.event.color ?? 'var(--accent)';

                return (
                  <div
                    key={`${span.event.id}-${span.startCol}`}
                    className="absolute cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      top: `${topPx}px`,
                      height: `${barHeight}px`,
                      backgroundColor: `${eventColor}30`,
                      color: eventColor,
                      borderLeft: span.isStart ? `3px solid ${eventColor}` : undefined,
                      borderRadius: `${span.isStart ? '3px' : '0'} ${span.isEnd ? '3px' : '0'} ${span.isEnd ? '3px' : '0'} ${span.isStart ? '3px' : '0'}`,
                    }}
                    onClick={() => onSelectEvent(span.event)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onSelectEvent(span.event);
                    }}
                  >
                    <span className="flex items-center gap-1 truncate px-1.5 text-xs font-medium leading-[18px]">
                      {span.event.provider && <ProviderIcon provider={(span.event as MergedEvent).provider!} size={10} className="shrink-0" />}
                      {(span.event as MergedEvent).isShared && <Users className="h-2.5 w-2.5 shrink-0" />}
                      <span className="truncate">{span.isStart ? `(${t('calendar.allDay')}) ${span.event.title}` : span.event.title}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Set minimum height based on lane count */}
          {allDaySpanLayout && allDaySpanLayout.laneCount > 0 && (
            <div style={{ height: `${allDaySpanLayout.laneCount * 22 + 4}px` }} />
          )}
        </div>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="scrollbar-overlay flex flex-1">
        <div className="w-14 shrink-0">
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
                  const layout = dayLayouts.get(dateKey)?.get(event.id);
                  if (!layout) return null;
                  return (
                    <CalendarEventBlock
                      key={event.id}
                      event={event}
                      positioned
                      top={`${layout.top}px`}
                      height={`${layout.height}px`}
                      column={layout.column}
                      totalColumns={layout.totalColumns}
                      onClick={onSelectEvent}
                      provider={event.provider}
                      isShared={event.isShared}
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
