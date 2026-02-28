'use client';

import { useMemo } from 'react';
import { clsx } from 'clsx';
import {
  addDays,
  startOfDay,
  endOfDay,
  isToday,
  isTomorrow,
  format,
  parseISO,
} from 'date-fns';
import { MapPin, Clock } from 'lucide-react';
import { useCalendarStore, useTodoStore } from '@todome/store';
import type { CalendarEvent, Todo } from '@todome/store';
import { isHoliday } from '@/lib/japanese-holidays';

type Props = {
  onSelectEvent: (event: CalendarEvent) => void;
};

type ListItem = {
  type: 'event';
  event: CalendarEvent;
  sortKey: string;
} | {
  type: 'todo';
  todo: Todo;
  sortKey: string;
};

const DAYS_AHEAD = 30;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export const ListView = ({ onSelectEvent }: Props) => {
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const events = useCalendarStore((s) => s.events);
  const todos = useTodoStore((s) => s.todos);

  const groupedItems = useMemo(() => {
    const rangeStart = startOfDay(selectedDate);
    const rangeEnd = endOfDay(addDays(selectedDate, DAYS_AHEAD - 1));

    const activeEvents = events.filter((e) => {
      if (e.is_deleted) return false;
      const eventStart = parseISO(e.start_at);
      const eventEnd = parseISO(e.end_at);
      return eventStart <= rangeEnd && eventEnd >= rangeStart;
    });

    const activeTodos = todos.filter(
      (t) =>
        !t.is_deleted &&
        t.due_date &&
        t.status !== 'completed' &&
        t.status !== 'cancelled',
    );

    const groups = new Map<string, ListItem[]>();

    // Add events
    for (const event of activeEvents) {
      const dateKey = format(parseISO(event.start_at), 'yyyy-MM-dd');
      const items = groups.get(dateKey) ?? [];
      items.push({
        type: 'event',
        event,
        sortKey: event.is_all_day ? '00:00' : format(parseISO(event.start_at), 'HH:mm'),
      });
      groups.set(dateKey, items);
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
  }, [selectedDate, events, todos]);

  if (groupedItems.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-tertiary">
          今後30日間に予定はありません
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {groupedItems.map(([dateKey, items]) => {
        const date = parseISO(dateKey);
        const holidayName = isHoliday(date);
        const today = isToday(date);
        const tomorrow = isTomorrow(date);
        const dayOfWeek = date.getDay();
        const isSun = dayOfWeek === 0;
        const isSat = dayOfWeek === 6;

        let dateLabel = format(date, 'M月d日');
        if (today) dateLabel = `今日 - ${dateLabel}`;
        else if (tomorrow) dateLabel = `明日 - ${dateLabel}`;

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
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
}) => {
  const timeText = event.is_all_day
    ? '終日'
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
          <span className="text-sm font-medium text-text-primary truncate">
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
