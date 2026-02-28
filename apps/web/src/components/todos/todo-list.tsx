'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, Inbox } from 'lucide-react';
import { useTodoStore } from '@todome/store/src/todo-store';
import type { Todo } from '@todome/store/src/types';
import { updateTodo as persistTodo } from '@todome/db';
import { TodoListItem } from './todo-list-item';

const GROUP_LABELS: Record<string, string> = {
  pending: '未着手',
  in_progress: '進行中',
  completed: '完了',
  cancelled: 'キャンセル',
  '1': '低',
  '2': '中',
  '3': '高',
  '4': '緊急',
  untagged: 'タグなし',
  all: 'すべて',
};

const STATUS_ORDER = ['pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITY_ORDER = ['4', '3', '2', '1'];

type GroupSectionProps = {
  groupKey: string;
  todos: Todo[];
  defaultOpen?: boolean;
  onToggleStatus: (id: string) => void;
  onSelect: (id: string) => void;
};

const GroupSection = ({
  groupKey,
  todos,
  defaultOpen = true,
  onToggleStatus,
  onSelect,
}: GroupSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const label = GROUP_LABELS[groupKey] ?? groupKey;

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
  const groupedTodos = useTodoStore((s) => s.groupedTodos);
  const groupBy = useTodoStore((s) => s.groupBy);
  const showCompleted = useTodoStore((s) => s.showCompleted);
  const toggleTodoStatus = useTodoStore((s) => s.toggleTodoStatus);
  const selectTodo = useTodoStore((s) => s.selectTodo);

  const groups = groupedTodos();

  const sortedKeys = useMemo(
    () => sortGroupKeys(Object.keys(groups), groupBy),
    [groups, groupBy],
  );

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

  const hasAnyTodos = sortedKeys.some(
    (key) => (groups[key]?.length ?? 0) > 0,
  );

  if (!hasAnyTodos) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
        <Inbox className="h-12 w-12 mb-3" />
        <p className="text-sm">Todoがありません</p>
        <p className="text-xs mt-1">上の入力欄から新しいTodoを追加しましょう</p>
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
        const todos = groups[key];
        if (!todos || todos.length === 0) return null;
        return (
          <GroupSection
            key={key}
            groupKey={key}
            todos={todos}
            onToggleStatus={handleToggleStatus}
            onSelect={handleSelect}
          />
        );
      })}
      {showCompleted &&
        completedKeys.map((key) => {
          const todos = groups[key];
          if (!todos || todos.length === 0) return null;
          return (
            <GroupSection
              key={key}
              groupKey={key}
              todos={todos}
              defaultOpen={false}
              onToggleStatus={handleToggleStatus}
              onSelect={handleSelect}
            />
          );
        })}
    </div>
  );
};
