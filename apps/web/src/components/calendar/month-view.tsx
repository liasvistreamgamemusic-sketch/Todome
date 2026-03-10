'use client';

import { useMemo, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  isSameMonth,
  isSameDay,
  isToday,
  isWeekend,
  format,
  parseISO,
} from 'date-fns';
import { useCalendarStore, useUiStore, useSubscriptionStore, useTranslation } from '@todome/store';
import { useIsMobile } from '@todome/hooks';
import type { CalendarEvent, Todo } from '@todome/store';
import type { CalendarProvider } from '@todome/db';
import { BookOpen, Users } from 'lucide-react';
import { useCalendarEvents, useTodos, useDiaries, useSharedCalendarEvents } from '@/hooks/queries';
import { useGridRowHeight } from '@/hooks/use-grid-row-height';
import { computeMonthCellCapacity } from '@/lib/month-cell-capacity';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import { isHoliday } from '@/lib/japanese-holidays';
import { ProviderIcon } from './provider-icon';
import { computeAllDayLayout } from '@/lib/all-day-layout';

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
  onShowDayEvents: (date: Date) => void;
};

const DAY_LABELS_SUN: string[] = ['日', '月', '火', '水', '木', '金', '土'];
const DAY_LABELS_MON: string[] = ['月', '火', '水', '木', '金', '土', '日'];

