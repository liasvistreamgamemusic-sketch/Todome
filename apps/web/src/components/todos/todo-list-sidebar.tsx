'use client';

import React, { useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  CalendarDays,
  Calendar,
  Inbox,
  Star,
  CheckCircle2,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import { useTodoStore } from '@todome/store/src/todo-store';
import { useTranslation } from '@todome/store';
import type { TranslationKey } from '@todome/store';
import { useTodos, useTodoLists } from '@/hooks/queries';
import { getSmartListCounts, getListCounts } from '@/lib/todo-filters';
import type { SmartListId } from '@/lib/todo-filters';

type Props = {
  onAddList: () => void;
  onEditList: (listId: string) => void;
};

const SMART_LISTS: {
  id: SmartListId;
  labelKey: TranslationKey;
  icon: React.ReactNode;
  color: string;
}[] = [
  { id: 'today', labelKey: 'todos.smart.today', icon: <CalendarDays className="h-4 w-4" />, color: '#F57C00' },
  { id: 'scheduled', labelKey: 'todos.smart.scheduled', icon: <Calendar className="h-4 w-4" />, color: '#4285F4' },
  { id: 'all', labelKey: 'todos.smart.all', icon: <Inbox className="h-4 w-4" />, color: 'var(--text-primary)' },
  { id: 'flagged', labelKey: 'todos.smart.flagged', icon: <Star className="h-4 w-4" />, color: '#F9A825' },
  { id: 'completed', labelKey: 'todos.smart.completed', icon: <CheckCircle2 className="h-4 w-4" />, color: '#388E3C' },
];

export const TodoListSidebar = ({ onAddList, onEditList }: Props) => {
  const { t } = useTranslation();
  const selectedListId = useTodoStore((s) => s.selectedListId);
  const setSelectedList = useTodoStore((s) => s.setSelectedList);
  const { data: todos = [] } = useTodos();
  const { data: lists = [] } = useTodoLists();

  const smartCounts = useMemo(() => getSmartListCounts(todos), [todos]);
  const listCounts = useMemo(() => getListCounts(todos), [todos]);

  const handleSelect = useCallback(
    (id: string | null) => {
      setSelectedList(id);
    },
    [setSelectedList],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Smart Lists */}
      <div className="space-y-0.5 p-2">
        {SMART_LISTS.map((sl) => (
          <button
            key={sl.id}
            type="button"
            onClick={() => handleSelect(sl.id)}
            className={clsx(
              'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm',
              'transition-colors duration-150',
              selectedListId === sl.id
                ? 'bg-bg-tertiary text-text-primary font-medium'
                : 'text-text-secondary hover:bg-bg-secondary',
            )}
          >
            <span style={{ color: sl.color }}>{sl.icon}</span>
            <span className="flex-1 text-left">{t(sl.labelKey)}</span>
            <span className="text-xs text-text-tertiary tabular-nums">
              {smartCounts[sl.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-[var(--border)]" />

      {/* My Lists */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-1">
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            {t('todos.myLists')}
          </span>
        </div>
        <div className="space-y-0.5 p-2 pt-1">
          {lists.map((list) => (
            <div
              key={list.id}
              className={clsx(
                'group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm',
                'transition-colors duration-150 cursor-pointer',
                selectedListId === list.id
                  ? 'bg-bg-tertiary text-text-primary font-medium'
                  : 'text-text-secondary hover:bg-bg-secondary',
              )}
              onClick={() => handleSelect(list.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(list.id);
                }
              }}
            >
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: list.color ?? 'var(--accent)' }}
              />
              <span className="flex-1 text-left truncate">{list.name}</span>
              <span className="text-xs text-text-tertiary tabular-nums">
                {listCounts[list.id] ?? 0}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditList(list.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-bg-tertiary text-text-tertiary transition-all"
                aria-label={t('todos.editList')}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add List button */}
      <div className="p-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onAddList}
          className={clsx(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm',
            'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary',
            'transition-colors duration-150',
          )}
        >
          <Plus className="h-4 w-4" />
          {t('todos.addList')}
        </button>
      </div>
    </div>
  );
};
