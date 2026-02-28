'use client';

import { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { format, parseISO, addHours, addMinutes } from 'date-fns';
import {
  X,
  Trash2,
  MapPin,
  Bell,
  Repeat,
  Link2,
  Palette,
} from 'lucide-react';
import { createCalendarEvent, updateCalendarEvent as persistUpdateEvent, deleteCalendarEvent as persistDeleteEvent, supabase } from '@todome/db';
import { useCalendarStore, useTodoStore } from '@todome/store';
import type { CalendarEvent } from '@todome/store';
import { Button } from '@todome/ui';
import { Input } from '@todome/ui';
import { Textarea } from '@todome/ui';
import { Checkbox } from '@todome/ui';
import { createRepeatRule } from '@/lib/rrule-helpers';

type Props = {
  eventId: string | null;
  initialDate?: Date;
  onClose: () => void;
};

const PRESET_COLORS = [
  '#4285F4',
  '#EA4335',
  '#FBBC04',
  '#34A853',
  '#FF6D01',
  '#46BDC6',
  '#7986CB',
  '#E67C73',
];

const REMINDER_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'なし', value: null },
  { label: '5分前', value: '5m' },
  { label: '15分前', value: '15m' },
  { label: '30分前', value: '30m' },
  { label: '1時間前', value: '1h' },
  { label: '1日前', value: '1d' },
];

const REPEAT_OPTIONS: { label: string; value: string }[] = [
  { label: 'なし', value: 'none' },
  { label: '毎日', value: 'daily' },
  { label: '毎週', value: 'weekly' },
  { label: '毎月', value: 'monthly' },
  { label: '毎年', value: 'yearly' },
  { label: 'カスタム', value: 'custom' },
];

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

type RepeatEndType = 'never' | 'count' | 'until';

type FormState = {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  description: string;
  color: string | null;
  reminder: string | null;
  repeat: string;
  customWeekdays: boolean[];
  customDayOfMonth: number;
  repeatEndType: RepeatEndType;
  repeatCount: number;
  repeatUntil: string;
  linkedTodoIds: string[];
};

const computeRemindAt = (
  startAt: string,
  reminder: string | null,
): string | null => {
  if (!reminder) return null;
  const start = parseISO(startAt);
  switch (reminder) {
    case '5m': return addMinutes(start, -5).toISOString();
    case '15m': return addMinutes(start, -15).toISOString();
    case '30m': return addMinutes(start, -30).toISOString();
    case '1h': return addHours(start, -1).toISOString();
    case '1d': return addHours(start, -24).toISOString();
    default: return null;
  }
};

