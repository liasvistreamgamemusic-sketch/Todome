'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { format, parseISO, addHours, addMinutes, setHours, setMinutes } from 'date-fns';
import {
  X,
  Trash2,
  Copy,
  MapPin,
  Bell,
  Repeat,
  Link2,
  Palette,
  FileText,
} from 'lucide-react';
import type { CalendarEvent } from '@todome/db';
import { useCalendarStore, useTranslation } from '@todome/store';
import { Button } from '@todome/ui';
import { Input } from '@todome/ui';
import { Textarea } from '@todome/ui';
import { Checkbox } from '@todome/ui';
import { createRepeatRule } from '@/lib/rrule-helpers';
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useTodos,
  useNotes,
  useUserId,
  useSharedCalendars,
  useCreateSharedCalendarEvent,
} from '@/hooks/queries';
import type { SharedCalendarEvent } from '@todome/db';
import { Users } from 'lucide-react';
import { DeleteEventDialog } from './delete-event-dialog';

export type CopyableEventData = {
  title: string;
  description: string;
  location: string;
  color: string | null;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
};

type Props = {
  eventId: string | null;
  initialDate?: Date;
  initialFormData?: Partial<FormState>;
  onClose: () => void;
  onCopy?: (data: CopyableEventData) => void;
  embedded?: boolean;
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
  linkedNoteIds: string[];
  includePersonalCalendar: boolean;
  targetSharedCalendarIds: string[];
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

const inferReminder = (startAt: string, remindAt: string | null): string | null => {
  if (!remindAt) return null;
  const diffMs = parseISO(startAt).getTime() - parseISO(remindAt).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin <= 5) return '5m';
  if (diffMin <= 15) return '15m';
  if (diffMin <= 30) return '30m';
  if (diffMin <= 60) return '1h';
  return '1d';
};

/** Round a Date up to the next 15-minute boundary. */
const roundToNext15 = (d: Date): Date => {
  const ms = 15 * 60_000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
};

