'use client';

import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { Trash2 } from 'lucide-react';
import { Button } from '@todome/ui';
import { Checkbox } from '@todome/ui';
import type { CalendarEvent, SharedCalendarEvent, SharedCalendar } from '@todome/db';
import {
  useDeleteCalendarEvent,
  useDeleteSharedCalendarEvent,
  useSharedCalendarEvents,
  useSharedCalendars,
  useCalendarEvents,
} from '@/hooks/queries';
import { useCalendarStore, useTranslation } from '@todome/store';

type Props = {
  /** The event being deleted (personal calendar) */
  event: CalendarEvent;
  onClose: () => void;
  onDeleted: () => void;
};

export const DeleteEventDialog = ({ event, onClose, onDeleted }: Props) => {
  const { t } = useTranslation();
  const deleteCalendarEvent = useDeleteCalendarEvent();
  const deleteSharedCalendarEvent = useDeleteSharedCalendarEvent();
  const { data: sharedEvents = [] } = useSharedCalendarEvents();
  const { data: sharedCalendars = [] } = useSharedCalendars();

  // Find matching events in shared calendars (same title + start + end)
  const matchingSharedEvents = useMemo(() => {
    return sharedEvents.filter(
      (se) =>
        !se.is_deleted &&
        se.title === event.title &&
        se.start_at === event.start_at &&
        se.end_at === event.end_at,
    );
  }, [sharedEvents, event]);

  const calendarMap = useMemo(
    () => new Map(sharedCalendars.map((c) => [c.id, c])),
    [sharedCalendars],
  );

  // If no shared duplicates, just delete immediately
  const hasSharedDuplicates = matchingSharedEvents.length > 0;

  // Selection state: personal calendar + each shared calendar
  const [deletePersonal, setDeletePersonal] = useState(true);
  const [selectedSharedIds, setSelectedSharedIds] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const allSelected =
    deletePersonal && selectedSharedIds.size === matchingSharedEvents.length;

  const toggleShared = useCallback((eventId: string) => {
    setSelectedSharedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setDeletePersonal(true);
    setSelectedSharedIds(new Set(matchingSharedEvents.map((e) => e.id)));
  }, [matchingSharedEvents]);

  const noneSelected = !deletePersonal && selectedSharedIds.size === 0;

  const handleConfirmDelete = useCallback(() => {
    if (deletePersonal) {
      deleteCalendarEvent.mutate(event.id);
    }
    for (const id of selectedSharedIds) {
      deleteSharedCalendarEvent.mutate(id);
    }
    onDeleted();
  }, [
    deletePersonal,
    selectedSharedIds,
    event.id,
    deleteCalendarEvent,
    deleteSharedCalendarEvent,
    onDeleted,
  ]);

  // No shared duplicates → simple confirmation
  if (!hasSharedDuplicates) {
    return (
      <>
        <div
          className="fixed inset-0 z-[60] bg-black/30"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-bg-primary p-5 shadow-xl space-y-4">
            <p className="text-sm text-text-primary">
              {t('event.deleteConfirm', { title: event.title })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Has shared duplicates → calendar selection
  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-bg-primary p-5 shadow-xl space-y-4">
          <div>
            <p className="text-sm font-medium text-text-primary">
              {t('event.deleteTitle', { title: event.title })}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {t('event.deleteMultiCalendarMsg')}
            </p>
          </div>

          <div className="space-y-2">
            {/* Select all button */}
            <button
              type="button"
              onClick={selectAll}
              className={clsx(
                'text-xs font-medium transition-colors',
                allSelected
                  ? 'text-text-tertiary'
                  : 'text-[var(--accent)] hover:underline',
              )}
            >
              {t('event.selectAll')}
            </button>

            {/* Personal calendar */}
            <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5 cursor-pointer hover:bg-bg-secondary transition-colors">
              <input
                type="checkbox"
                checked={deletePersonal}
                onChange={() => setDeletePersonal((v) => !v)}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: '#4285F4' }}
              />
              <span className="text-sm text-text-primary">{t('event.personalCalendar')}</span>
            </label>

            {/* Shared calendars */}
            {matchingSharedEvents.map((se) => {
              const cal = calendarMap.get(se.shared_calendar_id);
              return (
                <label
                  key={se.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5 cursor-pointer hover:bg-bg-secondary transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSharedIds.has(se.id)}
                    onChange={() => toggleShared(se.id)}
                    className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: cal?.color ?? '#7986CB' }}
                  />
                  <span className="text-sm text-text-primary">
                    {cal?.title ?? t('event.sharedCalendar')}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={noneSelected}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
