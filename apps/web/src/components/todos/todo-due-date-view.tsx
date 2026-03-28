'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import {
  isToday,
  isTomorrow,
  isPast,
  isThisWeek,
  addWeeks,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import type { Todo } from '@todome/db';
import { useTodoStore } from '@todome/store/src/todo-store';
import { useTranslation } from '@todome/store';
import { useTodos, useUpdateTodo } from '@/hooks/queries';
import { filterTodos, STATUS_CYCLE } from '@/lib/todo-filters';
import { TodoListItem } from './todo-list-item';

type DateGroup = {
  key: string;
  label: string;
  todos: Todo[];
  variant: 'danger' | 'warning' | 'default';
};

type DateLabels = Record<string, string>;

const categorizeTodosByDate = (todos: Todo[], labels: DateLabels): DateGroup[] => {
  const overdue: Todo[] = [];
  const today: Todo[] = [];
  const tomorrow: Todo[] = [];
  const thisWeek: Todo[] = [];
  const nextWeek: Todo[] = [];
  const later: Todo[] = [];
  const noDueDate: Todo[] = [];

  const nextWeekStart = startOfWeek(addWeeks(new Date(), 1), {
    weekStartsOn: 1,
  });
  const nextWeekEnd = endOfWeek(addWeeks(new Date(), 1), {
    weekStartsOn: 1,
  });

  for (const todo of todos) {
    if (!todo.due_date) {
      noDueDate.push(todo);
      continue;
    }

    const date = new Date(todo.due_date);

    if (isToday(date)) {
      today.push(todo);
    } else if (isPast(date)) {
      overdue.push(todo);
    } else if (isTomorrow(date)) {
      tomorrow.push(todo);
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      thisWeek.push(todo);
    } else if (date >= nextWeekStart && date <= nextWeekEnd) {
      nextWeek.push(todo);
    } else {
      later.push(todo);
    }
  }

  const sortByPriority = (a: Todo, b: Todo) => b.priority - a.priority;

  const groups: DateGroup[] = [];

  if (overdue.length > 0) {
    groups.push({
      key: 'overdue',
      label: labels.overdue,
      todos: overdue.sort(sortByPriority),
      variant: 'danger',
    });
  }
  if (today.length > 0) {
    groups.push({
      key: 'today',
      label: labels.today,
      todos: today.sort(sortByPriority),
      variant: 'warning',
    });
  }
  if (tomorrow.length > 0) {
    groups.push({
      key: 'tomorrow',
      label: labels.tomorrow,
      todos: tomorrow.sort(sortByPriority),
      variant: 'default',
    });
  }
  if (thisWeek.length > 0) {
    groups.push({
      key: 'this-week',
      label: labels.thisWeek,
      todos: thisWeek.sort(sortByPriority),
      variant: 'default',
    });
  }
  if (nextWeek.length > 0) {
    groups.push({
      key: 'next-week',
      label: labels.nextWeek,
      todos: nextWeek.sort(sortByPriority),
      variant: 'default',
    });
  }
  if (later.length > 0) {
    groups.push({
      key: 'later',
      label: labels.later,
      todos: later.sort(sortByPriority),
      variant: 'default',
    });
  }
  if (noDueDate.length > 0) {
    groups.push({
      key: 'no-due-date',
      label: labels.noDueDate,
      todos: noDueDate.sort(sortByPriority),
      variant: 'default',
    });
  }

  return groups;
};

type DateGroupSectionProps = {
  group: DateGroup;
  onToggleStatus: (id: string) => void;
  onSelect: (id: string) => void;
};

const VARIANT_STYLES: Record<string, string> = {
  danger: 'text-[#D32F2F]',
  warning: 'text-[#F57C00]',
  default: 'text-text-secondary',
};

const DateGroupSection = ({
  group,
  onToggleStatus,
  onSelect,
}: DateGroupSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-2">
      <button
        type="button"
        className={clsx(
          'flex items-center gap-2 w-full px-3 py-1.5 rounded-md',
          'text-sm font-medium',
          'hover:bg-bg-secondary transition-colors duration-150',
          VARIANT_STYLES[group.variant],
        )}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {group.variant === 'danger' && (
          <AlertTriangle className="h-4 w-4" />
        )}
        <span>{group.label}</span>
        <span className="text-xs opacity-70 ml-1">{group.todos.length}</span>
      </button>
      {isOpen && (
        <div className="mt-1 space-y-0.5">
          {group.todos.map((todo) => (
            <TodoListItem
              key={todo.id}
              todo={todo}
              onToggleStatus={onToggleStatus}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TodoDueDateView = () => {
  const { t } = useTranslation();
  const { data: todos } = useTodos();
  const updateTodo = useUpdateTodo();
  const showCompleted = useTodoStore((s) => s.showCompleted);
  const filterStatus = useTodoStore((s) => s.filterStatus);
  const filterPriority = useTodoStore((s) => s.filterPriority);
  const filterTags = useTodoStore((s) => s.filterTags);
  const sortBy = useTodoStore((s) => s.sortBy);
  const selectTodo = useTodoStore((s) => s.selectTodo);

  const filtered = useMemo(
    () =>
      filterTodos(todos ?? [], {
        filterStatus,
        filterPriority,
        filterTags,
        sortBy,
        showCompleted,
      }),
    [todos, filterStatus, filterPriority, filterTags, sortBy, showCompleted],
  );

  const dateLabels: DateLabels = useMemo(() => ({
    overdue: t('todos.overdue'),
    today: t('todos.today'),
    tomorrow: t('todos.tomorrow'),
    thisWeek: t('todos.thisWeek'),
    nextWeek: t('todos.nextWeek'),
    later: t('todos.later'),
    noDueDate: t('todos.noDueDate'),
  }), [t]);

  const groups = useMemo(() => categorizeTodosByDate(filtered, dateLabels), [filtered, dateLabels]);

  const handleToggleStatus = useCallback(
    (id: string) => {
      const todo = (todos ?? []).find((t) => t.id === id);
      if (!todo) return;
      const currentIndex = STATUS_CYCLE.indexOf(todo.status);
      const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length]!;
      const now = new Date().toISOString();
      updateTodo.mutate({
        id,
        patch: {
          status: nextStatus,
          completed_at: nextStatus === 'completed' ? now : null,
          updated_at: now,
        },
      });
    },
    [todos, updateTodo],
  );

  const handleSelect = useCallback(
    (id: string) => {
      selectTodo(id);
    },
    [selectTodo],
  );

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
        <Inbox className="h-12 w-12 mb-3" />
        <p className="text-sm">{t('todos.noTodos')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {groups.map((group) => (
        <DateGroupSection
          key={group.key}
          group={group}
          onToggleStatus={handleToggleStatus}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
};
