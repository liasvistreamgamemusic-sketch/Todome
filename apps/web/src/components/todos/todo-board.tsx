'use client';

import React, { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useTodoStore } from '@todome/store/src/todo-store';
import { useTodos, useUpdateTodo } from '@/hooks/queries';
import type { Todo, TodoStatus } from '@todome/db';
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

const DroppableColumn = ({
  status,
  label,
  todos,
  isOver,
  children,
}: {
  status: TodoStatus;
  label: string;
  todos: Todo[];
  isOver: boolean;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}) => {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex flex-col w-full md:flex-shrink-0 md:w-72 rounded-lg',
        'glass-sm border',
        isOver && 'ring-2 ring-[var(--accent)] border-[var(--accent)]',
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)]">
        <span className={clsx('h-2.5 w-2.5 rounded-full', STATUS_HEADER_COLORS[status])} />
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-xs text-text-tertiary ml-auto">{todos.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[60px] md:min-h-[120px]">
        {children}
      </div>
    </div>
  );
};

export const TodoBoard = () => {
  const { data: allTodos = [] } = useTodos();
  const updateTodoMutation = useUpdateTodo();
  const selectTodo = useTodoStore((s) => s.selectTodo);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TodoStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const todos = allTodos.filter((t: Todo) => !t.is_deleted);

  const todosByStatus = COLUMNS.reduce<Record<TodoStatus, Todo[]>>(
    (acc, col) => {
      acc[col.status] = todos.filter((t: Todo) => t.status === col.status);
      return acc;
    },
    { pending: [], in_progress: [], completed: [], cancelled: [] },
  );

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) ?? null : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: any) => {
    const overId = event.over?.id as TodoStatus | undefined;
    if (overId && COLUMNS.some((c) => c.status === overId)) {
      setOverColumn(overId);
    } else {
      setOverColumn(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverColumn(null);

      if (!over) return;

      const todoId = active.id as string;
      const targetStatus = over.id as TodoStatus;

      if (!COLUMNS.some((c) => c.status === targetStatus)) return;

      const todo = todos.find((t) => t.id === todoId);
      if (!todo || todo.status === targetStatus) return;

      const now = new Date().toISOString();
      updateTodoMutation.mutate({
        id: todoId,
        patch: {
          status: targetStatus,
          completed_at: targetStatus === 'completed' ? now : null,
          updated_at: now,
        },
      });
    },
    [todos, updateTodoMutation],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverColumn(null);
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      selectTodo(id);
    },
    [selectTodo],
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col gap-3 md:flex-row md:gap-4 md:overflow-x-auto pb-4 h-full">
        {COLUMNS.map((col) => {
          const columnTodos = todosByStatus[col.status];
          return (
            <DroppableColumn
              key={col.status}
              status={col.status}
              label={col.label}
              todos={columnTodos}
              isOver={overColumn === col.status}
              onSelect={handleSelect}
            >
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
                  />
                ))
              )}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeTodo && (
          <div className="opacity-80">
            <TodoBoardCard todo={activeTodo} onSelect={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
