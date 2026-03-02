'use client';

import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';
import { X, MapPin, Clock, FileText } from 'lucide-react';
import type { ExternalCalendarEvent, CalendarSubscription } from '@todome/db';
import { ProviderIcon } from './provider-icon';

type Props = {
  event: ExternalCalendarEvent;
  subscription: CalendarSubscription | undefined;
  onClose: () => void;
};

export const ExternalEventDetail = ({ event, subscription, onClose }: Props) => {
  const startDate = parseISO(event.start_at);
  const endDate = parseISO(event.end_at);

  const timeText = event.is_all_day
    ? '終日'
    : `${format(startDate, 'H:mm')} - ${format(endDate, 'H:mm')}`;

  const dateText = format(startDate, 'yyyy年M月d日');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="閉じる"
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-[var(--border)] bg-bg-primary shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: event.color }}
            />
            <h2 className="text-lg font-semibold text-text-primary truncate">
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          {/* Source indicator */}
          <div className="flex items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2">
            <ProviderIcon provider={event.provider} size={16} />
            <span className="text-xs text-text-secondary">
              {subscription?.name ?? '外部カレンダー'} (読み取り専用)
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
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              'w-full rounded-lg px-4 py-2 text-sm font-medium',
              'bg-bg-secondary text-text-primary',
              'hover:bg-bg-tertiary transition-colors',
            )}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
