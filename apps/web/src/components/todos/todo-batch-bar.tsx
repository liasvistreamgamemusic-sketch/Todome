'use client';

import React, { useCallback } from 'react';
import { clsx } from 'clsx';
import {
  CheckCircle,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useTodoStore } from '@todome/store/src/todo-store';
import { useTranslation } from '@todome/store';
import { useUpdateTodo, useDeleteTodo, useTodos } from '@/hooks/queries';
import type { TodoStatus } from '@todome/db';

export const TodoBatchBar = () => {
  const { t } = useTranslation();
  const selectedTodoIds = useTodoStore((s) => s.selectedTodoIds);
  const clearSelection = useTodoStore((s) => s.clearSelection);
  const updateTodo = useUpdateTodo();
  const deleteTodoMutation = useDeleteTodo();
  const { data: todos = [] } = useTodos();

  const count = selectedTodoIds.size;

  const handleBatchStatus = useCallback(
    (status: TodoStatus) => {
      const now = new Date().toISOString();
      for (const id of selectedTodoIds) {
        updateTodo.mutate({
          id,
          patch: {
            status,
            completed_at: status === 'completed' ? now : null,
            updated_at: now,
          },
        });
      }
      clearSelection();
    },
    [selectedTodoIds, updateTodo, clearSelection],
  );

  const handleBatchFlag = useCallback(() => {
    const now = new Date().toISOString();
    const anyNotFlagged = [...selectedTodoIds].some((id) => {
      const todo = todos.find((t) => t.id === id);
      return todo && !todo.is_flagged;
    });
    for (const id of selectedTodoIds) {
      updateTodo.mutate({
        id,
        patch: { is_flagged: anyNotFlagged, updated_at: now },
      });
    }
    clearSelection();
  }, [selectedTodoIds, todos, updateTodo, clearSelection]);

  const handleBatchDelete = useCallback(() => {
    for (const id of selectedTodoIds) {
      deleteTodoMutation.mutate(id);
    }
    clearSelection();
  }, [selectedTodoIds, deleteTodoMutation, clearSelection]);

  if (count === 0) return null;

  return (
    <div
      className={clsx(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-2.5 rounded-2xl',
        'bg-bg-primary border border-[var(--border)] shadow-xl',
        'animate-slide-up',
      )}
    >
      <span className="text-sm font-medium text-text-primary tabular-nums">
        {t('todos.batch.selected', { count: String(count) })}
      </span>

      <div className="h-4 w-px bg-[var(--border)] mx-1" />

      <button
        type="button"
        onClick={() => handleBatchStatus('completed')}
        className="p-2 rounded-lg hover:bg-bg-secondary text-[#388E3C] transition-colors"
        title={t('todos.swipe.complete')}
      >
        <CheckCircle className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={handleBatchFlag}
        className="p-2 rounded-lg hover:bg-bg-secondary text-[#F9A825] transition-colors"
        title={t('todos.flag')}
      >
        <Star className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={handleBatchDelete}
        className="p-2 rounded-lg hover:bg-bg-secondary text-[#D32F2F] transition-colors"
        title={t('todos.batch.deleteAll')}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="h-4 w-px bg-[var(--border)] mx-1" />

      <button
        type="button"
        onClick={clearSelection}
        className="p-2 rounded-lg hover:bg-bg-secondary text-text-tertiary transition-colors"
        title={t('common.cancel')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
