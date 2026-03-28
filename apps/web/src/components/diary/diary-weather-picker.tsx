'use client';

import { useCallback } from 'react';
import { Sun, Cloud, CloudRain, Snowflake, CloudLightning, Wind } from 'lucide-react';
import { clsx } from 'clsx';
import type { DiaryWeather } from '@todome/db';
import { useTranslation } from '@todome/store';

type Props = {
  value: DiaryWeather | null;
  onChange: (weather: DiaryWeather | null) => void;
};

export function DiaryWeatherPicker({ value, onChange }: Props) {
  const { t } = useTranslation();

  const WEATHERS: { key: DiaryWeather; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { key: 'sunny', icon: Sun, label: t('diary.weather.sunny') },
    { key: 'cloudy', icon: Cloud, label: t('diary.weather.cloudy') },
    { key: 'rainy', icon: CloudRain, label: t('diary.weather.rainy') },
    { key: 'snowy', icon: Snowflake, label: t('diary.weather.snowy') },
    { key: 'stormy', icon: CloudLightning, label: t('diary.weather.stormy') },
    { key: 'windy', icon: Wind, label: t('diary.weather.windy') },
  ];
  const handleClick = useCallback(
    (weather: DiaryWeather) => {
      onChange(value === weather ? null : weather);
    },
    [value, onChange],
  );

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-text-secondary mr-2">{t('diary.weather')}</span>
      {WEATHERS.map(({ key, icon: Icon, label }) => (
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
          <Icon className={clsx('h-4 w-4', value === key ? 'text-[var(--accent)]' : 'text-text-secondary')} />
          <span className="text-[9px] text-text-tertiary">{label}</span>
        </button>
      ))}
    </div>
  );
}
