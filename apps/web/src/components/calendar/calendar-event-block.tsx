'use client';

import { memo, useCallback } from 'react';
import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';
import type { CalendarEvent } from '@todome/store';

type Props = {
  event: CalendarEvent;
  height?: string;
  top?: string;
  positioned?: boolean;
  column?: number;
  totalColumns?: number;
  onClick?: (event: CalendarEvent) => void;
};

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '#4285F4': { bg: 'bg-[#4285F4]/20', border: 'border-[#4285F4]/40', text: 'text-[#4285F4]' },
  '#EA4335': { bg: 'bg-[#EA4335]/20', border: 'border-[#EA4335]/40', text: 'text-[#EA4335]' },
  '#FBBC04': { bg: 'bg-[#FBBC04]/25', border: 'border-[#FBBC04]/40', text: 'text-[#9A7400]' },
  '#34A853': { bg: 'bg-[#34A853]/20', border: 'border-[#34A853]/40', text: 'text-[#34A853]' },
  '#FF6D01': { bg: 'bg-[#FF6D01]/20', border: 'border-[#FF6D01]/40', text: 'text-[#FF6D01]' },
  '#46BDC6': { bg: 'bg-[#46BDC6]/20', border: 'border-[#46BDC6]/40', text: 'text-[#46BDC6]' },
  '#7986CB': { bg: 'bg-[#7986CB]/25', border: 'border-[#7986CB]/40', text: 'text-[#7986CB]' },
  '#E67C73': { bg: 'bg-[#E67C73]/20', border: 'border-[#E67C73]/40', text: 'text-[#E67C73]' },
};

const DEFAULT_COLOR = { bg: 'bg-[#4285F4]/20', border: 'border-[#4285F4]/40', text: 'text-[#4285F4]' };

const getColorClasses = (color: string | null) => {
  if (!color) return DEFAULT_COLOR;
  return EVENT_COLORS[color] ?? DEFAULT_COLOR;
};

export const CalendarEventBlock = memo(function CalendarEventBlock({
  event,
  height,
  top,
  positioned = false,
  column = 0,
  totalColumns = 1,
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

  const positionedStyle = positioned
    ? {
        height,
        top,
        position: 'absolute' as const,
        left: `calc(${(column / totalColumns) * 100}% + 1px)`,
        width: `calc(${(1 / totalColumns) * 100}% - 2px)`,
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={handleClick}
      style={positionedStyle}
      className={clsx(
        'rounded-md px-1.5 py-0.5 text-left text-xs',
        'transition-opacity duration-150 hover:opacity-80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        'overflow-hidden cursor-pointer',
        colorClasses.bg,
        positioned ? ['absolute z-10 border', colorClasses.border] : 'w-full',
      )}
    >
      <p className={clsx('truncate font-medium leading-tight', colorClasses.text)}>
        {event.title}
      </p>
      {startTime && endTime && (
        <p className={clsx('truncate text-[10px] leading-tight opacity-70', colorClasses.text)}>
          {startTime} - {endTime}
        </p>
      )}
    </button>
  );
});
