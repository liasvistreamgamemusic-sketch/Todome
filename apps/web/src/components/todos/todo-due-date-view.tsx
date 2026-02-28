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
import { useTodoStore } from '@todome/store/src/todo-store';
import type { Todo } from '@todome/store/src/types';
import { updateTodo as persistTodo } from '@todome/db';
import { TodoListItem } from './todo-list-item';

type DateGroup = {
  key: string;
  label: string;
  todos: Todo[];
  variant: 'danger' | 'warning' | 'default';
};

const categorizeTodosByDate = (todos: Todo[]): DateGroup[] => {
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
      label: '期限切れ',
      todos: overdue.sort(sortByPriority),
      variant: 'danger',
    });
  }
  if (today.length > 0) {
    groups.push({
      key: 'today',
      label: '今日',
      todos: today.sort(sortByPriority),
      variant: 'warning',
    });
  }
  if (tomorrow.length > 0) {
    groups.push({
      key: 'tomorrow',
      label: '明日',
      todos: tomorrow.sort(sortByPriority),
      variant: 'default',
    });
  }
  if (thisWeek.length > 0) {
    groups.push({
      key: 'this-week',
      label: '今週',
      todos: thisWeek.sort(sortByPriority),
      variant: 'default',
    });
  }
  if (nextWeek.length > 0) {
    groups.push({
      key: 'next-week',
      label: '来週',
      todos: nextWeek.sort(sortByPriority),
      variant: 'default',
    });
  }
  if (later.length > 0) {
    groups.push({
      key: 'later',
      label: 'それ以降',
      todos: later.sort(sortByPriority),
      variant: 'default',
    });
  }
  if (noDueDate.length > 0) {
    groups.push({
      key: 'no-due-date',
      label: '期限なし',
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
  const filteredTodos = useTodoStore((s) => s.filteredTodos);
  const toggleTodoStatus = useTodoStore((s) => s.toggleTodoStatus);
  const selectTodo = useTodoStore((s) => s.selectTodo);

  const todos = filteredTodos();

  const groups = useMemo(() => categorizeTodosByDate(todos), [todos]);

  const handleToggleStatus = useCallback(
    (id: string) => {
      const prev = useTodoStore.getState().todos.find((t) => t.id === id);
      if (!prev) return;
      toggleTodoStatus(id);
      const updated = useTodoStore.getState().todos.find((t) => t.id === id);
      if (updated) {
        persistTodo(id, { status: updated.status, completed_at: updated.completed_at, updated_at: updated.updated_at }, prev).catch(console.error);
      }
    },
    [toggleTodoStatus],
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
        <p className="text-sm">Todoがありません</p>
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
