'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, Inbox } from 'lucide-react';
import type { Todo } from '@todome/db';
import { useTodoStore } from '@todome/store/src/todo-store';
import { useTranslation } from '@todome/store';
import { useTodos, useUpdateTodo } from '@/hooks/queries';
import { filterTodos, groupTodos, STATUS_CYCLE } from '@/lib/todo-filters';
import { TodoListItem } from './todo-list-item';

const STATUS_ORDER = ['pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITY_ORDER = ['4', '3', '2', '1'];

type GroupSectionProps = {
  groupKey: string;
  todos: Todo[];
  groupLabels: Record<string, string>;
  defaultOpen?: boolean;
  onToggleStatus: (id: string) => void;
  onSelect: (id: string) => void;
};

const GroupSection = ({
  groupKey,
  todos,
  groupLabels,
  defaultOpen = true,
  onToggleStatus,
  onSelect,
}: GroupSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const label = groupLabels[groupKey] ?? groupKey;

  return (
    <div className="mb-2">
      <button
        type="button"
        className={clsx(
          'flex items-center gap-2 w-full px-3 py-1.5 rounded-md',
          'text-sm font-medium text-text-secondary',
          'hover:bg-bg-secondary transition-colors duration-150',
        )}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span>{label}</span>
        <span className="text-xs text-text-tertiary ml-1">
          {todos.length}
        </span>
      </button>
      {isOpen && (
        <div className="mt-1 space-y-0.5">
          {todos.map((todo) => (
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

const sortGroupKeys = (keys: string[], groupBy: string): string[] => {
  if (groupBy === 'status') {
    return [...keys].sort(
      (a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b),
    );
  }
  if (groupBy === 'priority') {
    return [...keys].sort(
      (a, b) => PRIORITY_ORDER.indexOf(a) - PRIORITY_ORDER.indexOf(b),
    );
  }
  return [...keys].sort();
};

export const TodoList = () => {
  const { t } = useTranslation();
  const { data: todos } = useTodos();
  const updateTodo = useUpdateTodo();
  const groupBy = useTodoStore((s) => s.groupBy);
  const sortBy = useTodoStore((s) => s.sortBy);
  const showCompleted = useTodoStore((s) => s.showCompleted);
  const filterStatus = useTodoStore((s) => s.filterStatus);
  const filterPriority = useTodoStore((s) => s.filterPriority);
  const filterTags = useTodoStore((s) => s.filterTags);
  const selectTodo = useTodoStore((s) => s.selectTodo);

  const GROUP_LABELS: Record<string, string> = useMemo(
    () => ({
      pending: t('todos.status.notStarted'),
      in_progress: t('todos.status.inProgress'),
      completed: t('todos.status.completed'),
      cancelled: t('todos.status.cancelled'),
      '1': t('todos.priority.low'),
      '2': t('todos.priority.medium'),
      '3': t('todos.priority.high'),
      '4': t('todos.priority.urgent'),
      untagged: t('todos.untagged'),
      all: t('todos.all'),
    }),
    [t],
  );

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

  const groups = useMemo(
    () => groupTodos(filtered, groupBy),
    [filtered, groupBy],
  );

  const sortedKeys = useMemo(
    () => sortGroupKeys(Object.keys(groups), groupBy),
    [groups, groupBy],
  );

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

  const hasAnyTodos = sortedKeys.some(
    (key) => (groups[key]?.length ?? 0) > 0,
  );

  if (!hasAnyTodos) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
        <Inbox className="h-12 w-12 mb-3" />
        <p className="text-sm">{t('todos.noTodos')}</p>
        <p className="text-xs mt-1">{t('todos.emptyMessage')}</p>
      </div>
    );
  }

  const activeKeys = sortedKeys.filter(
    (k) => k !== 'completed' && k !== 'cancelled',
  );
  const completedKeys = sortedKeys.filter(
    (k) => k === 'completed' || k === 'cancelled',
  );

  return (
    <div className="space-y-1">
      {activeKeys.map((key) => {
        const keyTodos = groups[key];
        if (!keyTodos || keyTodos.length === 0) return null;
        return (
          <GroupSection
            key={key}
            groupKey={key}
            todos={keyTodos}
            groupLabels={GROUP_LABELS}
            onToggleStatus={handleToggleStatus}
            onSelect={handleSelect}
          />
        );
      })}
      {showCompleted &&
        completedKeys.map((key) => {
          const keyTodos = groups[key];
          if (!keyTodos || keyTodos.length === 0) return null;
          return (
            <GroupSection
              key={key}
              groupKey={key}
              todos={keyTodos}
              groupLabels={GROUP_LABELS}
              defaultOpen={false}
              onToggleStatus={handleToggleStatus}
              onSelect={handleSelect}
            />
          );
        })}
    </div>
  );
};
