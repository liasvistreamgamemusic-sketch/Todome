import { addDays, startOfDay, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns';

export type DateParseResult = {
  cleanTitle: string;
  suggestedDate: Date | null;
};

type DatePattern = {
  regex: RegExp;
  getDate: () => Date;
};

const EN_PATTERNS: DatePattern[] = [
  { regex: /\b(today)\b/i, getDate: () => startOfDay(new Date()) },
  { regex: /\b(tomorrow)\b/i, getDate: () => startOfDay(addDays(new Date(), 1)) },
  { regex: /\b(next week)\b/i, getDate: () => startOfDay(addDays(new Date(), 7)) },
  { regex: /\b(next monday)\b/i, getDate: () => nextMonday(new Date()) },
  { regex: /\b(next tuesday)\b/i, getDate: () => nextTuesday(new Date()) },
  { regex: /\b(next wednesday)\b/i, getDate: () => nextWednesday(new Date()) },
  { regex: /\b(next thursday)\b/i, getDate: () => nextThursday(new Date()) },
  { regex: /\b(next friday)\b/i, getDate: () => nextFriday(new Date()) },
  { regex: /\b(next saturday)\b/i, getDate: () => nextSaturday(new Date()) },
  { regex: /\b(next sunday)\b/i, getDate: () => nextSunday(new Date()) },
];

const JA_PATTERNS: DatePattern[] = [
  { regex: /(今日)/, getDate: () => startOfDay(new Date()) },
  { regex: /(明日)/, getDate: () => startOfDay(addDays(new Date(), 1)) },
  { regex: /(明後日)/, getDate: () => startOfDay(addDays(new Date(), 2)) },
  { regex: /(来週)/, getDate: () => startOfDay(addDays(new Date(), 7)) },
  { regex: /(月曜まで|月曜日まで|月曜)/, getDate: () => nextMonday(new Date()) },
  { regex: /(火曜まで|火曜日まで|火曜)/, getDate: () => nextTuesday(new Date()) },
  { regex: /(水曜まで|水曜日まで|水曜)/, getDate: () => nextWednesday(new Date()) },
  { regex: /(木曜まで|木曜日まで|木曜)/, getDate: () => nextThursday(new Date()) },
  { regex: /(金曜まで|金曜日まで|金曜)/, getDate: () => nextFriday(new Date()) },
  { regex: /(土曜まで|土曜日まで|土曜)/, getDate: () => nextSaturday(new Date()) },
  { regex: /(日曜まで|日曜日まで|日曜)/, getDate: () => nextSunday(new Date()) },
];

export function parseDateFromTitle(
  title: string,
  locale: 'en' | 'ja' = 'en',
): DateParseResult {
  const patterns = locale === 'ja' ? [...JA_PATTERNS, ...EN_PATTERNS] : [...EN_PATTERNS, ...JA_PATTERNS];

  for (const pattern of patterns) {
    const match = title.match(pattern.regex);
    if (match) {
      const cleanTitle = title.replace(match[0], '').replace(/\s+/g, ' ').trim();
      return {
        cleanTitle: cleanTitle || title,
        suggestedDate: pattern.getDate(),
      };
    }
  }

  return { cleanTitle: title, suggestedDate: null };
}