export const MonthView = ({ onCreateEvent, onSelectEvent, onOpenDiary, onShowDayEvents }: Props) => {
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
  const navigateMonthPrev = useCalendarStore((s) => s.navigateMonthPrev);
  const navigateMonthNext = useCalendarStore((s) => s.navigateMonthNext);
  const swipe = useSwipeNavigation(navigateMonthNext, navigateMonthPrev);

  const dayLabels = weekStart === 0 ? DAY_LABELS_SUN : DAY_LABELS_MON;

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: weekStart });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: weekStart });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [selectedDate, weekStart]);

  // Compute spanning layout for all-day events per week row
  const weekRows = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return rows;
  }, [calendarDays]);

  const allActiveEvents = useMemo(() => {
    const activeLocal: MergedEvent[] = showPersonalCalendar
      ? events
          .filter((e: CalendarEvent) => !e.is_deleted)
          .map((e) => ({ ...e, provider: undefined }))
      : [];
    const activeExternal: MergedEvent[] = showPersonalCalendar
      ? externalEvents.map((e) => ({ ...e, is_deleted: false }))
      : [];
    const activeShared: MergedEvent[] = sharedEvents
      .filter((e) => !e.is_deleted && !hiddenSharedCalendarIds.has(e.shared_calendar_id))
      .map((e) => ({ ...e, provider: undefined, isShared: true }));
    return [...activeLocal, ...activeExternal, ...activeShared];
  }, [events, externalEvents, sharedEvents, showPersonalCalendar, hiddenSharedCalendarIds]);

  // Dynamic event capacity based on measured cell height
  const gridRef = useRef<HTMLDivElement>(null);
  const weekCount = calendarDays.length / 7;
  const rowHeight = useGridRowHeight(gridRef, weekCount);
  const { maxVisibleEvents, maxAllDayLanes } = useMemo(
    () => computeMonthCellCapacity(rowHeight),
    [rowHeight],
  );

  const weekSpanLayouts = useMemo(() => {
    const allDayEvents = allActiveEvents.filter((e) => e.is_all_day);
    return weekRows.map((weekDays) => computeAllDayLayout(weekDays, allDayEvents, maxAllDayLanes));
  }, [weekRows, allActiveEvents, maxAllDayLanes]);

  const timedEventsByDate = useMemo(() => {
    const map = new Map<string, MergedEvent[]>();
    for (const day of calendarDays) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayS = startOfDay(day);
      const dayE = endOfDay(day);
      const dayEvents = allActiveEvents.filter((e) => {
        if (e.is_all_day) return false;
        const eventStart = parseISO(e.start_at);
        const eventEnd = parseISO(e.end_at);
        return eventStart <= dayE && eventEnd >= dayS;
      });
      if (dayEvents.length > 0) map.set(dateKey, dayEvents);
    }
    return map;
  }, [allActiveEvents, calendarDays]);

  const todosWithDueDate = useMemo(() => {
    const map = new Map<string, number>();
    const activeTodos = allTodos.filter(
      (t: Todo) => !t.is_deleted && t.due_date && t.status !== 'completed' && t.status !== 'cancelled',
    );
    for (const todo of activeTodos) {
      if (todo.due_date) {
        const count = map.get(todo.due_date) ?? 0;
        map.set(todo.due_date, count + 1);
      }
    }
    return map;
  }, [allTodos]);

  const handleDateClick = useCallback(
    (day: Date) => {
      selectDate(day);
      onShowDayEvents(day);
    },
    [selectDate, onShowDayEvents],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden" {...swipe}>
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

      {/* Calendar grid - week by week */}
      <div
        ref={gridRef}
        className="flex flex-1 flex-col"
        style={{ display: 'grid', gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
      >
        {weekRows.map((weekDays, weekIdx) => {
          const layout = weekSpanLayouts[weekIdx]!;
          const barHeight = 16;
          const barGap = 2;
          const reservedHeight = layout.laneCount * (barHeight + barGap);

          return (
            <div key={weekIdx} className="relative grid grid-cols-7">
              {/* Day cells */}
              {weekDays.map((day, colIdx) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const timedEvents = timedEventsByDate.get(dateKey) ?? [];
                const todoCount = todosWithDueDate.get(dateKey) ?? 0;
                const holidayName = isHoliday(day);
                const inMonth = isSameMonth(day, selectedDate);
                const selected = isSameDay(day, selectedDate);
                const today = isToday(day);
                const weekend = isWeekend(day);
                const dayOfWeek = day.getDay();
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;

                // For overflow: count all events (spanning + timed) minus visible
                const allDayOverflow = layout.overflowByCol[colIdx] ?? 0;
                const maxTimedVisible = Math.max(0, maxVisibleEvents - layout.laneCount);
                const visibleTimed = timedEvents.slice(0, maxTimedVisible);
                const totalOverflow = allDayOverflow + Math.max(0, timedEvents.length - maxTimedVisible);

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => handleDateClick(day)}
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
                      {diaryDates.has(dateKey) && (
                        <BookOpen
                          className="h-2.5 w-2.5 text-[#7986CB] cursor-pointer hover:opacity-70 transition-opacity shrink-0"
                          onClick={(e) => { e.stopPropagation(); onOpenDiary(day); }}
                        />
                      )}
                      {holidayName && (
                        <span className="truncate text-[10px] text-[#D32F2F]">{holidayName}</span>
                      )}
                    </div>

                    {/* Reserved space for spanning all-day bars */}
                    {reservedHeight > 0 && <div style={{ height: `${reservedHeight}px` }} />}

                    {/* Timed (non-all-day) events */}
                    <div className="flex flex-col gap-px overflow-hidden">
                      {visibleTimed.map((event) => (
                        <div
                          key={event.id}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onSelectEvent(event); }
                          }}
                          className={clsx(
                            'truncate rounded px-1 py-px text-[10px] leading-tight',
                            'cursor-pointer hover:opacity-80 transition-opacity',
                            'flex items-center gap-0.5',
                          )}
                          style={{
                            backgroundColor: `${event.color ?? 'var(--accent)'}20`,
                            color: event.color ?? 'var(--accent)',
                          }}
                        >
                          {event.provider && <ProviderIcon provider={event.provider} size={8} className="shrink-0" />}
                          {event.isShared && <Users className="h-2 w-2 shrink-0" />}
                          <span className="truncate">{isMobile ? event.title : `${format(parseISO(event.start_at), 'H:mm')} ${event.title}`}</span>
                        </div>
                      ))}
                      {totalOverflow > 0 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); onShowDayEvents(day); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onShowDayEvents(day); }
                          }}
                          className="text-[10px] text-text-tertiary pl-1 cursor-pointer hover:text-[var(--accent)] transition-colors"
                        >
                          +{totalOverflow} more
                        </span>
                      )}
                    </div>

                    {/* Todo dots */}
                    {todoCount > 0 && (
                      <div className="flex items-center gap-0.5 pl-0.5">
                        {Array.from({ length: Math.min(todoCount, 4) }).map((_, i) => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#F57C00]" />
                        ))}
                        {todoCount > 4 && <span className="text-[9px] text-text-tertiary">+{todoCount - 4}</span>}
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Spanning all-day bars overlay */}
              {layout.spans.length > 0 && (
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: '28px' }}
                >
                  {layout.spans.map((span) => {
                    const leftPct = (span.startCol / 7) * 100;
                    const widthPct = (span.colSpan / 7) * 100;
                    const topPx = span.lane * (barHeight + barGap);
                    const eventColor = span.event.color ?? 'var(--accent)';

                    return (
                      <div
                        key={`${span.event.id}-${span.startCol}`}
                        className="absolute pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          top: `${topPx}px`,
                          height: `${barHeight}px`,
                          backgroundColor: `${eventColor}30`,
                          color: eventColor,
                          borderLeft: span.isStart ? `3px solid ${eventColor}` : undefined,
                        }}
                        onClick={(e) => { e.stopPropagation(); onSelectEvent(span.event); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onSelectEvent(span.event); }
                        }}
                      >
                        <span
                          className={clsx(
                            'flex items-center gap-0.5 truncate px-1 text-[10px] font-medium leading-[16px]',
                            span.isStart ? 'rounded-l' : '',
                            span.isEnd ? 'rounded-r' : '',
                          )}
                        >
                          {span.event.provider && <ProviderIcon provider={(span.event as MergedEvent).provider!} size={8} className="shrink-0" />}
                          {(span.event as MergedEvent).isShared && <Users className="h-2 w-2 shrink-0" />}
                          <span className="truncate">{span.isStart ? (isMobile ? span.event.title : `(${t('calendar.allDay')}) ${span.event.title}`) : span.event.title}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
