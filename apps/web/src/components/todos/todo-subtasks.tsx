'use client';

import React, { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { Checkbox } from '@todome/ui/src/checkbox';
import { Input } from '@todome/ui/src/input';

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

type Props = {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
};

const MAX_SUBTASKS = 20;

const generateId = (): string =>
  `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const TodoSubtasks = ({ subtasks, onChange }: Props) => {
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progress =
    subtasks.length > 0
      ? Math.round((completedCount / subtasks.length) * 100)
      : 0;

  const handleAdd = useCallback(() => {
    const title = newTitle.trim();
    if (!title || subtasks.length >= MAX_SUBTASKS) return;

    const newSubtask: Subtask = {
      id: generateId(),
      title,
      completed: false,
    };
    onChange([...subtasks, newSubtask]);
    setNewTitle('');
    inputRef.current?.focus();
  }, [newTitle, subtasks, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const handleToggle = useCallback(
    (id: string) => {
      onChange(
        subtasks.map((s) =>
          s.id === id ? { ...s, completed: !s.completed } : s,
        ),
      );
    },
    [subtasks, onChange],
  );

  const handleDelete = useCallback(
    (id: string) => {
      onChange(subtasks.filter((s) => s.id !== id));
    },
    [subtasks, onChange],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const next = [...subtasks];
      const temp = next[index - 1]!;
      next[index - 1] = next[index]!;
      next[index] = temp;
      onChange(next);
    },
    [subtasks, onChange],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= subtasks.length - 1) return;
      const next = [...subtasks];
      const temp = next[index]!;
      next[index] = next[index + 1]!;
      next[index + 1] = temp;
      onChange(next);
    },
    [subtasks, onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">
          サブタスク
        </span>
        <span className="text-xs text-text-tertiary">
          {completedCount}/{subtasks.length}
        </span>
      </div>

      {subtasks.length > 0 && (
        <div className="w-full bg-bg-tertiary rounded-full h-1.5">
          <div
            className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {subtasks.map((subtask, index) => (
          <div
            key={subtask.id}
            className={clsx(
              'group flex items-center gap-2 px-2 py-1.5 rounded-md',
              'hover:bg-bg-secondary transition-colors duration-150',
            )}
          >
            <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary">
              <GripVertical className="h-3.5 w-3.5" />
            </span>
            <Checkbox
              checked={subtask.completed}
              onChange={() => handleToggle(subtask.id)}
            />
            <span
              className={clsx(
                'flex-1 text-sm truncate',
                subtask.completed
                  ? 'line-through text-text-tertiary'
                  : 'text-text-primary',
              )}
            >
              {subtask.title}
            </span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                className="p-0.5 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                aria-label="上に移動"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="p-0.5 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors"
                onClick={() => handleMoveDown(index)}
                disabled={index === subtasks.length - 1}
                aria-label="下に移動"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="p-0.5 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-[#D32F2F] transition-colors"
                onClick={() => handleDelete(subtask.id)}
                aria-label="削除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {subtasks.length < MAX_SUBTASKS && (
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="サブタスクを追加..."
            variant="ghost"
            className="flex-1 h-8 text-sm"
            leftIcon={<Plus className="h-4 w-4" />}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className={clsx(
              'text-xs font-medium px-2 py-1 rounded-md transition-colors',
              newTitle.trim()
                ? 'text-[var(--accent)] hover:bg-[var(--accent)]/10'
                : 'text-text-tertiary cursor-not-allowed',
            )}
          >
            追加
          </button>
        </div>
      )}

      {subtasks.length >= MAX_SUBTASKS && (
        <p className="text-xs text-text-tertiary">
          サブタスクの上限({MAX_SUBTASKS}件)に達しました
        </p>
      )}
    </div>
  );
};
