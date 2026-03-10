import { useCallback } from 'react';

import { useUiStore } from '../ui-store';
import { en } from './en';
import { ja } from './ja';
import type { TranslationKey } from './ja';

const dictionaries = { ja, en } as const;

/**
 * Lightweight i18n hook. Returns a `t()` function that looks up
 * translations from the dictionary matching the current locale.
 * Supports simple interpolation: t('key', { name: 'value' }) replaces {name} with value.
 */
export function useTranslation(): {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  locale: 'ja' | 'en';
} {
  const locale = useUiStore((s) => s.locale);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = dictionaries[locale] ?? dictionaries.ja;
      let text: string = dict[key] ?? dictionaries.ja[key] ?? key;

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }

      return text;
    },
    [locale],
  );

  return { t, locale };
}

export type { TranslationKey };
