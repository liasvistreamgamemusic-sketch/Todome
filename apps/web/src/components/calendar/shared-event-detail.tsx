'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { format, parseISO, addHours, addMinutes } from 'date-fns';
import {
  X,
  Trash2,
  Copy,
  MapPin,
  Clock,
  FileText,
  Users,
  Palette,
} from 'lucide-react';
import type { SharedCalendarEvent, SharedCalendar } from '@todome/db';
import type { CopyableEventData } from './event-detail';
import { Button } from '@todome/ui';
import { Input } from '@todome/ui';
import { Textarea } from '@todome/ui';
import { Checkbox } from '@todome/ui';
import {
  useUserId,
  useUpdateSharedCalendarEvent,
  useDeleteSharedCalendarEvent,
} from '@/hooks/queries';
import { useMemberMap } from '@/hooks/use-member-map';

type Props = {
  event: SharedCalendarEvent;
  calendar: SharedCalendar | undefined;
  onClose: () => void;
  onCopyToPersonal?: (data: CopyableEventData) => void;
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
};

export const SharedEventDetail = ({ event, calendar, onClose, onCopyToPersonal, embedded = false }: Props) => {
  const userId = useUserId();
  const updateSharedEvent = useUpdateSharedCalendarEvent();
  const deleteSharedEvent = useDeleteSharedCalendarEvent();

  const memberMap = useMemberMap();
  const creatorInfo = memberMap.get(event.created_by);

  const canEdit = useMemo(
    () => !!userId && (event.created_by === userId || calendar?.owner_id === userId),
    [userId, event.created_by, calendar?.owner_id],
  );

  const handleCopy = useCallback(() => {
    if (!onCopyToPersonal) return;
    const s = parseISO(event.start_at);
    const e = parseISO(event.end_at);
    onCopyToPersonal({
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      color: event.color,
      isAllDay: event.is_all_day,
      startTime: format(s, 'HH:mm'),
      endTime: format(e, 'HH:mm'),
    });
  }, [onCopyToPersonal, event]);

  const startDate = parseISO(event.start_at);
  const endDate = parseISO(event.end_at);

  const [form, setForm] = useState<FormState>(() => ({
    title: event.title,
    startDate: format(startDate, 'yyyy-MM-dd'),
    startTime: format(startDate, 'HH:mm'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    endTime: format(endDate, 'HH:mm'),
    isAllDay: event.is_all_day,
    location: event.location ?? '',
    description: event.description ?? '',
    color: event.color,
  }));

  useEffect(() => {
    const s = parseISO(event.start_at);
    const e = parseISO(event.end_at);
    setForm({
      title: event.title,
      startDate: format(s, 'yyyy-MM-dd'),
      startTime: format(s, 'HH:mm'),
      endDate: format(e, 'yyyy-MM-dd'),
      endTime: format(e, 'HH:mm'),
      isAllDay: event.is_all_day,
      location: event.location ?? '',
      description: event.description ?? '',
      color: event.color,
    });
  }, [event]);

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!form.title.trim() || !canEdit) return;

    const startAt = form.isAllDay
      ? new Date(`${form.startDate}T00:00:00`).toISOString()
      : new Date(`${form.startDate}T${form.startTime}`).toISOString();
    const endAt = form.isAllDay
      ? new Date(`${form.endDate}T23:59:59.999`).toISOString()
      : new Date(`${form.endDate}T${form.endTime}`).toISOString();

    updateSharedEvent.mutate({
      id: event.id,
      patch: {
        title: form.title.trim(),
        start_at: startAt,
        end_at: endAt,
        is_all_day: form.isAllDay,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        color: form.color,
        updated_at: new Date().toISOString(),
      },
    });

    onClose();
  }, [form, canEdit, event.id, updateSharedEvent, onClose]);

  const handleDelete = useCallback(() => {
    if (!canEdit) return;
    deleteSharedEvent.mutate(event.id);
    onClose();
  }, [canEdit, event.id, deleteSharedEvent, onClose]);

  const timeText = event.is_all_day
    ? '終日'
    : `${format(startDate, 'H:mm')} - ${format(endDate, 'H:mm')}`;
  const dateText = format(startDate, 'yyyy年M月d日');

  // ─── View-only mode ───────────────────────────────────────────────
  if (!canEdit) {
    const body = (
      <div className="space-y-4 px-5 py-4">
        {/* Shared calendar indicator */}
        <div className="flex items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2">
          <Users className="h-4 w-4 shrink-0 text-text-tertiary" />
          <span className="text-xs text-text-secondary">
            {calendar?.title ?? '共有カレンダー'} (閲覧のみ)
          </span>
          {calendar?.color && (
            <span
              className="ml-auto h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: calendar.color }}
            />
          )}
        </div>

        {creatorInfo && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: creatorInfo.color }}
            />
            <span className="text-xs">作成者: {creatorInfo.displayName}</span>
          </div>
        )}

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <Clock className="h-4 w-4 shrink-0 text-text-tertiary" />
          <span>{dateText} {timeText}</span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <MapPin className="h-4 w-4 shrink-0 text-text-tertiary" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="flex items-start gap-2 text-sm text-text-primary">
            <FileText className="h-4 w-4 shrink-0 text-text-tertiary mt-0.5" />
            <p className="whitespace-pre-wrap break-words text-text-secondary">
              {event.description}
            </p>
          </div>
        )}

        {onCopyToPersonal && (
          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="w-full">
              <Copy className="h-3.5 w-3.5" />
              個人にコピー
            </Button>
          </div>
        )}
      </div>
    );

    if (embedded) return body;

    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden border-l border-[var(--border)] bg-bg-primary shadow-xl animate-in slide-in-from-right duration-200 md:max-w-md">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: event.color ?? calendar?.color ?? 'var(--accent)' }}
              />
              <h2 className="text-sm font-semibold text-text-primary truncate">
                {event.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-text-tertiary hover:bg-bg-secondary hover:text-text-primary transition"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{body}</div>
        </div>
      </>
    );
  }

  // ─── Editable mode ────────────────────────────────────────────────
  return (
    <>
      {!embedded && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      )}
      <div
        className={clsx(
          embedded
            ? 'flex h-full w-full flex-col overflow-hidden bg-bg-primary'
            : 'fixed inset-y-0 right-0 z-50 w-full md:max-w-md flex flex-col overflow-hidden bg-bg-primary border-l border-[var(--border)] shadow-xl animate-in slide-in-from-right duration-200',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-sm font-semibold text-text-primary">
            共有予定を編集
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
          {/* Shared calendar badge */}
          <div className="flex items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2">
            <Users className="h-4 w-4 shrink-0 text-text-tertiary" />
            <span className="text-xs text-text-secondary">
              {calendar?.title ?? '共有カレンダー'}
            </span>
            {calendar?.color && (
              <span
                className="ml-auto h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: calendar.color }}
              />
            )}
          </div>

          {creatorInfo && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: creatorInfo.color }}
              />
              <span className="text-xs">作成者: {creatorInfo.displayName}</span>
            </div>
          )}

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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              削除
            </Button>
            {onCopyToPersonal && (
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" />
                コピー
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
              更新
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
