'use client';

import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  List,
  LayoutGrid,
  CalendarDays,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  EyeOff,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
import { useTodoStore } from '@todome/store/src/todo-store';
import type { TodoViewMode, TodoSortBy, TodoGroupBy } from '@todome/store/src/todo-store';
import { TodoQuickAdd } from './todo-quick-add';
import { TodoList } from './todo-list';
import { TodoBoard } from './todo-board';
import { TodoDueDateView } from './todo-due-date-view';
import { TodoFilters } from './todo-filters';
import { TodoDetail } from './todo-detail';

const VIEW_MODE_OPTIONS: {
  value: TodoViewMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'list', label: 'リスト', icon: <List className="h-4 w-4" /> },
  {
    value: 'board',
    label: 'ボード',
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  {
    value: 'due-date',
    label: '期限別',
    icon: <CalendarDays className="h-4 w-4" />,
  },
];

const SORT_OPTIONS: { value: TodoSortBy; label: string }[] = [
  { value: 'priority', label: '優先度' },
  { value: 'due_date', label: '期限日' },
  { value: 'created_at', label: '作成日' },
  { value: 'manual', label: '手動' },
];

const GROUP_OPTIONS: { value: TodoGroupBy; label: string }[] = [
  { value: 'status', label: 'ステータス' },
  { value: 'priority', label: '優先度' },
  { value: 'tag', label: 'タグ' },
  { value: 'none', label: 'なし' },
];

export const TodoView = () => {
  const viewMode = useTodoStore((s) => s.viewMode);
  const setViewMode = useTodoStore((s) => s.setViewMode);
  const sortBy = useTodoStore((s) => s.sortBy);
  const setSortBy = useTodoStore((s) => s.setSortBy);
  const groupBy = useTodoStore((s) => s.groupBy);
  const setGroupBy = useTodoStore((s) => s.setGroupBy);
  const showCompleted = useTodoStore((s) => s.showCompleted);
  const toggleShowCompleted = useTodoStore((s) => s.toggleShowCompleted);
  const selectedTodoId = useTodoStore((s) => s.selectedTodoId);

  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const handleViewModeChange = useCallback(
    (mode: TodoViewMode) => {
      setViewMode(mode);
    },
    [setViewMode],
  );

  const handleSortChange = useCallback(
    (sort: TodoSortBy) => {
      setSortBy(sort);
      setShowSortMenu(false);
    },
    [setSortBy],
  );

  const handleGroupChange = useCallback(
    (group: TodoGroupBy) => {
      setGroupBy(group);
      setShowGroupMenu(false);
    },
    [setGroupBy],
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'list':
        return <TodoList />;
      case 'board':
        return <TodoBoard />;
      case 'due-date':
        return <TodoDueDateView />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex-shrink-0 space-y-3 p-4 border-b border-[var(--border)]">
        {/* Quick add */}
        <TodoQuickAdd />

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-bg-secondary rounded-lg p-0.5">
            {VIEW_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleViewModeChange(opt.value)}
                title={opt.label}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium',
                  'transition-all duration-150',
                  viewMode === opt.value
                    ? 'bg-bg-primary text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                {opt.icon}
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSortMenu((prev) => !prev);
                  setShowGroupMenu(false);
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs',
                  'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary',
                  'transition-colors duration-150',
                )}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">並替</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showSortMenu && (
                <div
                  className={clsx(
                    'absolute right-0 top-full mt-1 z-20 min-w-[120px]',
                    'bg-bg-primary border border-[var(--border)] rounded-lg shadow-lg',
                    'py-1',
                  )}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSortChange(opt.value)}
                      className={clsx(
                        'w-full text-left px-3 py-1.5 text-xs',
                        'hover:bg-bg-secondary transition-colors',
                        sortBy === opt.value
                          ? 'text-[var(--accent)] font-medium'
                          : 'text-text-secondary',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Group dropdown */}
            {viewMode === 'list' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupMenu((prev) => !prev);
                    setShowSortMenu(false);
                  }}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs',
                    'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary',
                    'transition-colors duration-150',
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">グループ</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showGroupMenu && (
                  <div
                    className={clsx(
                      'absolute right-0 top-full mt-1 z-20 min-w-[120px]',
                      'bg-bg-primary border border-[var(--border)] rounded-lg shadow-lg',
                      'py-1',
                    )}
                  >
                    {GROUP_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleGroupChange(opt.value)}
                        className={clsx(
                          'w-full text-left px-3 py-1.5 text-xs',
                          'hover:bg-bg-secondary transition-colors',
                          groupBy === opt.value
                            ? 'text-[var(--accent)] font-medium'
                            : 'text-text-secondary',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs',
                'transition-colors duration-150',
                showFilters
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary',
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">フィルター</span>
            </button>

            {/* Show completed toggle */}
            <button
              type="button"
              onClick={toggleShowCompleted}
              title={showCompleted ? '完了を非表示' : '完了を表示'}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs',
                'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary',
                'transition-colors duration-150',
              )}
            >
              {showCompleted ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {showCompleted ? '完了表示中' : '完了非表示'}
              </span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="pt-1">
            <TodoFilters />
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderContent()}
      </div>

      {/* Detail panel */}
      {selectedTodoId && <TodoDetail />}
    </div>
  );
};