export const EventDetail = ({ eventId, initialDate, onClose }: Props) => {
  const events = useCalendarStore((s) => s.events);
  const addEvent = useCalendarStore((s) => s.addEvent);
  const updateEvent = useCalendarStore((s) => s.updateEvent);
  const deleteEvent = useCalendarStore((s) => s.deleteEvent);
  const selectEvent = useCalendarStore((s) => s.selectEvent);
  const todos = useTodoStore((s) => s.todos);

  const existingEvent = useMemo(
    () => (eventId ? events.find((e) => e.id === eventId) ?? null : null),
    [eventId, events],
  );

  const isEditing = !!existingEvent;

  const defaultStart = initialDate ?? new Date();
  const defaultEnd = addHours(defaultStart, 1);

  const [form, setForm] = useState<FormState>(() => {
    if (existingEvent) {
      const start = parseISO(existingEvent.start_at);
      const end = parseISO(existingEvent.end_at);
      return {
        title: existingEvent.title,
        startDate: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endDate: format(end, 'yyyy-MM-dd'),
        endTime: format(end, 'HH:mm'),
        isAllDay: existingEvent.is_all_day,
        location: existingEvent.location ?? '',
        description: existingEvent.description ?? '',
        color: existingEvent.color,
        reminder: null,
        repeat: existingEvent.repeat_rule ? 'custom' : 'none',
        customWeekdays: [false, false, false, false, false, false, false],
        customDayOfMonth: 1,
        repeatEndType: 'never',
        repeatCount: 10,
        repeatUntil: format(addHours(new Date(), 24 * 365), 'yyyy-MM-dd'),
        linkedTodoIds: existingEvent.todo_ids,
      };
    }
    return {
      title: '',
      startDate: format(defaultStart, 'yyyy-MM-dd'),
      startTime: format(defaultStart, 'HH:mm'),
      endDate: format(defaultEnd, 'yyyy-MM-dd'),
      endTime: format(defaultEnd, 'HH:mm'),
      isAllDay: false,
      location: '',
      description: '',
      color: null,
      reminder: null,
      repeat: 'none',
      customWeekdays: [false, false, false, false, false, false, false],
      customDayOfMonth: 1,
      repeatEndType: 'never',
      repeatCount: 10,
      repeatUntil: format(addHours(new Date(), 24 * 365), 'yyyy-MM-dd'),
      linkedTodoIds: [],
    };
  });

  const [showTodoSelector, setShowTodoSelector] = useState(false);

  const availableTodos = useMemo(
    () => todos.filter((t) => !t.is_deleted && t.status !== 'cancelled'),
    [todos],
  );

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const buildRepeatRule = useCallback((): string | null => {
    if (form.repeat === 'none') return null;

    const freq = form.repeat === 'custom' ? 'weekly' : form.repeat;
    if (freq !== 'daily' && freq !== 'weekly' && freq !== 'monthly' && freq !== 'yearly') {
      return null;
    }

    const options: Parameters<typeof createRepeatRule>[0] = { freq };

    if (form.repeat === 'custom') {
      const selectedDays = form.customWeekdays
        .map((checked, i) => (checked ? i : -1))
        .filter((i) => i >= 0);
      if (selectedDays.length > 0) {
        options.byDay = selectedDays;
      }
    }

    if (form.repeatEndType === 'count') {
      options.count = form.repeatCount;
    } else if (form.repeatEndType === 'until') {
      options.until = parseISO(form.repeatUntil);
    }

    return createRepeatRule(options);
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();

    const startAt = form.isAllDay
      ? new Date(`${form.startDate}T00:00:00`).toISOString()
      : new Date(`${form.startDate}T${form.startTime}`).toISOString();
    const endAt = form.isAllDay
      ? new Date(`${form.endDate}T23:59:59.999`).toISOString()
      : new Date(`${form.endDate}T${form.endTime}`).toISOString();

    const repeatRule = buildRepeatRule();
    const remindAt = computeRemindAt(startAt, form.reminder);
    const now = new Date().toISOString();

    if (isEditing && existingEvent) {
      const patch = {
        title: form.title.trim(),
        start_at: startAt,
        end_at: endAt,
        is_all_day: form.isAllDay,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        color: form.color,
        remind_at: remindAt,
        repeat_rule: repeatRule,
        todo_ids: form.linkedTodoIds,
        updated_at: now,
      };
      updateEvent(existingEvent.id, patch);
      persistUpdateEvent(existingEvent.id, patch, existingEvent).catch(console.error);
    } else {
      const newEvent: CalendarEvent = {
        id: crypto.randomUUID(),
        user_id: user?.id ?? '',
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_at: startAt,
        end_at: endAt,
        is_all_day: form.isAllDay,
        location: form.location.trim() || null,
        color: form.color,
        diary_content: null,
        remind_at: remindAt,
        repeat_rule: repeatRule,
        repeat_parent_id: null,
        todo_ids: form.linkedTodoIds,
        is_deleted: false,
        created_at: now,
        updated_at: now,
      };
      addEvent(newEvent);
      createCalendarEvent(newEvent).catch(console.error);
    }

    selectEvent(null);
    onClose();
  }, [
    form,
    isEditing,
    existingEvent,
    addEvent,
    updateEvent,
    selectEvent,
    onClose,
    buildRepeatRule,
  ]);

  const handleDelete = useCallback(() => {
    if (existingEvent) {
      persistDeleteEvent(existingEvent.id, existingEvent).catch(console.error);
      deleteEvent(existingEvent.id);
      selectEvent(null);
      onClose();
    }
  }, [existingEvent, deleteEvent, selectEvent, onClose]);

  const toggleTodo = useCallback(
    (todoId: string) => {
      setForm((prev) => {
        const linked = prev.linkedTodoIds.includes(todoId)
          ? prev.linkedTodoIds.filter((id) => id !== todoId)
          : [...prev.linkedTodoIds, todoId];
        return { ...prev, linkedTodoIds: linked };
      });
    },
    [],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className={clsx(
          'relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl',
          'bg-bg-primary shadow-xl border border-[var(--border)]',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-sm font-semibold text-text-primary">
            {isEditing ? '予定を編集' : '新規予定'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary transition"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <Input
            placeholder="タイトルを入力"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            variant="ghost"
            className="text-lg font-semibold"
            autoFocus
          />

          {/* All-day toggle */}
          <Checkbox
            label="終日"
            checked={form.isAllDay}
            onChange={(e) => updateField('isAllDay', e.target.checked)}
          />

          {/* Date/Time pickers */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="開始日"
              type="date"
              value={form.startDate}
              onChange={(e) => updateField('startDate', e.target.value)}
            />
            {!form.isAllDay && (
              <Input
                label="開始時刻"
                type="time"
                value={form.startTime}
                onChange={(e) => updateField('startTime', e.target.value)}
              />
            )}
            <Input
              label="終了日"
              type="date"
              value={form.endDate}
              onChange={(e) => updateField('endDate', e.target.value)}
            />
            {!form.isAllDay && (
              <Input
                label="終了時刻"
                type="time"
                value={form.endTime}
                onChange={(e) => updateField('endTime', e.target.value)}
              />
            )}
          </div>

          {/* Location */}
          <Input
            label="場所"
            placeholder="場所を入力"
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            leftIcon={<MapPin />}
          />

          {/* Description */}
          <Textarea
            label="メモ"
            placeholder="メモを入力"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
          />

          {/* Color selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              <Palette className="mr-1 inline h-3.5 w-3.5" />
              カラー
            </label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateField('color', form.color === c ? null : c)}
                  className={clsx(
                    'h-7 w-7 rounded-full border-2 transition-all',
                    form.color === c
                      ? 'border-text-primary scale-110'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`色 ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              <Bell className="mr-1 inline h-3.5 w-3.5" />
              リマインダー
            </label>
            <select
              value={form.reminder ?? ''}
              onChange={(e) =>
                updateField('reminder', e.target.value || null)
              }
              className={clsx(
                'h-9 w-full rounded-lg px-3 text-sm text-text-primary',
                'bg-bg-primary border border-[var(--border)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              )}
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Repeat */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">
              <Repeat className="mr-1 inline h-3.5 w-3.5" />
              繰り返し
            </label>
            <select
              value={form.repeat}
              onChange={(e) => updateField('repeat', e.target.value)}
              className={clsx(
                'h-9 w-full rounded-lg px-3 text-sm text-text-primary',
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

            {/* Custom repeat options */}
            {form.repeat === 'custom' && (
              <div className="ml-1 space-y-3 rounded-lg border border-[var(--border)] p-3">
                {/* Weekday checkboxes */}
                <div className="space-y-1.5">
                  <span className="text-xs text-text-secondary">曜日を選択</span>
                  <div className="flex gap-2">
                    {WEEKDAY_LABELS.map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          const next = [...form.customWeekdays];
                          next[i] = !next[i];
                          updateField('customWeekdays', next);
                        }}
                        className={clsx(
                          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                          form.customWeekdays[i]
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Repeat end */}
                <div className="space-y-2">
                  <span className="text-xs text-text-secondary">終了条件</span>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm text-text-primary">
                      <input
                        type="radio"
                        name="repeatEnd"
                        checked={form.repeatEndType === 'never'}
                        onChange={() => updateField('repeatEndType', 'never')}
                        className="accent-[var(--accent)]"
                      />
                      無期限
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-primary">
                      <input
                        type="radio"
                        name="repeatEnd"
                        checked={form.repeatEndType === 'count'}
                        onChange={() => updateField('repeatEndType', 'count')}
                        className="accent-[var(--accent)]"
                      />
                      回数指定
                      {form.repeatEndType === 'count' && (
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={form.repeatCount}
                          onChange={(e) =>
                            updateField('repeatCount', Number(e.target.value))
                          }
                          className={clsx(
                            'ml-1 h-7 w-16 rounded border border-[var(--border)] px-2 text-xs text-text-primary',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                          )}
                        />
                      )}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-primary">
                      <input
                        type="radio"
                        name="repeatEnd"
                        checked={form.repeatEndType === 'until'}
                        onChange={() => updateField('repeatEndType', 'until')}
                        className="accent-[var(--accent)]"
                      />
                      終了日
                      {form.repeatEndType === 'until' && (
                        <input
                          type="date"
                          value={form.repeatUntil}
                          onChange={(e) =>
                            updateField('repeatUntil', e.target.value)
                          }
                          className={clsx(
                            'ml-1 h-7 rounded border border-[var(--border)] px-2 text-xs text-text-primary',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                          )}
                        />
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Related Todos */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              <Link2 className="mr-1 inline h-3.5 w-3.5" />
              関連Todo
            </label>
            {form.linkedTodoIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {form.linkedTodoIds.map((id) => {
                  const todo = todos.find((t) => t.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary"
                    >
                      {todo?.title ?? id}
                      <button
                        type="button"
                        onClick={() => toggleTodo(id)}
                        className="hover:text-text-primary transition"
                        aria-label="削除"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowTodoSelector((prev) => !prev)}
              className={clsx(
                'text-xs text-[var(--accent)] hover:underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              )}
            >
              {showTodoSelector ? '閉じる' : 'Todoを選択'}
            </button>
            {showTodoSelector && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] p-2 space-y-1">
                {availableTodos.length === 0 ? (
                  <p className="text-xs text-text-tertiary py-2 text-center">
                    Todoがありません
                  </p>
                ) : (
                  availableTodos.map((todo) => (
                    <Checkbox
                      key={todo.id}
                      label={todo.title}
                      checked={form.linkedTodoIds.includes(todo.id)}
                      onChange={() => toggleTodo(todo.id)}
                      wrapperClassName="py-0.5"
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
          <div>
            {isEditing && (
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                削除
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!form.title.trim()}
            >
              {isEditing ? '更新' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
