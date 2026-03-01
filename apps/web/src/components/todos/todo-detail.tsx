'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  X,
  Trash2,
  Calendar,
  Bell,
  Tag,
  FileText,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@todome/ui/src/button';
import { Badge } from '@todome/ui/src/badge';
import { Textarea } from '@todome/ui/src/textarea';
import { useTodoStore } from '@todome/store/src/todo-store';
import type {
  Todo,
  TodoStatus,
  TodoPriority,
  TodoRemindRepeat,
} from '@todome/store/src/types';
import {
  updateTodo as persistTodo,
  deleteTodo as persistDeleteTodo,
} from '@todome/db';
import { useIsMobile } from '@todome/hooks';
import { TodoSubtasks, type Subtask } from './todo-subtasks';

const STATUS_OPTIONS: { value: TodoStatus; label: string; color: string }[] = [
  { value: 'pending', label: '未着手', color: 'bg-[#90CAF9]' },
  { value: 'in_progress', label: '進行中', color: 'bg-[#F57C00]' },
  { value: 'completed', label: '完了', color: 'bg-[#388E3C]' },
  { value: 'cancelled', label: 'キャンセル', color: 'bg-[#9E9E9E]' },
];

const PRIORITY_OPTIONS: {
  value: TodoPriority;
  label: string;
  color: string;
}[] = [
  { value: 1, label: '低', color: 'bg-[#388E3C]' },
  { value: 2, label: '中', color: 'bg-[#F9A825]' },
  { value: 3, label: '高', color: 'bg-[#F57C00]' },
  { value: 4, label: '緊急', color: 'bg-[#D32F2F]' },
];

const REPEAT_OPTIONS: { value: TodoRemindRepeat; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'daily', label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'monthly', label: '毎月' },
  { value: 'yearly', label: '毎年' },
];

