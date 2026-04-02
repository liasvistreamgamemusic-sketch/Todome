'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  Search,
  X as XIcon,
  Sun,
  Calendar,
  Inbox,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { useTodoStore } from '@todome/store/src/todo-store';
import type { TodoViewMode, TodoSortBy, TodoGroupBy } from '@todome/store/src/todo-store';
import { useTranslation } from '@todome/store';
import type { TranslationKey } from '@todome/store';
import { useIsMobile } from '@todome/hooks';
import { useTodoLists, useTodos } from '@/hooks/queries';
import { getSmartListCounts, getListCounts } from '@/lib/todo-filters';
import type { SmartListId } from '@/lib/todo-filters';
import { TodoQuickAdd } from './todo-quick-add';
import { TodoList } from './todo-list';
import { TodoBoard } from './todo-board';
import { TodoDueDateView } from './todo-due-date-view';
import { TodoFilters } from './todo-filters';
import { TodoDetail } from './todo-detail';
import { TodoBatchBar } from './todo-batch-bar';
import { TodoListSidebar } from './todo-list-sidebar';
import { TodoListDialog } from './todo-list-dialog';

/* ─── Mobile pill selector for list switching ────────────────────────── */

const SMART_LIST_PILLS: {
  id: SmartListId;
  labelKey: TranslationKey;
  icon: React.ReactNode;
}[] = [
  { id: 'today', labelKey: 'todos.smart.today', icon: <Sun className="h-3 w-3" /> },
  { id: 'scheduled', labelKey: 'todos.smart.scheduled', icon: <Calendar className="h-3 w-3" /> },
  { id: 'all', labelKey: 'todos.smart.all', icon: <Inbox className="h-3 w-3" /> },
  { id: 'flagged', labelKey: 'todos.smart.flagged', icon: <Star className="h-3 w-3" /> },
  { id: 'completed', labelKey: 'todos.smart.completed', icon: <CheckCircle2 className="h-3 w-3" /> },
];

const MobileListSelector = () => {
  const { t } = useTranslation();
  const selectedListId = useTodoStore((s) => s.selectedListId);
  const setSelectedList = useTodoStore((s) => s.setSelectedList);
  const { data: todos = [] } = useTodos();
  const { data: lists = [] } = useTodoLists();

  const smartCounts = useMemo(() => getSmartListCounts(todos), [todos]);
  const listCounts = useMemo(() => getListCounts(todos), [todos]);
  const activeLists = useMemo(
    () => lists.filter((l) => !l.is_deleted).sort((a, b) => a.sort_order - b.sort_order),
    [lists],
  );

  return (
    <div className="flex-shrink-0 border-b border-[var(--border)] bg-bg-primary">
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none">
        {/* Smart list pills */}
        {SMART_LIST_PILLS.map((sl) => (
          <button
            key={sl.id}
            type="button"
            onClick={() => setSelectedList(sl.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
              'whitespace-nowrap flex-shrink-0 transition-colors duration-150',
              selectedListId === sl.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-bg-secondary text-text-secondary',
            )}
          >
            {sl.icon}
            {t(sl.labelKey)}
            <span
              className={clsx(
                'text-[10px] tabular-nums',
                selectedListId === sl.id ? 'text-white/70' : 'text-text-tertiary',
              )}
            >
              {smartCounts[sl.id]}
            </span>
          </button>
        ))}

        {/* Divider */}
        {activeLists.length > 0 && (
          <span className="h-4 w-px bg-[var(--border)] flex-shrink-0 mx-0.5" />
        )}

        {/* User list pills */}
        {activeLists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => setSelectedList(list.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
              'whitespace-nowrap flex-shrink-0 transition-colors duration-150',
              selectedListId === list.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-bg-secondary text-text-secondary',
            )}
          >
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: list.color ?? 'var(--text-tertiary)' }}
            />
            {list.name}
            <span
              className={clsx(
                'text-[10px] tabular-nums',
                selectedListId === list.id ? 'text-white/70' : 'text-text-tertiary',
              )}
            >
              {listCounts[list.id] ?? 0}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ─── Main TodoView ──────────────────────────────────────────────────── */

