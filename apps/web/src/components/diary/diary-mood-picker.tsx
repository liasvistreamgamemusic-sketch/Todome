'use client';

import { useCallback } from 'react';
import { clsx } from 'clsx';
import type { DiaryMood } from '@todome/db';
import { useTranslation } from '@todome/store';

type Props = {
  value: DiaryMood | null;
  onChange: (mood: DiaryMood | null) => void;
};

export function DiaryMoodPicker({ value, onChange }: Props) {
  const { t } = useTranslation();

  const MOODS: { key: DiaryMood; emoji: string; label: string }[] = [
    { key: 'great', emoji: '😄', label: t('diary.mood.great') },
    { key: 'good', emoji: '🙂', label: t('diary.mood.good') },
    { key: 'neutral', emoji: '😐', label: t('diary.mood.neutral') },
    { key: 'bad', emoji: '😟', label: t('diary.mood.bad') },
    { key: 'terrible', emoji: '😢', label: t('diary.mood.terrible') },
  ];
  const handleClick = useCallback(
    (mood: DiaryMood) => {
      onChange(value === mood ? null : mood);
    },
    [value, onChange],
  );

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-text-secondary mr-2">{t('diary.mood')}</span>
      {MOODS.map(({ key, emoji, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => handleClick(key)}
          className={clsx(
            'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all',
            'hover:bg-bg-secondary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            value === key
              ? 'bg-bg-tertiary ring-1 ring-[var(--accent)] scale-110'
              : 'opacity-60 hover:opacity-100',
          )}
          title={label}
        >
          <span className="text-lg">{emoji}</span>
          <span className="text-[9px] text-text-tertiary">{label}</span>
        </button>
      ))}
    </div>
  );
}
