'use client';

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useCalendarStore } from '@todome/store';
import type { CalendarViewMode, CalendarEvent } from '@todome/store';
import { Button } from '@todome/ui';
import { IconButton } from '@todome/ui';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { DayView } from './day-view';
import { ListView } from './list-view';
import { EventDetail } from './event-detail';
import { DiaryEditor } from './diary-editor';

const VIEW_MODE_LABELS: Record<CalendarViewMode, string> = {
  month: '月',
  week: '週',
  day: '日',
  list: 'リスト',
};

const VIEW_MODES: CalendarViewMode[] = ['month', 'week', 'day', 'list'];

export const CalendarView = () => {
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const viewMode = useCalendarStore((s) => s.viewMode);
  const setViewMode = useCalendarStore((s) => s.setViewMode);
  const selectDate = useCalendarStore((s) => s.selectDate);
  const selectEvent = useCalendarStore((s) => s.selectEvent);
  const selectedEventId = useCalendarStore((s) => s.selectedEventId);
  const navigateMonthPrev = useCalendarStore((s) => s.navigateMonthPrev);
  const navigateMonthNext = useCalendarStore((s) => s.navigateMonthNext);
  const navigateWeekPrev = useCalendarStore((s) => s.navigateWeekPrev);
  const navigateWeekNext = useCalendarStore((s) => s.navigateWeekNext);
  const navigateDayPrev = useCalendarStore((s) => s.navigateDayPrev);
  const navigateDayNext = useCalendarStore((s) => s.navigateDayNext);

  const [showEventDetail, setShowEventDetail] = useState(false);
  const [eventDetailInitialDate, setEventDetailInitialDate] = useState<Date | undefined>(undefined);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [diaryDate, setDiaryDate] = useState<Date | null>(null);

  const handlePrev = useCallback(() => {
    switch (viewMode) {
      case 'month': navigateMonthPrev(); break;
      case 'week': navigateWeekPrev(); break;
      case 'day': navigateDayPrev(); break;
      case 'list': navigateMonthPrev(); break;
    }
  }, [viewMode, navigateMonthPrev, navigateWeekPrev, navigateDayPrev]);

  const handleNext = useCallback(() => {
    switch (viewMode) {
      case 'month': navigateMonthNext(); break;
      case 'week': navigateWeekNext(); break;
      case 'day': navigateDayNext(); break;
      case 'list': navigateMonthNext(); break;
    }
  }, [viewMode, navigateMonthNext, navigateWeekNext, navigateDayNext]);

  const handleToday = useCallback(() => {
    selectDate(new Date());
  }, [selectDate]);

  const handleCreateEvent = useCallback((date: Date) => {
    setEditEventId(null);
    setEventDetailInitialDate(date);
    setShowEventDetail(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setEditEventId(event.id);
    setEventDetailInitialDate(undefined);
    setShowEventDetail(true);
    selectEvent(event.id);
  }, [selectEvent]);

  const handleCloseEventDetail = useCallback(() => {
    setShowEventDetail(false);
    setEditEventId(null);
    setEventDetailInitialDate(undefined);
    selectEvent(null);
  }, [selectEvent]);

  const handleOpenDiary = useCallback((date: Date) => {
    setDiaryDate(date);
  }, []);

  const handleCloseDiary = useCallback(() => {
    setDiaryDate(null);
  }, []);

  const handleNewEvent = useCallback(() => {
    handleCreateEvent(selectedDate);
  }, [handleCreateEvent, selectedDate]);

  const dateDisplay = (() => {
    switch (viewMode) {
      case 'month':
        return format(selectedDate, 'yyyy年M月');
      case 'week':
        return format(selectedDate, 'yyyy年M月');
      case 'day':
        return format(selectedDate, 'yyyy年M月d日');
      case 'list':
        return format(selectedDate, 'yyyy年M月');
    }
  })();

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Navigation */}
          <IconButton
            icon={<ChevronLeft />}
            label="前へ"
            size="sm"
            variant="ghost"
            onClick={handlePrev}
          />
          <IconButton
            icon={<ChevronRight />}
            label="次へ"
            size="sm"
            variant="ghost"
            onClick={handleNext}
          />

          <button
            type="button"
            onClick={handleToday}
            className={clsx(
              'rounded-md px-2.5 py-1 text-xs font-medium',
              'border border-[var(--border)] text-text-secondary',
              'hover:bg-bg-secondary transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            )}
          >
            今日
          </button>

          {/* Date display */}
          <h1 className="ml-2 text-base font-semibold text-text-primary">
            {dateDisplay}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]',
                  viewMode === mode
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-text-secondary hover:bg-bg-secondary',
                )}
              >
                {VIEW_MODE_LABELS[mode]}
              </button>
            ))}
          </div>

          {/* New event button */}
          <Button size="sm" onClick={handleNewEvent}>
            <Plus className="h-3.5 w-3.5" />
            新規予定
          </Button>
        </div>
      </div>

      {/* View content */}
      <div className="flex flex-1 overflow-hidden">
        {viewMode === 'month' && (
          <MonthView
            onCreateEvent={handleCreateEvent}
            onSelectEvent={handleSelectEvent}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            onCreateEvent={handleCreateEvent}
            onSelectEvent={handleSelectEvent}
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
          eventId={editEventId}
          initialDate={eventDetailInitialDate}
          onClose={handleCloseEventDetail}
        />
      )}

      {/* Diary editor modal */}
      {diaryDate && (
        <DiaryEditor date={diaryDate} onClose={handleCloseDiary} />
      )}
    </div>
  );
};
