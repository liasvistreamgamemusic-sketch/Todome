'use client';

import { memo, useCallback } from 'react';
import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';
import type { CalendarEvent } from '@todome/store';

type Props = {
  event: CalendarEvent;
  /** Height style for positioned blocks in time grids (e.g. '60px'). */
  height?: string;
  /** Top offset style for positioned blocks in time grids (e.g. '120px'). */
  top?: string;
  /** Whether this block is rendered inside a time grid (absolute positioning). */
  positioned?: boolean;
  onClick?: (event: CalendarEvent) => void;
};

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '#4285F4': { bg: 'bg-[#4285F4]/15', border: 'border-l-[#4285F4]', text: 'text-[#4285F4]' },
  '#EA4335': { bg: 'bg-[#EA4335]/15', border: 'border-l-[#EA4335]', text: 'text-[#EA4335]' },
  '#FBBC04': { bg: 'bg-[#FBBC04]/15', border: 'border-l-[#FBBC04]', text: 'text-[#FBBC04]' },
  '#34A853': { bg: 'bg-[#34A853]/15', border: 'border-l-[#34A853]', text: 'text-[#34A853]' },
  '#FF6D01': { bg: 'bg-[#FF6D01]/15', border: 'border-l-[#FF6D01]', text: 'text-[#FF6D01]' },
  '#46BDC6': { bg: 'bg-[#46BDC6]/15', border: 'border-l-[#46BDC6]', text: 'text-[#46BDC6]' },
  '#7986CB': { bg: 'bg-[#7986CB]/15', border: 'border-l-[#7986CB]', text: 'text-[#7986CB]' },
  '#E67C73': { bg: 'bg-[#E67C73]/15', border: 'border-l-[#E67C73]', text: 'text-[#E67C73]' },
};

const DEFAULT_COLOR = { bg: 'bg-[var(--accent)]/15', border: 'border-l-[var(--accent)]', text: 'text-[var(--accent)]' };

const getColorClasses = (color: string | null) => {
  if (!color) return DEFAULT_COLOR;
  return EVENT_COLORS[color] ?? DEFAULT_COLOR;
};

export const CalendarEventBlock = memo(function CalendarEventBlock({
  event,
  height,
  top,
  positioned = false,
  onClick,
}: Props) {
  const colorClasses = getColorClasses(event.color);

  const handleClick = useCallback(() => {
    onClick?.(event);
  }, [onClick, event]);

  const startTime = event.is_all_day
    ? null
    : format(parseISO(event.start_at), 'H:mm');
  const endTime = event.is_all_day
    ? null
    : format(parseISO(event.end_at), 'H:mm');

  return (
    <button
      type="button"
      onClick={handleClick}
      style={positioned ? { height, top, position: 'absolute', left: '4px', right: '4px' } : undefined}
      className={clsx(
        'w-full rounded-md border-l-[3px] px-2 py-1 text-left text-xs',
        'transition-opacity duration-150 hover:opacity-80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        'overflow-hidden cursor-pointer',
        colorClasses.bg,
        colorClasses.border,
        positioned && 'absolute z-10',
      )}
    >
      <p className={clsx('truncate font-medium', colorClasses.text)}>
        {event.title}
      </p>
      {startTime && endTime && (
        <p className="truncate text-text-tertiary">
          {startTime} - {endTime}
        </p>
      )}
    </button>
  );
});
