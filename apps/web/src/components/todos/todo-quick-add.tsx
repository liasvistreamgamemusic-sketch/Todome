'use client';

import React, { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { Plus, Calendar } from 'lucide-react';
import { addDays, startOfDay } from 'date-fns';
import { useTodoStore } from '@todome/store/src/todo-store';
import type { TodoPriority } from '@todome/store/src/types';
import { createTodo, supabase } from '@todome/db';

const PRIORITY_DOTS: { value: TodoPriority; color: string; label: string }[] = [
  { value: 1, color: 'bg-[#388E3C]', label: '低' },
  { value: 2, color: 'bg-[#F9A825]', label: '中' },
  { value: 3, color: 'bg-[#F57C00]', label: '高' },
  { value: 4, color: 'bg-[#D32F2F]', label: '緊急' },
];

type DueDateShortcut = {
  label: string;
  getDate: () => string;
};

const DUE_DATE_SHORTCUTS: DueDateShortcut[] = [
  {
    label: '今日',
    getDate: () => startOfDay(new Date()).toISOString(),
  },
  {
    label: '明日',
    getDate: () => startOfDay(addDays(new Date(), 1)).toISOString(),
  },
  {
    label: '来週',
    getDate: () => startOfDay(addDays(new Date(), 7)).toISOString(),
  },
];

const generateId = (): string =>
  `todo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const TodoQuickAdd = () => {
  const addTodo = useTodoStore((s) => s.addTodo);
  const setFilterStatus = useTodoStore((s) => s.setFilterStatus);
  const todos = useTodoStore((s) => s.todos);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoPriority>(2);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const now = new Date().toISOString();
    const maxOrder = todos.reduce(
      (max, t) => Math.max(max, t.sort_order),
      0,
    );

    const { data: { user } } = await supabase.auth.getUser();

    const todo = {
      id: generateId(),
      user_id: user?.id ?? '',
      title: trimmedTitle,
      detail: null,
      priority,
      status: 'pending' as const,
      due_date: dueDate,
      remind_at: null,
      remind_repeat: 'none' as const,
      note_ids: [],
      tags: [],
      sort_order: maxOrder + 1,
      is_deleted: false,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };

    addTodo(todo);
    createTodo(todo).catch(console.error);
    setFilterStatus('all');

    setTitle('');
    setPriority(2);
    setDueDate(null);
    setShowOptions(false);
    inputRef.current?.focus();
  }, [title, priority, dueDate, addTodo, setFilterStatus, todos]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleFocus = useCallback(() => {
    setShowOptions(true);
  }, []);

  const activeDueLabel = dueDate
    ? DUE_DATE_SHORTCUTS.find(
        (s) =>
          startOfDay(new Date(s.getDate())).getTime() ===
          startOfDay(new Date(dueDate)).getTime(),
      )?.label ?? '期限あり'
    : null;

  return (
    <div className="space-y-2">
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-bg-primary border border-[var(--border)]',
          'focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:border-[var(--accent)]',
          'transition-all duration-150',
        )}
      >
        <Plus className="h-4 w-4 text-text-tertiary flex-shrink-0" />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="新しいTodoを追加..."
          className={clsx(
            'flex-1 bg-transparent border-none outline-none',
            'text-sm text-text-primary placeholder:text-text-tertiary',
          )}
        />
        {title.trim() && (
          <button
            type="button"
            onClick={handleSubmit}
            className={clsx(
              'px-3 py-1 rounded-md text-xs font-medium',
              'bg-[var(--accent)] text-white',
              'hover:opacity-90 transition-opacity',
            )}
          >
            追加
          </button>
        )}
      </div>

      {showOptions && (
        <div className="flex items-center gap-3 px-1">
          {/* Priority selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-tertiary">優先度:</span>
            {PRIORITY_DOTS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                title={p.label}
                className={clsx(
                  'h-4 w-4 rounded-full transition-all duration-150',
                  p.color,
                  priority === p.value
                    ? 'ring-2 ring-offset-1 ring-[var(--accent)] scale-110'
                    : 'opacity-50 hover:opacity-80',
                )}
              />
            ))}
          </div>

          {/* Due date shortcuts */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
            {DUE_DATE_SHORTCUTS.map((shortcut) => {
              const isActive =
                dueDate !== null &&
                startOfDay(new Date(shortcut.getDate())).getTime() ===
                  startOfDay(new Date(dueDate)).getTime();
              return (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() =>
                    setDueDate(isActive ? null : shortcut.getDate())
                  }
                  className={clsx(
                    'px-2 py-0.5 rounded text-xs transition-all duration-150',
                    isActive
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-primary',
                  )}
                >
                  {shortcut.label}
                </button>
              );
            })}
            {activeDueLabel && (
              <button
                type="button"
                onClick={() => setDueDate(null)}
                className="text-xs text-text-tertiary hover:text-[#D32F2F] transition-colors ml-1"
              >
                x
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