export const TodoDetail = () => {
  const selectedTodoId = useTodoStore((s) => s.selectedTodoId);
  const todos = useTodoStore((s) => s.todos);
  const updateTodo = useTodoStore((s) => s.updateTodo);
  const deleteTodo = useTodoStore((s) => s.deleteTodo);
  const selectTodo = useTodoStore((s) => s.selectTodo);

  const isMobile = useIsMobile();

  const todo = useMemo(
    () => todos.find((t) => t.id === selectedTodoId) ?? null,
    [todos, selectedTodoId],
  );

  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [remindRepeat, setRemindRepeat] = useState<TodoRemindRepeat>('none');
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDetail(todo.detail ?? '');
      setDueDate(
        todo.due_date ? format(new Date(todo.due_date), 'yyyy-MM-dd') : '',
      );
      setRemindAt(
        todo.remind_at
          ? format(new Date(todo.remind_at), "yyyy-MM-dd'T'HH:mm")
          : '',
      );
      setRemindRepeat(todo.remind_repeat ?? 'none');
      setTagInput('');
      setSubtasks([]);
    }
  }, [todo]);

  const handleClose = useCallback(() => {
    selectTodo(null);
  }, [selectTodo]);

  const handleUpdate = useCallback(
    (patch: Partial<Todo>) => {
      if (!todo) return;
      const fullPatch = { ...patch, updated_at: new Date().toISOString() };
      updateTodo(todo.id, fullPatch);
      persistTodo(todo.id, fullPatch, todo).catch(console.error);
    },
    [todo, updateTodo],
  );

  const handleTitleBlur = useCallback(() => {
    if (!todo || title === todo.title) return;
    if (!title.trim()) {
      setTitle(todo.title);
      return;
    }
    handleUpdate({ title: title.trim() });
  }, [todo, title, handleUpdate]);

  const handleDetailBlur = useCallback(() => {
    if (!todo) return;
    const newDetail = detail.trim() || null;
    if (newDetail === todo.detail) return;
    handleUpdate({ detail: newDetail });
  }, [todo, detail, handleUpdate]);

  const handleStatusChange = useCallback(
    (status: TodoStatus) => {
      const now = new Date().toISOString();
      handleUpdate({
        status,
        completed_at: status === 'completed' ? now : null,
      });
    },
    [handleUpdate],
  );

  const handlePriorityChange = useCallback(
    (priority: TodoPriority) => {
      handleUpdate({ priority });
    },
    [handleUpdate],
  );

  const handleDueDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setDueDate(value);
      handleUpdate({
        due_date: value ? new Date(value).toISOString() : null,
      });
    },
    [handleUpdate],
  );

  const handleRemindAtChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setRemindAt(value);
      handleUpdate({
        remind_at: value ? new Date(value).toISOString() : null,
      });
    },
    [handleUpdate],
  );

  const handleRemindRepeatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as TodoRemindRepeat;
      setRemindRepeat(value);
      handleUpdate({ remind_repeat: value });
    },
    [handleUpdate],
  );

  const handleAddTag = useCallback(() => {
    if (!todo) return;
    const tag = tagInput.trim();
    if (!tag || todo.tags.includes(tag)) {
      setTagInput('');
      return;
    }
    handleUpdate({ tags: [...todo.tags, tag] });
    setTagInput('');
  }, [todo, tagInput, handleUpdate]);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      if (!todo) return;
      handleUpdate({ tags: todo.tags.filter((t) => t !== tag) });
    },
    [todo, handleUpdate],
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag],
  );

  const handleDelete = useCallback(() => {
    if (!todo) return;
    persistDeleteTodo(todo.id, todo).catch(console.error);
    deleteTodo(todo.id);
    selectTodo(null);
  }, [todo, deleteTodo, selectTodo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose],
  );

  if (!todo) return null;

  return (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/30"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}
    <div
      className={clsx(
        'fixed inset-y-0 right-0 z-40 w-full md:max-w-md',
        'bg-bg-primary border-l border-[var(--border)]',
        'shadow-xl overflow-y-auto',
        'animate-in slide-in-from-right duration-200',
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-bg-primary border-b border-[var(--border)]">
        <span className="text-sm font-medium text-text-secondary">
          Todo詳細
        </span>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 md:p-1.5 rounded-md hover:bg-bg-secondary text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className={clsx(
            'w-full text-lg font-semibold text-text-primary',
            'bg-transparent border-none outline-none',
            'placeholder:text-text-tertiary',
          )}
          placeholder="タイトル"
        />

        {/* Status */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <FileText className="h-4 w-4" />
            ステータス
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStatusChange(opt.value)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-full text-xs font-medium',
                  'transition-all duration-150',
                  todo.status === opt.value
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary',
                )}
              >
                <span
                  className={clsx('h-2 w-2 rounded-full', opt.color)}
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            優先度
          </label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handlePriorityChange(opt.value)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-full text-xs font-medium',
                  'transition-all duration-150',
                  todo.priority === opt.value
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary',
                )}
              >
                <span
                  className={clsx('h-2 w-2 rounded-full', opt.color)}
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Calendar className="h-4 w-4" />
            期限日
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={handleDueDateChange}
            className={clsx(
              'w-full h-9 px-3 rounded-lg text-sm text-text-primary',
              'bg-bg-primary border border-[var(--border)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            )}
          />
        </div>

        {/* Reminder */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Bell className="h-4 w-4" />
            リマインダー
          </label>
          <input
            type="datetime-local"
            value={remindAt}
            onChange={handleRemindAtChange}
            className={clsx(
              'w-full h-9 px-3 rounded-lg text-sm text-text-primary',
              'bg-bg-primary border border-[var(--border)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            )}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">繰り返し:</span>
            <select
              value={remindRepeat}
              onChange={handleRemindRepeatChange}
              className={clsx(
                'h-8 px-2 rounded-md text-xs text-text-primary',
                'bg-bg-primary border border-[var(--border)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              )}
            >
              {REPEAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Detail / Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">
            メモ
          </label>
          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            onBlur={handleDetailBlur}
            placeholder="詳細を入力..."
            className="min-h-[80px]"
          />
        </div>

        {/* Subtasks */}
        <TodoSubtasks subtasks={subtasks} onChange={setSubtasks} />

        {/* Tags */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Tag className="h-4 w-4" />
            タグ
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {todo.tags.map((tag) => (
              <Badge
                key={tag}
                size="sm"
                variant="primary"
                onRemove={() => handleRemoveTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="タグを追加..."
              className={clsx(
                'flex-1 h-8 px-3 rounded-lg text-sm text-text-primary',
                'bg-transparent border border-[var(--border)]',
                'placeholder:text-text-tertiary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              )}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
            >
              追加
            </Button>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-1 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <Clock className="h-3 w-3" />
            作成: {format(new Date(todo.created_at), 'yyyy/MM/dd HH:mm')}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <Clock className="h-3 w-3" />
            更新: {format(new Date(todo.updated_at), 'yyyy/MM/dd HH:mm')}
          </div>
          {todo.completed_at && (
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Clock className="h-3 w-3" />
              完了:{' '}
              {format(new Date(todo.completed_at), 'yyyy/MM/dd HH:mm')}
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="pt-4 border-t border-[var(--border)]">
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            className="w-full"
          >
            <Trash2 className="h-4 w-4" />
            このTodoを削除
          </Button>
        </div>
      </div>
    </div>
    </>
  );
};
