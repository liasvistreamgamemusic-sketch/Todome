/**
 * Deduplicate events across personal, external, and shared calendars.
 * When the same event (matching title + start_at + end_at) exists in both
 * personal and shared calendars, keep only the personal copy.
 * Among shared calendars, keep only the first occurrence.
 */
export function deduplicateEvents<T extends { title: string; start_at: string; end_at: string; isShared?: boolean }>(
  events: T[],
): T[] {
  const seen = new Set<string>();

  // First pass: mark non-shared events as seen
  for (const e of events) {
    if (!e.isShared) {
      seen.add(`${e.title}|${e.start_at}|${e.end_at}`);
    }
  }

  // Second pass: filter out shared duplicates
  return events.filter((e) => {
    if (!e.isShared) return true;
    const key = `${e.title}|${e.start_at}|${e.end_at}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
