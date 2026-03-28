'use client';

import { format, parseISO } from 'date-fns';
import { X, MapPin, Clock, FileText, Copy } from 'lucide-react';
import type { ExternalCalendarEvent, CalendarSubscription } from '@todome/db';
import { Button } from '@todome/ui';
import type { CopyableEventData } from './event-detail';
import { ProviderIcon } from './provider-icon';
import { useTranslation } from '@todome/store';

type Props = {
  event: ExternalCalendarEvent;
  subscription: CalendarSubscription | undefined;
  onClose?: () => void;
  onCopyToPersonal?: (data: CopyableEventData) => void;
  embedded?: boolean;
};

export const ExternalEventDetail = ({ event, subscription, onClose, onCopyToPersonal, embedded }: Props) => {
  const { t, locale } = useTranslation();
  const startDate = parseISO(event.start_at);
  const endDate = parseISO(event.end_at);

  const timeText = event.is_all_day
    ? t('calendar.allDay')
    : `${format(startDate, 'H:mm')} - ${format(endDate, 'H:mm')}`;

  const dateText = locale === 'ja' ? format(startDate, 'yyyy年M月d日') : format(startDate, 'MMMM d, yyyy');

  const handleCopy = () => {
    if (!onCopyToPersonal) return;
    onCopyToPersonal({
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      color: event.color,
      isAllDay: event.is_all_day,
      startTime: format(startDate, 'HH:mm'),
      endTime: format(endDate, 'HH:mm'),
    });
  };

  const body = (
    <div className="space-y-4 px-5 py-4">
      {/* Source indicator */}
      <div className="flex items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2">
        <ProviderIcon provider={event.provider} size={16} />
        <span className="text-xs text-text-secondary">
          {subscription?.name ?? t('event.externalCalendar')} {t('event.readOnly')}
        </span>
      </div>

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
            {t('event.copyToPersonal')}
          </Button>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden border-l border-[var(--border)] bg-bg-primary shadow-xl animate-in slide-in-from-right duration-200 md:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: event.color }}
            />
            <h2 className="text-sm font-semibold text-text-primary truncate">
              {event.title}
            </h2>
          </div>
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
        <div className="flex-1 overflow-y-auto">
          {body}
        </div>
      </div>
    </>
  );
};