export const EventDetail = ({ eventId, initialDate, initialFormData, onClose, onCopy, embedded = false }: Props) => {
  const { t } = useTranslation();

  const REMINDER_OPTIONS = useMemo<{ label: string; value: string | null }[]>(() => [
    { label: t('common.none'), value: null },
    { label: t('event.reminder.5m'), value: '5m' },
    { label: t('event.reminder.15m'), value: '15m' },
    { label: t('event.reminder.30m'), value: '30m' },
    { label: t('event.reminder.1h'), value: '1h' },
    { label: t('event.reminder.1d'), value: '1d' },
  ], [t]);

  const REPEAT_OPTIONS = useMemo<{ label: string; value: string }[]>(() => [
    { label: t('common.none'), value: 'none' },
    { label: t('event.repeat.daily'), value: 'daily' },
    { label: t('event.repeat.weekly'), value: 'weekly' },
    { label: t('event.repeat.monthly'), value: 'monthly' },
    { label: t('event.repeat.yearly'), value: 'yearly' },
    { label: t('event.repeat.custom'), value: 'custom' },
  ], [t]);

  const WEEKDAY_LABELS = useMemo(() => [
    t('event.weekday.mon'), t('event.weekday.tue'), t('event.weekday.wed'),
    t('event.weekday.thu'), t('event.weekday.fri'), t('event.weekday.sat'),
    t('event.weekday.sun'),
  ], [t]);

  const { data: events } = useCalendarEvents();
  const { data: todos } = useTodos();
  const { data: notes } = useNotes();
  const createCalendarEvent = useCreateCalendarEvent();
  const updateCalendarEvent = useUpdateCalendarEvent();
  const userId = useUserId();
  const selectEvent = useCalendarStore((s) => s.selectEvent);
  const { data: sharedCalendars = [] } = useSharedCalendars();
  const createSharedCalendarEvent = useCreateSharedCalendarEvent();

  const existingEvent = useMemo(
    () => (eventId ? (events ?? []).find((e) => e.id === eventId) ?? null : null),
    [eventId, events],
  );

  const isEditing = !!existingEvent;

  const defaultStart = (() => {
    if (!initialDate) return roundToNext15(new Date());
    // If initialDate is at midnight (date-only from MonthView/+button), use current time
    if (initialDate.getHours() === 0 && initialDate.getMinutes() === 0) {
      const now = roundToNext15(new Date());
      return setMinutes(setHours(initialDate, now.getHours()), now.getMinutes());
    }
    return initialDate;
  })();
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
        reminder: inferReminder(existingEvent.start_at, existingEvent.remind_at),
        repeat: existingEvent.repeat_rule ? 'custom' : 'none',
        customWeekdays: [false, false, false, false, false, false, false],
        customDayOfMonth: 1,
        repeatEndType: 'never',
        repeatCount: 10,
        repeatUntil: format(addHours(new Date(), 24 * 365), 'yyyy-MM-dd'),
        linkedTodoIds: existingEvent.todo_ids,
        linkedNoteIds: existingEvent.note_ids ?? [],
        includePersonalCalendar: true,
        targetSharedCalendarIds: [],
      };
    }
    return {
      title: initialFormData?.title ?? '',
      startDate: format(defaultStart, 'yyyy-MM-dd'),
      startTime: initialFormData?.startTime ?? format(defaultStart, 'HH:mm'),
      endDate: format(defaultEnd, 'yyyy-MM-dd'),
      endTime: initialFormData?.endTime ?? format(defaultEnd, 'HH:mm'),
      isAllDay: initialFormData?.isAllDay ?? false,
      location: initialFormData?.location ?? '',
      description: initialFormData?.description ?? '',
      color: initialFormData?.color ?? null,
      reminder: '15m',
      repeat: 'none',
      customWeekdays: [false, false, false, false, false, false, false],
      customDayOfMonth: 1,
      repeatEndType: 'never' as RepeatEndType,
      repeatCount: 10,
      repeatUntil: format(addHours(new Date(), 24 * 365), 'yyyy-MM-dd'),
      linkedTodoIds: [],
      linkedNoteIds: [],
      includePersonalCalendar: true,
      targetSharedCalendarIds: [],
    };
  });

  // Sync form when existingEvent becomes available (TanStack Query data may load after mount)
  useEffect(() => {
    if (!existingEvent) return;
    const start = parseISO(existingEvent.start_at);
    const end = parseISO(existingEvent.end_at);
    setForm({
      title: existingEvent.title,
      startDate: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endDate: format(end, 'yyyy-MM-dd'),
      endTime: format(end, 'HH:mm'),
      isAllDay: existingEvent.is_all_day,
      location: existingEvent.location ?? '',
      description: existingEvent.description ?? '',
      color: existingEvent.color,
      reminder: inferReminder(existingEvent.start_at, existingEvent.remind_at),
      repeat: existingEvent.repeat_rule ? 'custom' : 'none',
      customWeekdays: [false, false, false, false, false, false, false],
      customDayOfMonth: 1,
      repeatEndType: 'never',
      repeatCount: 10,
      repeatUntil: format(addHours(new Date(), 24 * 365), 'yyyy-MM-dd'),
      linkedTodoIds: existingEvent.todo_ids,
      linkedNoteIds: existingEvent.note_ids ?? [],
      includePersonalCalendar: true,
      targetSharedCalendarIds: [],
    });
  }, [existingEvent]);

  // Lock body scroll when sidebar is open (prevents background scroll on mobile)
  useEffect(() => {
    if (embedded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embedded]);

  const [showTodoSelector, setShowTodoSelector] = useState(false);
  const [showNoteSelector, setShowNoteSelector] = useState(false);

  const availableTodos = useMemo(
    () => (todos ?? []).filter((t) => !t.is_deleted && t.status !== 'cancelled'),
    [todos],
  );

  const availableNotes = useMemo(
    () => (notes ?? []).filter((n) => !n.is_deleted && !n.is_archived),
    [notes],
  );

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleStartDateChange = useCallback((newStartDate: string) => {
    setForm((prev) => {
      const oldStart = new Date(`${prev.startDate}T${prev.startTime || '00:00'}`);
      const oldEnd = new Date(`${prev.endDate}T${prev.endTime || '00:00'}`);
      const durationMs = oldEnd.getTime() - oldStart.getTime();
      const newStart = new Date(`${newStartDate}T${prev.startTime || '00:00'}`);
      const newEnd = new Date(newStart.getTime() + durationMs);
      return {
        ...prev,
        startDate: newStartDate,
        endDate: format(newEnd, 'yyyy-MM-dd'),
        endTime: format(newEnd, 'HH:mm'),
      };
    });
  }, []);

  const handleStartTimeChange = useCallback((newStartTime: string) => {
    setForm((prev) => {
      const oldStart = new Date(`${prev.startDate}T${prev.startTime || '00:00'}`);
      const oldEnd = new Date(`${prev.endDate}T${prev.endTime || '00:00'}`);
      const durationMs = oldEnd.getTime() - oldStart.getTime();
      const newStart = new Date(`${prev.startDate}T${newStartTime}`);
      const newEnd = new Date(newStart.getTime() + durationMs);
      return {
        ...prev,
        startTime: newStartTime,
        endDate: format(newEnd, 'yyyy-MM-dd'),
        endTime: format(newEnd, 'HH:mm'),
      };
    });
  }, []);

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

  const handleSave = useCallback(() => {
    if (!form.title.trim()) return;

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
      updateCalendarEvent.mutate({
        id: existingEvent.id,
        patch: {
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
          note_ids: form.linkedNoteIds,
          updated_at: now,
        },
      });
    } else {
      // Create on personal calendar if selected
      if (form.includePersonalCalendar) {
        const newEvent: CalendarEvent = {
          id: crypto.randomUUID(),
          user_id: userId ?? '',
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
          note_ids: form.linkedNoteIds,
          is_deleted: false,
          created_at: now,
          updated_at: now,
        };
        createCalendarEvent.mutate(newEvent);
      }
      // Create on each selected shared calendar
      for (const calId of form.targetSharedCalendarIds) {
        const sharedEvent: SharedCalendarEvent = {
          id: crypto.randomUUID(),
          shared_calendar_id: calId,
          created_by: userId ?? '',
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_at: startAt,
          end_at: endAt,
          is_all_day: form.isAllDay,
          location: form.location.trim() || null,
          color: form.color,
          is_deleted: false,
          created_at: now,
          updated_at: now,
        };
        createSharedCalendarEvent.mutate(sharedEvent);
      }
    }

    selectEvent(null);
    onClose();
  }, [
    form,
    isEditing,
    existingEvent,
    userId,
    updateCalendarEvent,
    createCalendarEvent,
    createSharedCalendarEvent,
    selectEvent,
    onClose,
    buildRepeatRule,
  ]);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = useCallback(() => {
    if (existingEvent) {
      setShowDeleteDialog(true);
    }
  }, [existingEvent]);

  const handleDeleteConfirmed = useCallback(() => {
    setShowDeleteDialog(false);
    selectEvent(null);
    onClose();
  }, [selectEvent, onClose]);

  const handleCopy = useCallback(() => {
    if (!onCopy) return;
    onCopy({
      title: form.title,
      description: form.description,
      location: form.location,
      color: form.color,
      isAllDay: form.isAllDay,
      startTime: form.startTime,
      endTime: form.endTime,
    });
  }, [onCopy, form]);

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

  const toggleNote = useCallback(
    (noteId: string) => {
      setForm((prev) => {
        const linked = prev.linkedNoteIds.includes(noteId)
          ? prev.linkedNoteIds.filter((id) => id !== noteId)
          : [...prev.linkedNoteIds, noteId];
        return { ...prev, linkedNoteIds: linked };
      });
    },
    [],
  );

  return (
    <>
      {!embedded && (
        <div className="fixed inset-0 z-40 bg-black/30 touch-none" onClick={onClose} aria-hidden="true" />
      )}
      <div
        className={clsx(
          embedded
            ? 'flex h-full w-full flex-col overflow-hidden bg-bg-primary'
            : 'fixed inset-y-0 right-0 z-50 w-full md:max-w-md flex flex-col overflow-hidden overscroll-contain bg-bg-primary border-l border-[var(--border)] shadow-xl animate-in slide-in-from-right duration-200',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-sm font-semibold text-text-primary">
            {isEditing ? t('event.editTitle') : t('event.newTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary transition"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {/* Title */}
          <Input
            placeholder={t('event.titlePlaceholder')}
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            variant="ghost"
            className="text-lg font-semibold"
            autoFocus
          />

          {/* Calendar selector (new events only, multi-select) */}
          {!isEditing && sharedCalendars.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">
                <Users className="mr-1 inline h-3.5 w-3.5" />
                {t('event.targetCalendar')}
              </label>
              <div className="rounded-lg border border-[var(--border)] p-2 space-y-1">
                <Checkbox
                  label={t('event.personalCalendar')}
                  checked={form.includePersonalCalendar}
                  onChange={(e) => updateField('includePersonalCalendar', e.target.checked)}
                  wrapperClassName="py-0.5"
                />
                {sharedCalendars.map((cal) => (
                  <Checkbox
                    key={cal.id}
                    label={cal.title}
                    checked={form.targetSharedCalendarIds.includes(cal.id)}
                    onChange={() => {
                      const ids = form.targetSharedCalendarIds.includes(cal.id)
                        ? form.targetSharedCalendarIds.filter((id) => id !== cal.id)
                        : [...form.targetSharedCalendarIds, cal.id];
                      updateField('targetSharedCalendarIds', ids);
                    }}
                    wrapperClassName="py-0.5"
                  />
                ))}
              </div>
            </div>
          )}

          {/* All-day toggle */}
          <Checkbox
            label={t('calendar.allDay')}
            checked={form.isAllDay}
            onChange={(e) => updateField('isAllDay', e.target.checked)}
          />

          {/* Date/Time pickers */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('event.startDate')}
              type="date"
              value={form.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
            {!form.isAllDay && (
              <Input
                label={t('event.startTime')}
                type="time"
                value={form.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
              />
            )}
            <Input
              label={t('event.endDate')}
              type="date"
              value={form.endDate}
              onChange={(e) => updateField('endDate', e.target.value)}
            />
            {!form.isAllDay && (
              <Input
                label={t('event.endTime')}
                type="time"
                value={form.endTime}
                onChange={(e) => updateField('endTime', e.target.value)}
              />
            )}
          </div>

          {/* Location */}
          <Input
            label={t('event.location')}
            placeholder={t('event.locationPlaceholder')}
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            leftIcon={<MapPin />}
          />

          {/* Description */}
          <Textarea
            label={t('event.memo')}
            placeholder={t('event.memoPlaceholder')}
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
          />

          {/* Color selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              <Palette className="mr-1 inline h-3.5 w-3.5" />
              {t('event.color')}
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
                  aria-label={`${t('event.color')} ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              <Bell className="mr-1 inline h-3.5 w-3.5" />
              {t('event.reminder')}
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
              {t('event.repeat')}
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
                  <span className="text-xs text-text-secondary">{t('event.repeat.selectDays')}</span>
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
                  <span className="text-xs text-text-secondary">{t('event.repeat.endCondition')}</span>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm text-text-primary">
                      <input
                        type="radio"
                        name="repeatEnd"
                        checked={form.repeatEndType === 'never'}
                        onChange={() => updateField('repeatEndType', 'never')}
                        className="accent-[var(--accent)]"
                      />
                      {t('event.repeat.noEnd')}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-text-primary">
                      <input
                        type="radio"
                        name="repeatEnd"
                        checked={form.repeatEndType === 'count'}
                        onChange={() => updateField('repeatEndType', 'count')}
                        className="accent-[var(--accent)]"
                      />
                      {t('event.repeat.byCount')}
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
                      {t('event.repeat.byDate')}
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
              {t('event.relatedTodos')}
            </label>
            {form.linkedTodoIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {form.linkedTodoIds.map((id) => {
                  const todo = (todos ?? []).find((t) => t.id === id);
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
                        aria-label={t('common.delete')}
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
              {showTodoSelector ? t('common.close') : t('event.selectTodos')}
            </button>
            {showTodoSelector && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] p-2 space-y-1">
                {availableTodos.length === 0 ? (
                  <p className="text-xs text-text-tertiary py-2 text-center">
                    {t('event.noTodos')}
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

          {/* Related Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              <FileText className="mr-1 inline h-3.5 w-3.5" />
              {t('event.relatedNotes')}
            </label>
            {form.linkedNoteIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {form.linkedNoteIds.map((id) => {
                  const note = (notes ?? []).find((n) => n.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary"
                    >
                      {note?.title ?? id}
                      <button
                        type="button"
                        onClick={() => toggleNote(id)}
                        className="hover:text-text-primary transition"
                        aria-label={t('common.delete')}
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
              onClick={() => setShowNoteSelector((prev) => !prev)}
              className={clsx(
                'text-xs text-[var(--accent)] hover:underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              )}
            >
              {showNoteSelector ? t('common.close') : t('event.selectNotes')}
            </button>
            {showNoteSelector && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] p-2 space-y-1">
                {availableNotes.length === 0 ? (
                  <p className="text-xs text-text-tertiary py-2 text-center">
                    {t('event.noNotes')}
                  </p>
                ) : (
                  availableNotes.map((note) => (
                    <Checkbox
                      key={note.id}
                      label={note.title || t('event.untitled')}
                      checked={form.linkedNoteIds.includes(note.id)}
                      onChange={() => toggleNote(note.id)}
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
                {t('common.delete')}
              </Button>
            )}
            {isEditing && onCopy && (
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" />
                {t('event.copy')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!form.title.trim() || (!isEditing && sharedCalendars.length > 0 && !form.includePersonalCalendar && form.targetSharedCalendarIds.length === 0)}
            >
              {isEditing ? t('common.update') : t('common.save')}
            </Button>
          </div>
        </div>
      </div>

      {showDeleteDialog && existingEvent && (
        <DeleteEventDialog
          event={existingEvent}
          onClose={() => setShowDeleteDialog(false)}
          onDeleted={handleDeleteConfirmed}
        />
      )}
    </>
  );
};
