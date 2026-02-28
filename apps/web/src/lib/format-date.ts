import {
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  isYesterday,
  format,
} from 'date-fns';

/**
 * Format a date string into a Japanese relative time string.
 * - < 1 min:  "今"
 * - < 60 min: "X分前"
 * - < 24 hr:  "X時間前"
 * - yesterday: "昨日"
 * - < 7 days: "X日前"
 * - else:     "YYYY/MM/DD"
 */
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  const minutes = differenceInMinutes(now, date);
  if (minutes < 1) return '今';
  if (minutes < 60) return `${minutes}分前`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}時間前`;

  if (isYesterday(date)) return '昨日';

  const days = differenceInDays(now, date);
  if (days < 7) return `${days}日前`;

  return format(date, 'yyyy/MM/dd');
};
