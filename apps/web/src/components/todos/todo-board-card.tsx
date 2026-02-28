'use client';

import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { Calendar } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { Badge } from '@todome/ui/src/badge';
import type { Todo } from '@todome/store/src/types';

type Props = {
  todo: Todo;
  onSelect: (id: string) => void;
  onDragStart: (e: React.DragEvent, todoId: string) => void;
};

const PRIORITY_BAR_COLORS: Record<number, string> = {
  1: 'bg-[#388E3C]',
  2: 'bg-[#F9A825]',
  3: 'bg-[#F57C00]',
  4: 'bg-[#D32F2F]',
};

const getDueDateDisplay = (
  dueDate: string | null,
): { label: string; style: string } | null => {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  if (isToday(date)) return { label: '今日', style: 'text-[#F57C00]' };
  if (isPast(date))
    return { label: format(date, 'M/d'), style: 'text-[#D32F2F]' };
  return { label: format(date, 'M/d'), style: 'text-text-tertiary' };
};

const TodoBoardCardInner = ({ todo, onSelect, onDragStart }: Props) => {
  const dueInfo = getDueDateDisplay(todo.due_date);

  const handleClick = useCallback(() => {
    onSelect(todo.id);
  }, [onSelect, todo.id]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      onDragStart(e, todo.id);
    },
    [onDragStart, todo.id],
  );

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
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={clsx(
        'relative flex overflow-hidden rounded-lg border border-[var(--border)]',
        'bg-bg-primary hover:bg-bg-secondary',
        'cursor-grab active:cursor-grabbing',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
      )}
    >
      <span
        className={clsx(
          'w-1 flex-shrink-0',
          PRIORITY_BAR_COLORS[todo.priority],
        )}
      />
      <div className="flex-1 p-3 min-w-0">
        <p
          className={clsx(
            'text-sm font-medium truncate',
            todo.status === 'completed' || todo.status === 'cancelled'
              ? 'line-through text-text-tertiary'
              : 'text-text-primary',
          )}
        >
          {todo.title}
        </p>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {dueInfo && (
            <span
              className={clsx(
                'flex items-center gap-1 text-xs',
                dueInfo.style,
              )}
            >
              <Calendar className="h-3 w-3" />
              {dueInfo.label}
            </span>
          )}
          {todo.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} size="sm" variant="default">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export const TodoBoardCard = React.memo(TodoBoardCardInner);