export const TodoView = () => {
  const { t } = useTranslation();
  const viewMode = useTodoStore((s) => s.viewMode);
  const setViewMode = useTodoStore((s) => s.setViewMode);
  const sortBy = useTodoStore((s) => s.sortBy);
  const setSortBy = useTodoStore((s) => s.setSortBy);
  const groupBy = useTodoStore((s) => s.groupBy);
  const setGroupBy = useTodoStore((s) => s.setGroupBy);
  const showCompleted = useTodoStore((s) => s.showCompleted);
  const toggleShowCompleted = useTodoStore((s) => s.toggleShowCompleted);
  const selectedTodoId = useTodoStore((s) => s.selectedTodoId);
  const selectedListId = useTodoStore((s) => s.selectedListId);
  const searchQuery = useTodoStore((s) => s.searchQuery);
  const setSearchQuery = useTodoStore((s) => s.setSearchQuery);

  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);

  const handleOpenAddList = useCallback(() => {
    setEditingListId(null);
    setListDialogOpen(true);
  }, []);

  const handleOpenEditList = useCallback((id: string) => {
    setEditingListId(id);
    setListDialogOpen(true);
  }, []);

  const VIEW_MODE_OPTIONS: {
    value: TodoViewMode;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: 'list', label: t('todos.list'), icon: <List className="h-4 w-4" /> },
    { value: 'board', label: t('todos.board'), icon: <LayoutGrid className="h-4 w-4" /> },
    { value: 'due-date', label: t('todos.byDueDate'), icon: <CalendarDays className="h-4 w-4" /> },
  ];

  const SORT_OPTIONS: { value: TodoSortBy; label: string }[] = [
    { value: 'priority', label: t('todos.priority') },
    { value: 'due_date', label: t('todos.dueDate') },
    { value: 'created_at', label: t('todos.createdDate') },
    { value: 'manual', label: t('todos.manual') },
  ];

  const GROUP_OPTIONS: { value: TodoGroupBy; label: string }[] = [
    { value: 'status', label: t('todos.status') },
    { value: 'priority', label: t('todos.priority') },
    { value: 'tag', label: t('todos.tag') },
    { value: 'none', label: t('common.none') },
  ];

  const isMobile = useIsMobile();
  const hasUserChangedView = useRef(false);

  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const handleViewModeChange = useCallback(
    (mode: TodoViewMode) => {
      hasUserChangedView.current = true;
      setViewMode(mode);
    },
    [setViewMode],
  );

  // Set default view: list for mobile, board for desktop
  useEffect(() => {
    if (hasUserChangedView.current) return;
    setViewMode(isMobile ? 'list' : 'board');
  }, [isMobile, setViewMode]);

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
    <div className="flex h-full">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="w-60 flex-shrink-0 border-r border-[var(--border)] bg-bg-secondary">
          <TodoListSidebar onAddList={handleOpenAddList} onEditList={handleOpenEditList} />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile list selector (horizontal scrollable pills) */}
        {isMobile && <MobileListSelector />}

        {/* Top bar */}
        <div className="flex-shrink-0 space-y-3 p-4 border-b border-[var(--border)]">
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                'flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'bg-bg-secondary border border-transparent',
                'focus-within:border-[var(--border)]',
                'transition-colors duration-150',
              )}
            >
              <Search className="h-3.5 w-3.5 text-text-tertiary flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('todos.search')}
                className="flex-1 bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-tertiary"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')}>
                  <XIcon className="h-3 w-3 text-text-tertiary hover:text-text-secondary transition-colors" />
                </button>
              )}
            </div>
          </div>

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
                  <span className="hidden sm:inline">{t('todos.sortLabel')}</span>
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
                          'w-full text-left px-3 py-2.5 md:py-1.5 text-xs',
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
                    <span className="hidden sm:inline">{t('todos.groupLabel')}</span>
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
                            'w-full text-left px-3 py-2.5 md:py-1.5 text-xs',
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
                <span className="hidden sm:inline">{t('todos.filter')}</span>
              </button>

              {/* Show completed toggle */}
              <button
                type="button"
                onClick={toggleShowCompleted}
                title={showCompleted ? t('todos.hideCompleted') : t('todos.showCompleted')}
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
                  {showCompleted ? t('todos.completedShown') : t('todos.completedHidden')}
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

      {/* Batch operations bar */}
      <TodoBatchBar />

      {/* TodoListDialog */}
      <TodoListDialog
        isOpen={listDialogOpen}
        onClose={() => {
          setListDialogOpen(false);
          setEditingListId(null);
        }}
        editListId={editingListId}
      />
    </div>
  );
};
