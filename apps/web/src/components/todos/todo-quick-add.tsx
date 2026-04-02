'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { clsx } from 'clsx';
import { Plus, Calendar, ChevronDown, Bell, Tag, FileText } from 'lucide-react';
import { addDays, startOfDay, format } from 'date-fns';
import { parseDateFromTitle } from '@/lib/date-parser';
import type { TodoPriority, TodoStatus } from '@todome/db';
import { useTodoStore } from '@todome/store/src/todo-store';
import { useTranslation } from '@todome/store';
import { useTodos, useCreateTodo, useUserId } from '@/hooks/queries';
import { isSmartListId } from '@/lib/todo-filters';

type DueDateShortcut = {
  label: string;
  getDate: () => string;
};

export const TodoQuickAdd = () => {
  const setFilterStatus = useTodoStore((s) => s.setFilterStatus);
  const selectedListId = useTodoStore((s) => s.selectedListId);
  const { t, locale } = useTranslation();

  const PRIORITY_DOTS: { value: TodoPriority; color: string; label: string }[] = [
    { value: 1, color: 'bg-[#388E3C]', label: t('todos.priority.low') },
    { value: 2, color: 'bg-[#F9A825]', label: t('todos.priority.medium') },
    { value: 3, color: 'bg-[#F57C00]', label: t('todos.priority.high') },
    { value: 4, color: 'bg-[#D32F2F]', label: t('todos.priority.urgent') },
  ];

  const DUE_DATE_SHORTCUTS: DueDateShortcut[] = [
    {
      label: t('todos.today'),
      getDate: () => startOfDay(new Date()).toISOString(),
    },
    {
      label: t('todos.tomorrow'),
      getDate: () => startOfDay(addDays(new Date(), 1)).toISOString(),
    },
    {
      label: t('todos.nextWeek'),
      getDate: () => startOfDay(addDays(new Date(), 7)).toISOString(),
    },
  ];

  const STATUS_OPTIONS: { value: TodoStatus; label: string; color: string }[] = [
    { value: 'pending', label: t('todos.status.notStarted'), color: 'bg-[#90CAF9]' },
    { value: 'in_progress', label: t('todos.status.inProgress'), color: 'bg-[#F57C00]' },
    { value: 'completed', label: t('todos.status.completed'), color: 'bg-[#388E3C]' },
    { value: 'cancelled', label: t('todos.status.cancelled'), color: 'bg-[#9E9E9E]' },
  ];
  const { data: todos } = useTodos();
  const createTodo = useCreateTodo();
  const userId = useUserId();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoPriority>(2);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [status, setStatus] = useState<TodoStatus>('pending');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [detail, setDetail] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const dateHint = useMemo(
    () => parseDateFromTitle(title, locale as 'en' | 'ja'),
    [title, locale],
  );

  const handleSubmit = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !userId) return;

    const now = new Date().toISOString();
    const maxOrder = (todos ?? []).reduce(
      (max, t) => Math.max(max, t.sort_order),
      0,
    );

    const todo = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: trimmedTitle,
      detail: detail.trim() || null,
      priority,
      status,
      due_date: dueDate,
      remind_at: remindAt ? new Date(remindAt).toISOString() : null,
      remind_repeat: 'none' as const,
      note_ids: [],
      tags,
      list_id: selectedListId && !isSmartListId(selectedListId) ? selectedListId : null,
      is_flagged: false,
      subtasks: [],
      sort_order: maxOrder + 1,
      is_deleted: false,
      completed_at: status === 'completed' ? now : null,
      created_at: now,
      updated_at: now,
    };

    createTodo.mutate(todo);
    setFilterStatus('all');

    // Reset all fields
    setTitle('');
    setPriority(2);
    setDueDate(null);
    setShowOptions(false);
    setShowExpanded(false);
    setStatus('pending');
    setTags([]);
    setTagInput('');
    setDetail('');
    setRemindAt('');
    inputRef.current?.focus();
  }, [title, priority, dueDate, status, tags, detail, remindAt, selectedListId, setFilterStatus, todos, createTodo, userId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleFocus = useCallback(() => {
    setShowOptions(true);
  }, []);

  const handleAddTag = useCallback(() => {
    const newTags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    if (newTags.length > 0) {
      setTags((prev) => [...prev, ...newTags]);
    }
    setTagInput('');
  }, [tagInput, tags]);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag],
  );

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const activeDueLabel = dueDate
    ? DUE_DATE_SHORTCUTS.find(
        (s) =>
          startOfDay(new Date(s.getDate())).getTime() ===
          startOfDay(new Date(dueDate)).getTime(),
      )?.label ?? t('todos.hasDueDate')
    : null;

  return (
    <div className="space-y-2">
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-bg-primary border border-[var(--border)]',
          'focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:border-[var(--accent)]',
          'transition-all duration-150',
        )}
      >
        <Plus className="h-4 w-4 text-text-tertiary flex-shrink-0" />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={t('todos.newTodo')}
          className={clsx(
            'flex-1 bg-transparent border-none outline-none',
            'text-sm text-text-primary placeholder:text-text-tertiary',
          )}
        />
        {title.trim() && (
          <button
            type="button"
            onClick={handleSubmit}
            className={clsx(
              'px-3 py-1 rounded-md text-xs font-medium',
              'bg-[var(--accent)] text-white',
              'hover:opacity-90 transition-opacity',
            )}
          >
            {t('todos.add')}
          </button>
        )}
      </div>

      {/* Date suggestion chip */}
      {dateHint.suggestedDate && !dueDate && title.trim() && (
        <div className="flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => {
              setDueDate(dateHint.suggestedDate!.toISOString());
              setTitle(dateHint.cleanTitle);
            }}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs',
              'bg-[var(--accent)]/10 text-[var(--accent)]',
              'hover:bg-[var(--accent)]/20 transition-colors',
            )}
          >
            <Calendar className="h-3 w-3" />
            {t('todos.quickAdd.dateHint', {
              date: format(dateHint.suggestedDate, locale === 'ja' ? 'M月d日' : 'MMM d'),
            })}
          </button>
        </div>
      )}

      {showOptions && (
        <div className="space-y-2">
          {/* Priority + Due date row */}
          <div className="flex items-center gap-3 px-1">
            {/* Priority selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-tertiary">{t('todos.priorityLabel')}</span>
              {PRIORITY_DOTS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  title={p.label}
                  className={clsx(
                    'h-4 w-4 rounded-full transition-all duration-150',
                    p.color,
                    priority === p.value
                      ? 'ring-2 ring-offset-1 ring-[var(--accent)] scale-110'
                      : 'opacity-50 hover:opacity-80',
                  )}
                />
              ))}
            </div>

            {/* Due date shortcuts */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
              {DUE_DATE_SHORTCUTS.map((shortcut) => {
                const isActive =
                  dueDate !== null &&
                  startOfDay(new Date(shortcut.getDate())).getTime() ===
                    startOfDay(new Date(dueDate)).getTime();
                return (
                  <button
                    key={shortcut.label}
                    type="button"
                    onClick={() =>
                      setDueDate(isActive ? null : shortcut.getDate())
                    }
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs transition-all duration-150',
                      isActive
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-primary',
                    )}
                  >
                    {shortcut.label}
                  </button>
                );
              })}
              {activeDueLabel && (
                <button
                  type="button"
                  onClick={() => setDueDate(null)}
                  className="text-xs text-text-tertiary hover:text-[#D32F2F] transition-colors ml-1"
                >
                  x
                </button>
              )}
            </div>

            {/* Expand toggle */}
            <button
              type="button"
              onClick={() => setShowExpanded((prev) => !prev)}
              className={clsx(
                'flex items-center gap-1 px-2 py-0.5 rounded text-xs ml-auto',
                'transition-all duration-150',
                showExpanded
                  ? 'text-[var(--accent)]'
                  : 'text-text-tertiary hover:text-text-secondary',
              )}
            >
              {t('todos.advancedSettings')}
              <ChevronDown
                className={clsx(
                  'h-3 w-3 transition-transform duration-150',
                  showExpanded && 'rotate-180',
                )}
              />
            </button>
          </div>

          {/* Expanded fields */}
          {showExpanded && (
            <div className="space-y-3 px-1 pt-1 pb-1 border-t border-[var(--border)]">
              {/* Status selector */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <FileText className="h-3 w-3" />
                  {t('todos.status')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={clsx(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        'transition-all duration-150',
                        status === opt.value
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary',
                      )}
                    >
                      <span className={clsx('h-2 w-2 rounded-full', opt.color)} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags input */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <Tag className="h-3 w-3" />
                  {t('todos.tag')}
                </label>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-bg-secondary text-text-secondary"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-text-tertiary hover:text-[#D32F2F] transition-colors"
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={t('todos.tagsCsvPlaceholder')}
                    className={clsx(
                      'flex-1 h-7 px-2 rounded-md text-xs text-text-primary',
                      'bg-transparent border border-[var(--border)]',
                      'placeholder:text-text-tertiary',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                    )}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    className={clsx(
                      'px-2 py-1 rounded-md text-xs font-medium',
                      'transition-opacity',
                      tagInput.trim()
                        ? 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                        : 'bg-bg-secondary text-text-tertiary opacity-50 cursor-not-allowed',
                    )}
                  >
                    {t('todos.add')}
                  </button>
                </div>
              </div>

              {/* Memo textarea */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  {t('todos.memo')}
                </label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder={t('todos.detailPlaceholder')}
                  rows={2}
                  className={clsx(
                    'w-full px-2 py-1.5 rounded-md text-xs text-text-primary',
                    'bg-transparent border border-[var(--border)]',
                    'placeholder:text-text-tertiary resize-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                  )}
                />
              </div>

              {/* Reminder datetime-local */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <Bell className="h-3 w-3" />
                  {t('todos.reminder')}
                </label>
                <input
                  type="datetime-local"
                  value={remindAt}
                  onChange={(e) => setRemindAt(e.target.value)}
                  className={clsx(
                    'w-full h-7 px-2 rounded-md text-xs text-text-primary',
                    'bg-bg-primary border border-[var(--border)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                  )}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
