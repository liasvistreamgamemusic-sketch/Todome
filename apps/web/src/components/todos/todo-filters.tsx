'use client';

import React, { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { X, Filter } from 'lucide-react';
import { Badge } from '@todome/ui/src/badge';
import { useTodoStore } from '@todome/store/src/todo-store';
import { useTranslation } from '@todome/store';
import { useTodos } from '@/hooks/queries';
import type { Todo, TodoStatus, TodoPriority } from '@todome/db';

export const TodoFilters = () => {
  const { t } = useTranslation();

  const STATUS_FILTERS: { value: TodoStatus | 'all'; label: string }[] = [
    { value: 'all', label: t('todos.all') },
    { value: 'pending', label: t('todos.status.notStarted') },
    { value: 'in_progress', label: t('todos.status.inProgress') },
    { value: 'completed', label: t('todos.status.completed') },
    { value: 'cancelled', label: t('todos.status.cancelled') },
  ];

  const PRIORITY_FILTERS: {
    value: TodoPriority | 'all';
    label: string;
    color: string;
  }[] = [
    { value: 'all', label: t('todos.all'), color: '' },
    { value: 1, label: t('todos.priority.low'), color: 'bg-[#388E3C]' },
    { value: 2, label: t('todos.priority.medium'), color: 'bg-[#F9A825]' },
    { value: 3, label: t('todos.priority.high'), color: 'bg-[#F57C00]' },
    { value: 4, label: t('todos.priority.urgent'), color: 'bg-[#D32F2F]' },
  ];
  const filterStatus = useTodoStore((s) => s.filterStatus);
  const filterPriority = useTodoStore((s) => s.filterPriority);
  const filterTags = useTodoStore((s) => s.filterTags);
  const setFilterStatus = useTodoStore((s) => s.setFilterStatus);
  const setFilterPriority = useTodoStore((s) => s.setFilterPriority);
  const setFilterTags = useTodoStore((s) => s.setFilterTags);
  const { data: todos = [] } = useTodos();

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const todo of todos) {
      for (const tag of todo.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [todos]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterPriority !== 'all') count++;
    if (filterTags.length > 0) count++;
    return count;
  }, [filterStatus, filterPriority, filterTags]);

  const handleClearAll = useCallback(() => {
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterTags([]);
  }, [setFilterStatus, setFilterPriority, setFilterTags]);

  const handleToggleTag = useCallback(
    (tag: string) => {
      if (filterTags.includes(tag)) {
        setFilterTags(filterTags.filter((t) => t !== tag));
      } else {
        setFilterTags([...filterTags, tag]);
      }
    },
    [filterTags, setFilterTags],
  );

  return (
    <div className="space-y-3 p-3 rounded-lg bg-bg-secondary/50 border border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
          <Filter className="h-4 w-4" />
          <span>{t('todos.filter')}</span>
          {activeFilterCount > 0 && (
            <Badge size="sm" variant="primary">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="h-3 w-3" />
            {t('todos.filterClear')}
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-text-tertiary">
          {t('todos.status')}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterStatus(opt.value)}
              className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium',
                'transition-all duration-150',
                filterStatus === opt.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-bg-primary text-text-secondary hover:bg-bg-tertiary border border-[var(--border)]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority filter */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-text-tertiary">
          {t('todos.priority')}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITY_FILTERS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterPriority(opt.value)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                'transition-all duration-150',
                filterPriority === opt.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-bg-primary text-text-secondary hover:bg-bg-tertiary border border-[var(--border)]',
              )}
            >
              {opt.color && (
                <span
                  className={clsx('h-2 w-2 rounded-full', opt.color)}
                />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-text-tertiary">
            {t('todos.tag')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleToggleTag(tag)}
                className={clsx(
                  'px-2.5 py-1 rounded-full text-xs font-medium',
                  'transition-all duration-150',
                  filterTags.includes(tag)
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-bg-primary text-text-secondary hover:bg-bg-tertiary border border-[var(--border)]',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
