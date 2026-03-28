'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';
import { useCalendarEvents } from '@/hooks/queries';
import { useTranslation } from '@todome/store';

type Props = {
  date: string; // 'YYYY-MM-DD'
};

export function DiaryAutoEvents({ date }: Props) {
  const { t } = useTranslation();
  const { data: events = [] } = useCalendarEvents();

  const dayEvents = useMemo(() => {
    return events
      .filter((e) => {
        if (e.is_deleted || e.diary_content) return false;
        const startDate = e.start_at.substring(0, 10);
        const endDate = e.end_at.substring(0, 10);
        return startDate <= date && endDate >= date;
      })
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  }, [events, date]);

  if (dayEvents.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
        <span className="text-xs font-medium text-text-secondary">{t('diary.scheduledEvents')}</span>
        <span className="text-[10px] text-text-tertiary">({dayEvents.length})</span>
      </div>
      <div className="space-y-1 pl-5">
        {dayEvents.map((event) => {
          const timeStr = event.is_all_day
            ? t('calendar.allDay')
            : `${format(parseISO(event.start_at), 'H:mm')}\u2013${format(parseISO(event.end_at), 'H:mm')}`;

          return (
            <div
              key={event.id}
              className="flex items-start gap-2 text-sm py-0.5"
            >
              {event.color && (
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0 mt-1.5"
                  style={{ backgroundColor: event.color }}
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-text-tertiary whitespace-nowrap">
                    {timeStr}
                  </span>
                  <span className="text-text-primary truncate">{event.title}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-2.5 w-2.5 text-text-tertiary" />
                    <span className="text-[10px] text-text-tertiary truncate">
                      {event.location}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
