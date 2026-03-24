'use client';

import { deduplicateEvents } from '@/lib/dedup-events';
import { useMemo } from 'react';
import { clsx } from 'clsx';
import {
  addDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isToday,
  isTomorrow,
  format,
  parseISO,
} from 'date-fns';
import { MapPin, Clock, Users } from 'lucide-react';
import { useCalendarStore, useSubscriptionStore, useTranslation } from '@todome/store';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import type { CalendarEvent, Todo } from '@todome/store';
import type { CalendarProvider } from '@todome/db';
import { useCalendarEvents, useTodos, useSharedCalendarEvents } from '@/hooks/queries';
import { isHoliday } from '@/lib/japanese-holidays';
import { ProviderIcon } from './provider-icon';

/** Unified event shape for list view. */
type MergedEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  color: string | null;
  location?: string | null;
  description?: string | null;
  provider?: CalendarProvider;
  isShared?: boolean;
};

type Props = {
  onSelectEvent: (event: { id: string }) => void;
};

type ListItem = {
  type: 'event';
  event: MergedEvent;
  sortKey: string;
} | {
  type: 'todo';
  todo: Todo;
  sortKey: string;
};

const DAYS_AHEAD = 30;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export const ListView = ({ onSelectEvent }: Props) => {
  const { t } = useTranslation();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const { data: events = [] } = useCalendarEvents();
  const externalEventsMap = useSubscriptionStore((s) => s.eventsBySubscription);
  const externalEvents = useMemo(() => Object.values(externalEventsMap).flat(), [externalEventsMap]);
  const { data: sharedEvents = [] } = useSharedCalendarEvents();
  const showPersonalCalendar = useCalendarStore((s) => s.showPersonalCalendar);
  const hiddenSharedCalendarIds = useCalendarStore((s) => s.hiddenSharedCalendarIds);
  const { data: allTodos = [] } = useTodos();
  const navigateMonthPrev = useCalendarStore((s) => s.navigateMonthPrev);
  const navigateMonthNext = useCalendarStore((s) => s.navigateMonthNext);
  const swipe = useSwipeNavigation(navigateMonthNext, navigateMonthPrev);

  const groupedItems = useMemo(() => {
    const rangeStart = startOfDay(selectedDate);
    const rangeEnd = endOfDay(addDays(selectedDate, DAYS_AHEAD - 1));

    const activeLocal: MergedEvent[] = showPersonalCalendar
      ? events
          .filter((e: CalendarEvent) => {
            if (e.is_deleted) return false;
            const eventStart = parseISO(e.start_at);
            const eventEnd = parseISO(e.end_at);
            return eventStart <= rangeEnd && eventEnd >= rangeStart;
          })
          .map((e) => ({ ...e, provider: undefined }))
      : [];

    const activeExternal: MergedEvent[] = showPersonalCalendar
      ? externalEvents.filter((e) => {
          const eventStart = parseISO(e.start_at);
          const eventEnd = parseISO(e.end_at);
          return eventStart <= rangeEnd && eventEnd >= rangeStart;
        })
      : [];

    const activeShared: MergedEvent[] = sharedEvents
      .filter((e) => {
        if (e.is_deleted) return false;
        if (hiddenSharedCalendarIds.has(e.shared_calendar_id)) return false;
        const eventStart = parseISO(e.start_at);
        const eventEnd = parseISO(e.end_at);
        return eventStart <= rangeEnd && eventEnd >= rangeStart;
      })
      .map((e) => ({ ...e, provider: undefined, isShared: true }));

    const allActiveEvents = deduplicateEvents([...activeLocal, ...activeExternal, ...activeShared]);

    const activeTodos = allTodos.filter(
      (t: Todo) =>
        !t.is_deleted &&
        t.due_date &&
        t.status !== 'completed' &&
        t.status !== 'cancelled',
    );

    const groups = new Map<string, ListItem[]>();

    // Add events - multi-day events appear on all days they span
    for (const event of allActiveEvents) {
      const eventStart = parseISO(event.start_at);
      const eventEnd = parseISO(event.end_at);
      const clampedStart = eventStart < rangeStart ? rangeStart : startOfDay(eventStart);
      const clampedEnd = eventEnd > rangeEnd ? rangeEnd : endOfDay(eventEnd);
      const eventDays = eachDayOfInterval({ start: clampedStart, end: clampedEnd });

      for (const day of eventDays) {
        const dateKey = format(day, 'yyyy-MM-dd');
        const items = groups.get(dateKey) ?? [];
        items.push({
          type: 'event',
          event,
          sortKey: event.is_all_day ? '00:00' : format(eventStart, 'HH:mm'),
        });
        groups.set(dateKey, items);
      }
    }

    // Add todos
    for (const todo of activeTodos) {
      if (!todo.due_date) continue;
      const dueDate = parseISO(todo.due_date);
      if (dueDate < rangeStart || dueDate > rangeEnd) continue;
      const dateKey = todo.due_date;
      const items = groups.get(dateKey) ?? [];
      items.push({
        type: 'todo',
        todo,
        sortKey: '99:99', // Todos sort after events
      });
      groups.set(dateKey, items);
    }

    // Sort items within each group
    for (const [key, items] of groups) {
      groups.set(
        key,
        items.sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
      );
    }

    // Sort groups by date
    const sortedEntries = Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    return sortedEntries;
  }, [selectedDate, events, externalEvents, sharedEvents, allTodos, showPersonalCalendar, hiddenSharedCalendarIds]);

  if (groupedItems.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-tertiary">
          {t('calendar.noEventsInRange')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" {...swipe}>
      {groupedItems.map(([dateKey, items]) => {
        const date = parseISO(dateKey);
        const holidayName = isHoliday(date);
        const today = isToday(date);
        const tomorrow = isTomorrow(date);
        const dayOfWeek = date.getDay();
        const isSun = dayOfWeek === 0;
        const isSat = dayOfWeek === 6;

        let dateLabel = format(date, 'M月d日');
        if (today) dateLabel = `${t('calendar.todayPrefix')}${dateLabel}`;
        else if (tomorrow) dateLabel = `${t('calendar.tomorrowPrefix')}${dateLabel}`;

        return (
          <div key={dateKey}>
            {/* Date header */}
            <div
              className={clsx(
                'sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border)] bg-bg-primary px-4 py-2',
                today && 'bg-[var(--accent)]/5',
              )}
            >
              <span
                className={clsx(
                  'text-sm font-medium',
                  today && 'text-[var(--accent)]',
                  !today && isSun && 'text-[#D32F2F]',
                  !today && isSat && 'text-[#4285F4]',
                  !today && !isSun && !isSat && 'text-text-primary',
                )}
              >
                {dateLabel} ({DAY_LABELS[dayOfWeek]})
              </span>
              {holidayName && (
                <span className="text-xs text-[#D32F2F]">{holidayName}</span>
              )}
            </div>

            {/* Items */}
            <ul>
              {items.map((item) => {
                if (item.type === 'event') {
                  return (
                    <EventListItem
                      key={item.event.id}
                      event={item.event}
                      onClick={onSelectEvent}
                    />
                  );
                }
                return (
                  <TodoListItem key={item.todo.id} todo={item.todo} />
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

const EventListItem = ({
  event,
  onClick,
}: {
  event: MergedEvent;
  onClick: (event: { id: string }) => void;
}) => {
  const { t } = useTranslation();
  const timeText = event.is_all_day
    ? t('calendar.allDay')
    : `${format(parseISO(event.start_at), 'H:mm')} - ${format(parseISO(event.end_at), 'H:mm')}`;

  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(event)}
        className={clsx(
          'flex w-full items-start gap-3 px-4 py-3 text-left',
          'hover:bg-bg-secondary transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]',
        )}
      >
        {/* Color indicator */}
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: event.color ?? 'var(--accent)' }}
        />

        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-text-primary truncate flex items-center gap-1">
            {event.provider && <ProviderIcon provider={event.provider} size={12} className="shrink-0" />}
            {event.isShared && <Users className="h-3 w-3 shrink-0 text-text-tertiary" />}
            {event.title}
          </span>
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeText}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
            )}
          </div>
          {event.description && (
            <p className="truncate text-xs text-text-tertiary">{event.description}</p>
          )}
        </div>
      </button>
    </li>
  );
};

const TodoListItem = ({ todo }: { todo: Todo }) => {
  const priorityColors: Record<number, string> = {
    1: '#D32F2F',
    2: '#F57C00',
    3: '#4285F4',
    4: 'var(--text-tertiary)',
  };

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border-2"
        style={{ borderColor: priorityColors[todo.priority] ?? 'var(--text-tertiary)' }}
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm text-text-primary truncate">{todo.title}</span>
        <span className="text-xs text-text-tertiary">Todo</span>
      </div>
    </li>
  );
};
