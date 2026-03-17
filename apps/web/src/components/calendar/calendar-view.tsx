'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useCalendarStore, useSubscriptionStore, useTranslation } from '@todome/store';
import type { CalendarViewMode } from '@todome/store';
import type { ExternalCalendarEvent, CalendarSubscription, SharedCalendarEvent, SharedCalendar } from '@todome/db';
import { Button } from '@todome/ui';
import { IconButton } from '@todome/ui';
import { useCalendarSubscriptions, useSharedCalendars, useSharedCalendarEvents } from '@/hooks/queries';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { DayView } from './day-view';
import { ListView } from './list-view';
import { EventDetail } from './event-detail';
import { ExternalEventDetail } from './external-event-detail';
import { SharedEventDetail } from './shared-event-detail';
import { DayEventsPanel } from './day-events-panel';
import { CalendarSelector } from './calendar-selector';

const VIEW_MODES: CalendarViewMode[] = ['month', 'week', 'day', 'list'];

export const CalendarView = () => {
  const { t, locale } = useTranslation();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const viewMode = useCalendarStore((s) => s.viewMode);
  const setViewMode = useCalendarStore((s) => s.setViewMode);
  const selectDate = useCalendarStore((s) => s.selectDate);
  const selectEvent = useCalendarStore((s) => s.selectEvent);
  const navigateMonthPrev = useCalendarStore((s) => s.navigateMonthPrev);
  const navigateMonthNext = useCalendarStore((s) => s.navigateMonthNext);
  const navigateWeekPrev = useCalendarStore((s) => s.navigateWeekPrev);
  const navigateWeekNext = useCalendarStore((s) => s.navigateWeekNext);
  const navigateDayPrev = useCalendarStore((s) => s.navigateDayPrev);
  const navigateDayNext = useCalendarStore((s) => s.navigateDayNext);

  const [showEventDetail, setShowEventDetail] = useState(false);
  const [eventDetailInitialDate, setEventDetailInitialDate] = useState<Date | undefined>(undefined);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [externalEvent, setExternalEvent] = useState<ExternalCalendarEvent | null>(null);
  const [externalEventSub, setExternalEventSub] = useState<CalendarSubscription | undefined>(undefined);
  const [sharedEvent, setSharedEvent] = useState<SharedCalendarEvent | null>(null);
  const [sharedEventCalendar, setSharedEventCalendar] = useState<SharedCalendar | undefined>(undefined);
  const [dayEventsDate, setDayEventsDate] = useState<Date | null>(null);

  const allExternalEvents = useSubscriptionStore((s) => s.allExternalEvents);
  const setEnabledIds = useSubscriptionStore((s) => s.setEnabledIds);
  const { data: subscriptions = [] } = useCalendarSubscriptions();
  const { data: sharedCalendars = [] } = useSharedCalendars();
  const { data: sharedCalendarEvents = [] } = useSharedCalendarEvents();

  // Sync enabled subscription IDs to the store for filtering
  useEffect(() => {
    const ids = subscriptions.filter((s) => s.is_enabled).map((s) => s.id);
    setEnabledIds(ids);
  }, [subscriptions, setEnabledIds]);

  const effectiveViewMode = viewMode;

  const handlePrev = useCallback(() => {
    switch (effectiveViewMode) {
      case 'month': navigateMonthPrev(); break;
      case 'week': navigateWeekPrev(); break;
      case 'day': navigateDayPrev(); break;
      case 'list': navigateMonthPrev(); break;
    }
  }, [effectiveViewMode, navigateMonthPrev, navigateWeekPrev, navigateDayPrev]);

  const handleNext = useCallback(() => {
    switch (effectiveViewMode) {
      case 'month': navigateMonthNext(); break;
      case 'week': navigateWeekNext(); break;
      case 'day': navigateDayNext(); break;
      case 'list': navigateMonthNext(); break;
    }
  }, [effectiveViewMode, navigateMonthNext, navigateWeekNext, navigateDayNext]);

  const handleToday = useCallback(() => {
    selectDate(new Date());
  }, [selectDate]);

  const handleCreateEvent = useCallback((date: Date) => {
    setEditEventId(null);
    setEventDetailInitialDate(date);
    setShowEventDetail(true);
  }, []);

  const handleSelectEvent = useCallback((event: { id: string }) => {
    // Check if this is an external event
    const external = allExternalEvents().find((e) => e.id === event.id);
    if (external) {
      const sub = subscriptions.find((s) => s.id === external.subscription_id);
      setExternalEvent(external);
      setExternalEventSub(sub ?? undefined);
      return;
    }
    // Check if this is a shared calendar event
    const shared = sharedCalendarEvents.find((e) => e.id === event.id);
    if (shared) {
      const calendar = sharedCalendars.find((c) => c.id === shared.shared_calendar_id);
      setSharedEvent(shared);
      setSharedEventCalendar(calendar);
      return;
    }
    // Local event
    setEditEventId(event.id);
    setEventDetailInitialDate(undefined);
    setShowEventDetail(true);
    selectEvent(event.id);
  }, [selectEvent, allExternalEvents, subscriptions, sharedCalendarEvents, sharedCalendars]);

  const handleCloseEventDetail = useCallback(() => {
    setShowEventDetail(false);
    setEditEventId(null);
    setEventDetailInitialDate(undefined);
    selectEvent(null);
  }, [selectEvent]);

  const router = useRouter();

  const handleShowDayEvents = useCallback((date: Date) => {
    setDayEventsDate(date);
  }, []);

  const handleCloseDayEvents = useCallback(() => {
    setDayEventsDate(null);
  }, []);

  const handleOpenDiary = useCallback((date: Date) => {
    router.push(`/diary?date=${format(date, 'yyyy-MM-dd')}`);
  }, [router]);

  const handleNewEvent = useCallback(() => {
    handleCreateEvent(selectedDate);
  }, [handleCreateEvent, selectedDate]);

  const dateDisplay = (() => {
    const yearMonthFmt = locale === 'ja' ? 'yyyy年M月' : 'MMM yyyy';
    const yearMonthDayFmt = locale === 'ja' ? 'yyyy年M月d日' : 'MMM d, yyyy';
    switch (effectiveViewMode) {
      case 'month':
        return format(selectedDate, yearMonthFmt);
      case 'week':
        return format(selectedDate, yearMonthFmt);
      case 'day':
        return format(selectedDate, yearMonthDayFmt);
      case 'list':
        return format(selectedDate, yearMonthFmt);
    }
  })();

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      {/* Top bar */}
      <div className="border-b border-[var(--border)] px-3 py-2 md:px-4">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {/* Navigation */}
            <IconButton
              icon={<ChevronLeft />}
              label={t('calendar.nav.prev')}
              size="sm"
              variant="ghost"
              onClick={handlePrev}
            />
            <IconButton
              icon={<ChevronRight />}
              label={t('calendar.nav.next')}
              size="sm"
              variant="ghost"
              onClick={handleNext}
            />

            <button
              type="button"
              onClick={handleToday}
              className={clsx(
                'shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium',
                'border border-[var(--border)] text-text-secondary',
                'hover:bg-bg-secondary transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              )}
            >
              {t('calendar.nav.today')}
            </button>

            <CalendarSelector />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={clsx(
                  'px-2 py-1.5 text-xs font-medium transition-colors md:px-3',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]',
                  viewMode === mode
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-text-secondary hover:bg-bg-secondary',
                )}
              >
                {t(`calendar.view.${mode}` as const)}
              </button>
            ))}
          </div>

          {/* New event button */}
          <Button size="sm" onClick={handleNewEvent}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{t('calendar.newEvent')}</span>
          </Button>
          </div>
        </div>

        {/* Date display */}
        <h1 className="mt-1 text-base font-semibold text-text-primary">
          {dateDisplay}
        </h1>
      </div>

      {/* View content */}
      <div className="flex flex-1 overflow-hidden">
        {viewMode === 'month' && (
          <MonthView
            onCreateEvent={handleCreateEvent}
            onSelectEvent={handleSelectEvent}
            onOpenDiary={handleOpenDiary}
            onShowDayEvents={handleShowDayEvents}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            onCreateEvent={handleCreateEvent}
            onSelectEvent={handleSelectEvent}
            onOpenDiary={handleOpenDiary}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            onCreateEvent={handleCreateEvent}
            onSelectEvent={handleSelectEvent}
            onOpenDiary={handleOpenDiary}
          />
        )}
        {viewMode === 'list' && (
          <ListView onSelectEvent={handleSelectEvent} />
        )}
      </div>

      {/* Event detail modal */}
      {showEventDetail && (
        <EventDetail
          key={editEventId ?? 'new'}
          eventId={editEventId}
          initialDate={eventDetailInitialDate}
          onClose={handleCloseEventDetail}
        />
      )}

      {/* External event detail modal */}
      {externalEvent && (
        <ExternalEventDetail
          event={externalEvent}
          subscription={externalEventSub}
          onClose={() => {
            setExternalEvent(null);
            setExternalEventSub(undefined);
          }}
        />
      )}

      {/* Shared event detail modal */}
      {sharedEvent && (
        <SharedEventDetail
          event={sharedEvent}
          calendar={sharedEventCalendar}
          onClose={() => {
            setSharedEvent(null);
            setSharedEventCalendar(undefined);
          }}
        />
      )}

      {/* Day events panel */}
      {dayEventsDate && (
        <DayEventsPanel
          key={dayEventsDate.toISOString()}
          date={dayEventsDate}
          onClose={handleCloseDayEvents}
          onSelectExternalEvent={handleSelectEvent}
        />
      )}
    </div>
  );
};
