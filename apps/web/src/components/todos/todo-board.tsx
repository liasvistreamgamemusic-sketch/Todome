'use client';

import React, { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { useTodoStore } from '@todome/store/src/todo-store';
import type { Todo, TodoStatus } from '@todome/store/src/types';
import { TodoBoardCard } from './todo-board-card';

type Column = {
  status: TodoStatus;
  label: string;
};

const COLUMNS: Column[] = [
  { status: 'pending', label: '未着手' },
  { status: 'in_progress', label: '進行中' },
  { status: 'completed', label: '完了' },
  { status: 'cancelled', label: 'キャンセル' },
];

const STATUS_HEADER_COLORS: Record<TodoStatus, string> = {
  pending: 'bg-[#90CAF9]',
  in_progress: 'bg-[#F57C00]',
  completed: 'bg-[#388E3C]',
  cancelled: 'bg-[#9E9E9E]',
};

export const TodoBoard = () => {
  const allTodos = useTodoStore((s) => s.todos);
  const updateTodo = useTodoStore((s) => s.updateTodo);
  const selectTodo = useTodoStore((s) => s.selectTodo);
  const [dragOverColumn, setDragOverColumn] = useState<TodoStatus | null>(
    null,
  );

  const todos = allTodos.filter((t) => !t.is_deleted);

  const todosByStatus = COLUMNS.reduce<Record<TodoStatus, Todo[]>>(
    (acc, col) => {
      acc[col.status] = todos.filter((t) => t.status === col.status);
      return acc;
    },
    { pending: [], in_progress: [], completed: [], cancelled: [] },
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, todoId: string) => {
      e.dataTransfer.setData('text/plain', todoId);
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, status: TodoStatus) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumn(status);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: TodoStatus) => {
      e.preventDefault();
      setDragOverColumn(null);
      const todoId = e.dataTransfer.getData('text/plain');
      if (!todoId) return;

      const now = new Date().toISOString();
      const completedAt = targetStatus === 'completed' ? now : null;

      updateTodo(todoId, {
        status: targetStatus,
        completed_at: completedAt,
        updated_at: now,
      });
    },
    [updateTodo],
  );

  const handleSelect = useCallback(
    (id: string) => {
      selectTodo(id);
    },
    [selectTodo],
  );

  return (
    <div className="flex flex-col gap-3 md:flex-row md:gap-4 md:overflow-x-auto pb-4 h-full">
      {COLUMNS.map((col) => {
        const columnTodos = todosByStatus[col.status];
        return (
          <div
            key={col.status}
            className={clsx(
              'flex flex-col w-full md:flex-shrink-0 md:w-72 rounded-lg',
              'glass-sm border',
              dragOverColumn === col.status &&
                'ring-2 ring-[var(--accent)] border-[var(--accent)]',
            )}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)]">
              <span
                className={clsx(
                  'h-2.5 w-2.5 rounded-full',
                  STATUS_HEADER_COLORS[col.status],
                )}
              />
              <span className="text-sm font-medium text-text-primary">
                {col.label}
              </span>
              <span className="text-xs text-text-tertiary ml-auto">
                {columnTodos.length}
              </span>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[60px] md:min-h-[120px]">
              {columnTodos.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-xs text-text-tertiary">
                  ドロップしてここに移動
                </div>
              ) : (
                columnTodos.map((todo) => (
                  <TodoBoardCard
                    key={todo.id}
                    todo={todo}
                    onSelect={handleSelect}
                    onDragStart={handleDragStart}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
