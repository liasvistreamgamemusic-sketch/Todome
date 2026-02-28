'use client';

import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { Calendar, GripVertical } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { Badge } from '@todome/ui/src/badge';
import { Checkbox } from '@todome/ui/src/checkbox';
import type { Todo, TodoStatus } from '@todome/store/src/types';

type Props = {
  todo: Todo;
  onToggleStatus: (id: string) => void;
  onSelect: (id: string) => void;
};

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-[#388E3C]',
  2: 'bg-[#F9A825]',
  3: 'bg-[#F57C00]',
  4: 'bg-[#D32F2F]',
};

const statusToChecked = (status: TodoStatus): boolean =>
  status === 'completed' || status === 'cancelled';

const getDueDateStyle = (dueDate: string | null): string => {
  if (!dueDate) return '';
  const date = new Date(dueDate);
  if (isToday(date)) return 'text-[#F57C00]';
  if (isPast(date)) return 'text-[#D32F2F]';
  return 'text-text-tertiary';
};

const formatDueDate = (dueDate: string | null): string | null => {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  if (isToday(date)) return '今日';
  return format(date, 'M/d');
};

const TodoListItemInner = ({ todo, onToggleStatus, onSelect }: Props) => {
  const isCompleted = statusToChecked(todo.status);
  const dueDateLabel = formatDueDate(todo.due_date);
  const dueDateStyle = getDueDateStyle(todo.due_date);

  const handleToggle = useCallback(() => {
    onToggleStatus(todo.id);
  }, [onToggleStatus, todo.id]);

  const handleSelect = useCallback(() => {
    onSelect(todo.id);
  }, [onSelect, todo.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(todo.id);
      }
    },
    [onSelect, todo.id],
  );

  return (
    <div
      className={clsx(
        'group flex items-center gap-3 px-3 py-2 rounded-lg',
        'hover:bg-bg-secondary transition-colors duration-150 cursor-pointer',
        'border border-transparent hover:border-[var(--border)]',
      )}
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-text-tertiary">
        <GripVertical className="h-4 w-4" />
      </span>

      <span
        className="flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isCompleted}
          onChange={handleToggle}
        />
      </span>

      <span
        className={clsx(
          'h-2 w-2 rounded-full flex-shrink-0',
          PRIORITY_COLORS[todo.priority],
        )}
        title={`優先度: ${todo.priority}`}
      />

      <span
        className={clsx(
          'flex-1 text-sm truncate',
          isCompleted
            ? 'line-through text-text-tertiary'
            : 'text-text-primary',
        )}
      >
        {todo.title}
      </span>

      {todo.tags.length > 0 && (
        <span className="hidden sm:flex items-center gap-1 flex-shrink-0">
          {todo.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} size="sm" variant="default">
              {tag}
            </Badge>
          ))}
          {todo.tags.length > 2 && (
            <span className="text-xs text-text-tertiary">
              +{todo.tags.length - 2}
            </span>
          )}
        </span>
      )}

      {dueDateLabel && (
        <span
          className={clsx(
            'flex items-center gap-1 text-xs flex-shrink-0',
            dueDateStyle,
          )}
        >
          <Calendar className="h-3 w-3" />
          {dueDateLabel}
        </span>
      )}
    </div>
  );
};

export const TodoListItem = React.memo(TodoListItemInner);
