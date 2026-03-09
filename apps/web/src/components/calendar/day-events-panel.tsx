'use client';

import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { X, Plus, ChevronLeft, Trash2 } from 'lucide-react';
import { useCalendarStore, useSubscriptionStore } from '@todome/store';
import type { CalendarEvent, ExternalCalendarEvent, SharedCalendarEvent, SharedCalendar } from '@todome/db';
import { Button } from '@todome/ui';
import { useCalendarEvents, useDeleteCalendarEvent, useCalendarSubscriptions, useSharedCalendarEvents, useSharedCalendars } from '@/hooks/queries';
import { EventDetail } from './event-detail';
import { ExternalEventDetail } from './external-event-detail';
import { SharedEventDetail } from './shared-event-detail';
import { ProviderIcon } from './provider-icon';

type Props = {
  date: Date;
  onClose: () => void;
  onSelectExternalEvent: (event: { id: string }) => void;
};

type PanelMode = 'list' | 'detail' | 'create' | 'external-detail' | 'shared-detail';

export const DayEventsPanel = ({ date, onClose, onSelectExternalEvent }: Props) => {
  const [mode, setMode] = useState<PanelMode>('list');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedExternalEvent, setSelectedExternalEvent] = useState<ExternalCalendarEvent | null>(null);
  const [selectedSharedEvent, setSelectedSharedEvent] = useState<SharedCalendarEvent | null>(null);
  const [selectedSharedCalendar, setSelectedSharedCalendar] = useState<SharedCalendar | undefined>(undefined);

  const { data: events = [] } = useCalendarEvents();
  const externalEventsMap = useSubscriptionStore((s) => s.eventsBySubscription);
  const allExternalEvents = useSubscriptionStore((s) => s.allExternalEvents);
  const deleteCalendarEvent = useDeleteCalendarEvent();
  const { data: subscriptions = [] } = useCalendarSubscriptions();
  const { data: sharedCalendarEvents = [] } = useSharedCalendarEvents();
  const { data: sharedCalendars = [] } = useSharedCalendars();

  const dayEvents = useMemo(() => {
    const dayS = startOfDay(date);
    const dayE = endOfDay(date);
    const local = events
      .filter((e: CalendarEvent) => {
        if (e.is_deleted) return false;
        const eventStart = parseISO(e.start_at);
        const eventEnd = parseISO(e.end_at);
        return eventStart <= dayE && eventEnd >= dayS;
      })
      .map((e) => ({ ...e, isExternal: false as const, isShared: false as const }));
    const external = Object.values(externalEventsMap)
      .flat()
      .filter((e) => {
        const eventStart = parseISO(e.start_at);
        const eventEnd = parseISO(e.end_at);
        return eventStart <= dayE && eventEnd >= dayS;
      })
      .map((e) => ({ ...e, isExternal: true as const, isShared: false as const }));
    const shared = sharedCalendarEvents
      .filter((e) => {
        if (e.is_deleted) return false;
        const eventStart = parseISO(e.start_at);
        const eventEnd = parseISO(e.end_at);
        return eventStart <= dayE && eventEnd >= dayS;
      })
      .map((e) => ({ ...e, isExternal: false as const, isShared: true as const }));
    return [...local, ...external, ...shared].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
  }, [events, externalEventsMap, sharedCalendarEvents, date]);

  const handleSelectEvent = useCallback(
    (event: { id: string; isExternal: boolean; isShared: boolean }) => {
      if (event.isExternal) {
        const full = allExternalEvents().find((e) => e.id === event.id);
        if (full) {
          setSelectedExternalEvent(full);
          setMode('external-detail');
        }
        return;
      }
      if (event.isShared) {
        const full = sharedCalendarEvents.find((e) => e.id === event.id);
        if (full) {
          const calendar = sharedCalendars.find((c) => c.id === full.shared_calendar_id);
          setSelectedSharedEvent(full);
          setSelectedSharedCalendar(calendar);
          setMode('shared-detail');
        }
        return;
      }
      setSelectedEventId(event.id);
      setMode('detail');
    },
    [allExternalEvents, sharedCalendarEvents, sharedCalendars],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, eventId: string) => {
      e.stopPropagation();
      deleteCalendarEvent.mutate(eventId);
    },
    [deleteCalendarEvent],
  );

  const handleBackToList = useCallback(() => {
    setSelectedEventId(null);
    setSelectedExternalEvent(null);
    setSelectedSharedEvent(null);
    setSelectedSharedCalendar(undefined);
    setMode('list');
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedEventId(null);
    setMode('create');
  }, []);

  const handleEventDetailClose = useCallback(() => {
    handleBackToList();
  }, [handleBackToList]);

  const dateStr = format(date, 'yyyy\u5E74M\u6708d\u65E5\uFF08E\uFF09');

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        className={clsx(
          'fixed inset-y-0 right-0 z-50 w-full md:max-w-md',
          'flex flex-col bg-bg-primary border-l border-[var(--border)]',
          'shadow-xl animate-in slide-in-from-right duration-200',
        )}
      >
        {mode === 'list' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-sm font-semibold text-text-primary">{dateStr}</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-bg-secondary text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="\u9589\u3058\u308B"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Event list */}
            <div className="flex-1 overflow-y-auto">
              {dayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
                  <p className="text-sm">{'\u3053\u306E\u65E5\u306E\u4E88\u5B9A\u306F\u3042\u308A\u307E\u305B\u3093'}</p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {dayEvents.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectEvent(event)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-secondary transition-colors"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: event.color ?? 'var(--accent)' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {'provider' in event && event.provider && (
                              <ProviderIcon provider={event.provider} size={12} className="mr-1 inline shrink-0" />
                            )}
                            {event.title}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {event.is_all_day
                              ? '\u7D42\u65E5'
                              : `${format(parseISO(event.start_at), 'H:mm')} - ${format(parseISO(event.end_at), 'H:mm')}`}
                          </p>
                        </div>
                        {!event.isExternal && !event.isShared && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, event.id)}
                            className="p-1.5 rounded-md text-text-tertiary hover:text-[#D32F2F] hover:bg-[#D32F2F]/10 transition-colors"
                            aria-label="\u524A\u9664"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer: add new event */}
            <div className="border-t border-[var(--border)] px-4 py-3">
              <Button size="sm" onClick={handleCreate} className="w-full">
                <Plus className="h-3.5 w-3.5" />
                {'\u65B0\u898F\u4E88\u5B9A\u3092\u8FFD\u52A0'}
              </Button>
            </div>
          </>
        )}

        {(mode === 'detail' || mode === 'create') && (
          <>
            {/* Back button header */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                {'\u623B\u308B'}
              </button>
              <span className="text-sm text-text-tertiary">{dateStr}</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <EventDetail
                eventId={mode === 'detail' ? selectedEventId : null}
                initialDate={date}
                onClose={handleEventDetailClose}
                embedded
              />
            </div>
          </>
        )}

        {mode === 'external-detail' && selectedExternalEvent && (
          <>
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                {'戻る'}
              </button>
              <span className="text-sm text-text-tertiary">{dateStr}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ExternalEventDetail
                event={selectedExternalEvent}
                subscription={subscriptions.find((s) => s.id === selectedExternalEvent.subscription_id)}
                embedded
              />
            </div>
          </>
        )}

        {mode === 'shared-detail' && selectedSharedEvent && (
          <>
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                {'戻る'}
              </button>
              <span className="text-sm text-text-tertiary">{dateStr}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SharedEventDetail
                event={selectedSharedEvent}
                calendar={selectedSharedCalendar}
                onClose={handleBackToList}
                embedded
              />
            </div>
          </>
        )}
      </div>
    </>
  );
};
