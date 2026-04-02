'use client';

import React, { useCallback, useState, useRef } from 'react';
import { clsx } from 'clsx';
import { Calendar, GripVertical, Star, CheckCircle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { Badge } from '@todome/ui/src/badge';
import { Checkbox } from '@todome/ui/src/checkbox';
import type { Todo, TodoStatus } from '@todome/store/src/types';
import { useTranslation } from '@todome/store';

type Props = {
  todo: Todo;
  onToggleStatus: (id: string) => void;
  onSelect: (id: string) => void;
  onToggleFlag?: (id: string) => void;
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

const SWIPE_THRESHOLD = 60;

const TodoListItemInner = ({ todo, onToggleStatus, onSelect, onToggleFlag }: Props) => {
  const { t } = useTranslation();

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);

  const formatDueDate = (dueDate: string | null): string | null => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    if (isToday(date)) return t('todos.today');
    return format(date, 'M/d');
  };
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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0]!.clientX - touchStartX.current;
    setSwipeX(Math.max(-120, Math.min(120, deltaX)));
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (swipeX > SWIPE_THRESHOLD) {
      onToggleStatus(todo.id);
    } else if (swipeX < -SWIPE_THRESHOLD) {
      onToggleFlag?.(todo.id);
    }
    setSwipeX(0);
    setIsSwiping(false);
  }, [swipeX, todo.id, onToggleStatus, onToggleFlag]);

  const subtaskCount = todo.subtasks?.length ?? 0;
  const subtaskCompleted = todo.subtasks?.filter((s) => s.completed).length ?? 0;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Right swipe background (complete) */}
      {swipeX > 0 && (
        <div
          className="absolute inset-y-0 left-0 flex items-center px-4 bg-[#388E3C] text-white"
          style={{ width: Math.abs(swipeX) }}
        >
          <CheckCircle className="h-5 w-5" />
        </div>
      )}
      {/* Left swipe background (flag) */}
      {swipeX < 0 && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-[#F9A825] text-white"
          style={{ width: Math.abs(swipeX) }}
        >
          <Star className="h-5 w-5" />
        </div>
      )}
      <div
        style={swipeX !== 0 ? { transform: `translateX(${swipeX}px)` } : undefined}
        className={clsx(
          'relative bg-bg-primary',
          isSwiping ? '' : 'transition-transform duration-150',
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
            title={`${t('todos.priority')}: ${todo.priority}`}
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

          {/* Subtask progress */}
          {subtaskCount > 0 && (
            <span className="text-[10px] text-text-tertiary flex-shrink-0 tabular-nums">
              {subtaskCompleted}/{subtaskCount}
            </span>
          )}

          {/* Flag icon */}
          {todo.is_flagged && (
            <Star className="h-3.5 w-3.5 text-[#F9A825] fill-[#F9A825] flex-shrink-0" />
          )}

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
      </div>
    </div>
  );
};

export const TodoListItem = React.memo(TodoListItemInner);
