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
  Star,
  List,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@todome/ui/src/button';
import { Badge } from '@todome/ui/src/badge';
import { Textarea } from '@todome/ui/src/textarea';
import type {
  Todo,
  TodoStatus,
  TodoPriority,
  RemindRepeat,
  Subtask,
} from '@todome/db';
import { useTodoStore } from '@todome/store/src/todo-store';
import { useTranslation } from '@todome/store';
import { useTodos, useTodoLists, useUpdateTodo, useDeleteTodo, useUserId } from '@/hooks/queries';
import { AttachmentPanel } from '@/components/attachments';
import { useIsMobile } from '@todome/hooks';
import { TodoSubtasks } from './todo-subtasks';

export const TodoDetail = () => {
  const { t } = useTranslation();

  const STATUS_OPTIONS: { value: TodoStatus; label: string; color: string }[] = [
    { value: 'pending', label: t('todos.status.notStarted'), color: 'bg-[#90CAF9]' },
    { value: 'in_progress', label: t('todos.status.inProgress'), color: 'bg-[#F57C00]' },
    { value: 'completed', label: t('todos.status.completed'), color: 'bg-[#388E3C]' },
    { value: 'cancelled', label: t('todos.status.cancelled'), color: 'bg-[#9E9E9E]' },
  ];

  const PRIORITY_OPTIONS: { value: TodoPriority; label: string; color: string }[] = [
    { value: 1, label: t('todos.priority.low'), color: 'bg-[#388E3C]' },
    { value: 2, label: t('todos.priority.medium'), color: 'bg-[#F9A825]' },
    { value: 3, label: t('todos.priority.high'), color: 'bg-[#F57C00]' },
    { value: 4, label: t('todos.priority.urgent'), color: 'bg-[#D32F2F]' },
  ];

  const REPEAT_OPTIONS: { value: RemindRepeat; label: string }[] = [
    { value: 'none', label: t('common.none') },
    { value: 'daily', label: t('todos.repeat.daily') },
    { value: 'weekly', label: t('todos.repeat.weekly') },
    { value: 'monthly', label: t('todos.repeat.monthly') },
    { value: 'yearly', label: t('todos.repeat.yearly') },
  ];
  const selectedTodoId = useTodoStore((s) => s.selectedTodoId);
  const selectTodo = useTodoStore((s) => s.selectTodo);

  const { data: todos } = useTodos();
  const { data: todoLists } = useTodoLists();
  const updateTodo = useUpdateTodo();
  const deleteTodoMutation = useDeleteTodo();

  const userId = useUserId();
  const isMobile = useIsMobile();

  const todo = useMemo(
    () => (todos ?? []).find((t) => t.id === selectedTodoId) ?? null,
    [todos, selectedTodoId],
  );

  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [remindRepeat, setRemindRepeat] = useState<RemindRepeat>('none');
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
      setSubtasks(todo.subtasks ?? []);
    }
  }, [todo]);

  const handleClose = useCallback(() => {
    selectTodo(null);
  }, [selectTodo]);

  const handleUpdate = useCallback(
    (patch: Partial<Todo>) => {
      if (!todo) return;
      const fullPatch = { ...patch, updated_at: new Date().toISOString() };
      updateTodo.mutate({ id: todo.id, patch: fullPatch });
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
      const value = e.target.value as RemindRepeat;
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
    deleteTodoMutation.mutate(todo.id);
    selectTodo(null);
  }, [todo, deleteTodoMutation, selectTodo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose],
  );

  const handleSubtasksChange = useCallback((newSubtasks: Subtask[]) => {
    setSubtasks(newSubtasks);
    handleUpdate({
      subtasks: newSubtasks.map((s, i) => ({ ...s, sort_order: i })),
    });
  }, [handleUpdate]);

  if (!todo) return null;

  return (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}
    <div
      className={clsx(
        'fixed inset-y-0 right-0 z-50 w-full md:max-w-md',
        'bg-bg-primary border-l border-[var(--border)]',
        'shadow-xl overflow-y-auto',
        'animate-in slide-in-from-right duration-200',
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-bg-primary border-b border-[var(--border)]">
        <span className="text-sm font-medium text-text-secondary">
          {t('todos.detail')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleUpdate({ is_flagged: !todo.is_flagged })}
            className="p-2 md:p-1.5 rounded-md hover:bg-bg-secondary transition-colors"
            aria-label={t('todos.flag')}
          >
            <Star
              className={clsx(
                'h-4 w-4',
                todo.is_flagged ? 'text-[#F9A825]' : 'text-text-tertiary',
              )}
              {...(todo.is_flagged ? { fill: 'currentColor' } : {})}
            />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 md:p-1.5 rounded-md hover:bg-bg-secondary text-text-tertiary hover:text-text-primary transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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
          placeholder={t('todos.titlePlaceholder')}
        />

        {/* Status */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <FileText className="h-4 w-4" />
            {t('todos.status')}
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
            {t('todos.priority')}
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

        {/* List */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <List className="h-4 w-4" />
            {t('todos.lists')}
          </label>
          <select
            value={todo.list_id ?? ''}
            onChange={(e) => handleUpdate({ list_id: e.target.value || null })}
            className={clsx(
              'w-full h-9 px-3 rounded-lg text-sm text-text-primary',
              'bg-bg-primary border border-[var(--border)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            )}
          >
            <option value="">{t('todos.noList')}</option>
            {(todoLists ?? []).map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Calendar className="h-4 w-4" />
            {t('todos.dueDate')}
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
            {t('todos.reminder')}
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
            <span className="text-xs text-text-tertiary">{t('todos.repeatLabel')}</span>
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
            {t('todos.memo')}
          </label>
          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            onBlur={handleDetailBlur}
            placeholder={t('todos.detailPlaceholder')}
            className="min-h-[80px]"
          />
        </div>

        {/* Subtasks */}
        <TodoSubtasks subtasks={subtasks} onChange={handleSubtasksChange} />

        {/* Attachments */}
        {userId && todo && (
          <AttachmentPanel
            parentType="todo"
            parentId={todo.id}
            userId={userId}
          />
        )}

        {/* Tags */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Tag className="h-4 w-4" />
            {t('todos.tag')}
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
              placeholder={t('todos.addTag')}
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
              {t('todos.add')}
            </Button>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-1 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <Clock className="h-3 w-3" />
            {t('todos.created')} {format(new Date(todo.created_at), 'yyyy/MM/dd HH:mm')}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <Clock className="h-3 w-3" />
            {t('todos.updated')} {format(new Date(todo.updated_at), 'yyyy/MM/dd HH:mm')}
          </div>
          {todo.completed_at && (
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Clock className="h-3 w-3" />
              {t('todos.completedAt')}{' '}
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
            {t('todos.deleteTodo')}
          </Button>
        </div>
      </div>
    </div>
    </>
  );
};
