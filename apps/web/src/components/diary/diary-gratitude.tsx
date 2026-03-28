'use client';

import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  value: string[];
  onChange: (gratitude: string[]) => void;
  onCompositionStart?: () => void;
  onCompositionEnd?: () => void;
};

const MAX_ITEMS = 10;
const DEFAULT_SLOTS = 3;

export function DiaryGratitude({ value, onChange, onCompositionStart, onCompositionEnd }: Props) {
  const slots = Math.max(DEFAULT_SLOTS, value.length);

  const handleChange = useCallback(
    (index: number, text: string) => {
      const next = [...value];
      while (next.length <= index) next.push('');
      next[index] = text;
      onChange(next);
    },
    [value, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const next = value.filter((_, i) => i !== index);
      onChange(next);
    },
    [value, onChange],
  );

  const handleAdd = useCallback(() => {
    if (value.length < MAX_ITEMS) {
      onChange([...value, '']);
    }
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-text-secondary">感謝</span>
      <div className="space-y-1.5">
        {Array.from({ length: slots }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary w-4 text-right shrink-0">
              {i + 1}.
            </span>
            <input
              type="text"
              value={value[i] ?? ''}
              onChange={(e) => handleChange(i, e.target.value)}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={onCompositionEnd}
              placeholder="今日感謝したこと..."
              className={clsx(
                'flex-1 text-sm bg-transparent border-b border-[var(--border)] outline-none',
                'text-text-primary placeholder:text-text-tertiary',
                'focus:border-[var(--accent)] transition-colors',
                'py-1',
              )}
            />
            {i >= DEFAULT_SLOTS && (
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="p-0.5 rounded text-text-tertiary hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      {slots < MAX_ITEMS && (
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-[var(--accent)] transition-colors"
        >
          <Plus className="h-3 w-3" />
          追加
        </button>
      )}
    </div>
  );
}
