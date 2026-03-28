'use client';

import { useCallback } from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from '@todome/store';

type Props = {
  value: number | null;
  onChange: (rating: number | null) => void;
};

export function DiaryRating({ value, onChange }: Props) {
  const { t } = useTranslation();
  const handleClick = useCallback(
    (star: number) => {
      onChange(value === star ? null : star);
    },
    [value, onChange],
  );

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-text-secondary mr-2">{t('diary.rating')}</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          className={clsx(
            'p-0.5 rounded transition-colors',
            'hover:scale-110 active:scale-95 transition-transform',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
          )}
          aria-label={t('diary.ratingAria', { star: String(star) })}
        >
          <Star
            className={clsx(
              'h-5 w-5',
              value !== null && star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-text-tertiary',
            )}
          />
        </button>
      ))}
    </div>
  );
}
