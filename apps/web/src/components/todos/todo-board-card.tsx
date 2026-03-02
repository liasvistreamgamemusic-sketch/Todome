'use client';

import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import { Calendar } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { Badge } from '@todome/ui/src/badge';
import type { Todo } from '@todome/store/src/types';

type Props = {
  todo: Todo;
  onSelect: (id: string) => void;
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

const TodoBoardCardInner = ({ todo, onSelect }: Props) => {
  const dueInfo = getDueDateDisplay(todo.due_date);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const handleClick = useCallback(() => {
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
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={clsx(
        'overflow-hidden rounded-lg border border-[var(--border)]',
        'bg-bg-primary hover:bg-bg-secondary',
        'cursor-grab active:cursor-grabbing',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        isDragging && 'opacity-50',
      )}
    >
      <div className="p-3 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={clsx('h-2 w-2 rounded-full flex-shrink-0', PRIORITY_BAR_COLORS[todo.priority])} />
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
        </div>

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
