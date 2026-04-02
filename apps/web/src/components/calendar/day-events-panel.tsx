'use client';

import { deduplicateEvents } from '@/lib/dedup-events';
import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { format, parseISO, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { X, Plus, ChevronLeft, Trash2, Users } from 'lucide-react';
import { useCalendarStore, useSubscriptionStore, useTranslation } from '@todome/store';
import type { CalendarEvent, ExternalCalendarEvent, SharedCalendarEvent, SharedCalendar } from '@todome/db';
import { Button } from '@todome/ui';
import { useIsMobile } from '@todome/hooks';
import { useCalendarEvents, useDeleteCalendarEvent, useCalendarSubscriptions, useSharedCalendarEvents, useSharedCalendars, useTodos, useUpdateTodo } from '@/hooks/queries';
import { useMemberMap } from '@/hooks/use-member-map';
import { EventDetail } from './event-detail';
import type { CopyableEventData } from './event-detail';
import { ExternalEventDetail } from './external-event-detail';
import { SharedEventDetail } from './shared-event-detail';
import { DeleteEventDialog } from './delete-event-dialog';
import { ProviderIcon } from './provider-icon';
import { MobileBottomSheet } from './mobile-bottom-sheet';

type Props = {
  date: Date;
  onClose: () => void;
  onSelectExternalEvent: (event: { id: string }) => void;
  /** Mobile: delegate event selection to parent CalendarView */
  onSelectEvent?: (event: { id: string }) => void;
  /** Mobile: delegate event creation to parent CalendarView */
  onCreateEvent?: (date: Date) => void;
};

type PanelMode = 'list' | 'detail' | 'create' | 'external-detail' | 'shared-detail';

export const DayEventsPanel = ({ date, onClose, onSelectExternalEvent, onSelectEvent, onCreateEvent }: Props) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<PanelMode>('list');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedExternalEvent, setSelectedExternalEvent] = useState<ExternalCalendarEvent | null>(null);
  const [selectedSharedEvent, setSelectedSharedEvent] = useState<SharedCalendarEvent | null>(null);
  const [selectedSharedCalendar, setSelectedSharedCalendar] = useState<SharedCalendar | undefined>(undefined);
  const [copyFormData, setCopyFormData] = useState<Partial<CopyableEventData> | null>(null);

  const { data: events = [] } = useCalendarEvents();
  const externalEventsMap = useSubscriptionStore((s) => s.eventsBySubscription);
  const allExternalEvents = useSubscriptionStore((s) => s.allExternalEvents);
  const { data: subscriptions = [] } = useCalendarSubscriptions();
  const { data: sharedCalendarEvents = [] } = useSharedCalendarEvents();
  const { data: sharedCalendars = [] } = useSharedCalendars();
  const showPersonalCalendar = useCalendarStore((s) => s.showPersonalCalendar);
  const hiddenSharedCalendarIds = useCalendarStore((s) => s.hiddenSharedCalendarIds);
  const memberMap = useMemberMap();
  const { data: allTodos = [] } = useTodos();
  const updateTodo = useUpdateTodo();

  const TODO_PRIORITY_COLORS: Record<number, string> = {
    1: '#388E3C',
    2: '#F9A825',
    3: '#F57C00',
    4: '#D32F2F',
  };

  const todosForDay = useMemo(() => {
    return allTodos.filter((t) => {
      if (t.is_deleted || !t.due_date) return false;
      return isSameDay(parseISO(t.due_date), date);
    });
  }, [allTodos, date]);

  const dayEvents = useMemo(() => {
    const dayS = startOfDay(date);
    const dayE = endOfDay(date);
    const local = showPersonalCalendar
      ? events
          .filter((e: CalendarEvent) => {
            if (e.is_deleted) return false;
            const eventStart = parseISO(e.start_at);
            const eventEnd = parseISO(e.end_at);
            return eventStart <= dayE && eventEnd >= dayS;
          })
          .map((e) => ({ ...e, isExternal: false as const, isShared: false as const }))
      : [];
    const external = showPersonalCalendar
      ? Object.values(externalEventsMap)
          .flat()
          .filter((e) => {
            const eventStart = parseISO(e.start_at);
            const eventEnd = parseISO(e.end_at);
            return eventStart <= dayE && eventEnd >= dayS;
          })
          .map((e) => ({ ...e, isExternal: true as const, isShared: false as const }))
      : [];
    const shared = sharedCalendarEvents
      .filter((e) => {
        if (e.is_deleted) return false;
        if (hiddenSharedCalendarIds.has(e.shared_calendar_id)) return false;
        const eventStart = parseISO(e.start_at);
        const eventEnd = parseISO(e.end_at);
        return eventStart <= dayE && eventEnd >= dayS;
      })
      .map((e) => ({ ...e, isExternal: false as const, isShared: true as const }));
    return deduplicateEvents([...local, ...external, ...shared]).sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
  }, [events, externalEventsMap, sharedCalendarEvents, date, showPersonalCalendar, hiddenSharedCalendarIds]);

  const handleSelectEvent = useCallback(
    (event: { id: string; isExternal: boolean; isShared: boolean }) => {
      // Mobile: delegate to parent and close bottom sheet
      if (isMobile && onSelectEvent) {
        onClose();
        setTimeout(() => onSelectEvent(event), 100);
        return;
      }
      // Desktop: open detail within panel
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
    [isMobile, onSelectEvent, onClose, allExternalEvents, sharedCalendarEvents, sharedCalendars],
  );

  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  const handleDelete = useCallback(
    (e: React.MouseEvent, eventId: string) => {
      e.stopPropagation();
      const target = events.find((ev) => ev.id === eventId);
      if (target) setDeleteTarget(target);
    },
    [events],
  );

  const handleBackToList = useCallback(() => {
    setSelectedEventId(null);
    setSelectedExternalEvent(null);
    setSelectedSharedEvent(null);
    setSelectedSharedCalendar(undefined);
    setCopyFormData(null);
    setMode('list');
  }, []);

  const handleCreate = useCallback(() => {
    // Mobile: delegate to parent
    if (isMobile && onCreateEvent) {
      onClose();
      setTimeout(() => onCreateEvent(date), 100);
      return;
    }
    setSelectedEventId(null);
    setCopyFormData(null);
    setMode('create');
  }, [isMobile, onCreateEvent, onClose, date]);

  const handleEventDetailClose = useCallback(() => {
    handleBackToList();
  }, [handleBackToList]);

  // Copy handlers
  const handleCopyFromDetail = useCallback((data: CopyableEventData) => {
    setCopyFormData(data);
    setSelectedEventId(null);
    setMode('create');
  }, []);

  const handleCopyFromSharedOrExternal = useCallback((data: CopyableEventData) => {
    setCopyFormData(data);
    setMode('create');
  }, []);

  const dateStr = format(date, 'yyyy\u5E74M\u6708d\u65E5\uFF08E\uFF09');

  // --- Shared list content ---
  const listContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">{dateStr}</h2>
        {!isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bg-secondary text-text-tertiary hover:text-text-primary transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {dayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
            <p className="text-sm">{t('calendar.noEvents')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {dayEvents.map((event) => {
              const isShared = event.isShared;
              const createdBy = isShared && 'created_by' in event ? (event as SharedCalendarEvent).created_by : undefined;
              const memberInfo = createdBy ? memberMap.get(createdBy) : undefined;
              const dotColor = memberInfo?.color ?? event.color ?? 'var(--accent)';

              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectEvent(event)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-secondary transition-colors"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: dotColor }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {'provider' in event && event.provider && (
                          <ProviderIcon provider={event.provider} size={12} className="mr-1 inline shrink-0" />
                        )}
                        {isShared && <Users className="mr-1 inline h-3 w-3 shrink-0 text-text-tertiary" />}
                        {event.title}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {event.is_all_day
                          ? t('calendar.allDay')
                          : `${format(parseISO(event.start_at), 'H:mm')} - ${format(parseISO(event.end_at), 'H:mm')}`}
                        {memberInfo && (
                          <span className="ml-2 text-text-tertiary">
                            {memberInfo.displayName}
                          </span>
                        )}
                      </p>
                      {'description' in event && event.description && (
                        <p className="truncate text-xs text-text-tertiary">
                          {event.description as string}
                        </p>
                      )}
                    </div>
                    {!event.isExternal && !event.isShared && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, event.id)}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-[#D32F2F] hover:bg-[#D32F2F]/10 transition-colors"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Todos section */}
      {todosForDay.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--border)]">
            <span className="text-xs font-medium text-text-tertiary">{t('calendar.todoSection')}</span>
          </div>
          {todosForDay.map((todo) => (
            <div key={todo.id} className="flex items-center gap-3 px-4 py-2 hover:bg-bg-secondary transition-colors">
              <button
                type="button"
                onClick={() => {
                  const now = new Date().toISOString();
                  updateTodo.mutate({
                    id: todo.id,
                    patch: {
                      status: todo.status === 'completed' ? 'pending' : 'completed',
                      completed_at: todo.status === 'completed' ? null : now,
                      updated_at: now,
                    },
                  });
                }}
                className={clsx(
                  'h-4 w-4 rounded-sm border-2 flex-shrink-0 transition-colors',
                  todo.status === 'completed'
                    ? 'bg-[#388E3C] border-[#388E3C]'
                    : 'border-[var(--border)]',
                )}
              />
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: TODO_PRIORITY_COLORS[todo.priority] ?? '#888' }}
              />
              <span className={clsx(
                'text-sm truncate',
                todo.status === 'completed' ? 'line-through text-text-tertiary' : 'text-text-primary',
              )}>
                {todo.title}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Footer: add new event */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <Button size="sm" onClick={handleCreate} className="w-full">
          <Plus className="h-3.5 w-3.5" />
          {t('calendar.addEvent')}
        </Button>
      </div>
    </>
  );

  // --- Mobile: bottom sheet with list only ---
  if (isMobile) {
    return (
      <>
        <MobileBottomSheet isOpen onClose={onClose}>
          <div className="flex h-full flex-col">{listContent}</div>
        </MobileBottomSheet>

        {deleteTarget && (
          <DeleteEventDialog
            event={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={() => setDeleteTarget(null)}
          />
        )}
      </>
    );
  }

  // --- Desktop: right-slide panel with mode switching ---
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
        {mode === 'list' && listContent}

        {(mode === 'detail' || mode === 'create') && (
          <>
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('common.back')}
              </button>
              <span className="text-sm text-text-tertiary">{dateStr}</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <EventDetail
                eventId={mode === 'detail' ? selectedEventId : null}
                initialDate={date}
                initialFormData={mode === 'create' && copyFormData ? copyFormData : undefined}
                onClose={handleEventDetailClose}
                onCopy={mode === 'detail' ? handleCopyFromDetail : undefined}
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
                {t('common.back')}
              </button>
              <span className="text-sm text-text-tertiary">{dateStr}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ExternalEventDetail
                event={selectedExternalEvent}
                subscription={subscriptions.find((s) => s.id === selectedExternalEvent.subscription_id)}
                onCopyToPersonal={handleCopyFromSharedOrExternal}
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
                {t('common.back')}
              </button>
              <span className="text-sm text-text-tertiary">{dateStr}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SharedEventDetail
                event={selectedSharedEvent}
                calendar={selectedSharedCalendar}
                onClose={handleBackToList}
                onCopyToPersonal={handleCopyFromSharedOrExternal}
                embedded
              />
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteEventDialog
          event={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};
