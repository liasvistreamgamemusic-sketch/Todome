'use client';

import React, { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { X, Filter } from 'lucide-react';
import { Badge } from '@todome/ui/src/badge';
import { useTodoStore } from '@todome/store/src/todo-store';
import type { TodoStatus, TodoPriority } from '@todome/store/src/types';

const STATUS_FILTERS: { value: TodoStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'pending', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
];

const PRIORITY_FILTERS: {
  value: TodoPriority | 'all';
  label: string;
  color: string;
}[] = [
  { value: 'all', label: 'すべて', color: '' },
  { value: 1, label: '低', color: 'bg-[#388E3C]' },
  { value: 2, label: '中', color: 'bg-[#F9A825]' },
  { value: 3, label: '高', color: 'bg-[#F57C00]' },
  { value: 4, label: '緊急', color: 'bg-[#D32F2F]' },
];

export const TodoFilters = () => {
  const filterStatus = useTodoStore((s) => s.filterStatus);
  const filterPriority = useTodoStore((s) => s.filterPriority);
  const filterTags = useTodoStore((s) => s.filterTags);
  const setFilterStatus = useTodoStore((s) => s.setFilterStatus);
  const setFilterPriority = useTodoStore((s) => s.setFilterPriority);
  const setFilterTags = useTodoStore((s) => s.setFilterTags);
  const todos = useTodoStore((s) => s.todos);

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
          <span>フィルター</span>
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
            クリア
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-text-tertiary">
          ステータス
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
          優先度
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
            タグ
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
