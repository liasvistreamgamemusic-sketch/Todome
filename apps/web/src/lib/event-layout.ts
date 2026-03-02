import { parseISO, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';

/** Minimal event shape required for layout computation. */
export type LayoutEvent = {
  id: string;
  start_at: string;
  end_at: string;
};

export type EventLayout = {
  top: number;
  height: number;
  column: number;
  totalColumns: number;
};

/**
 * Compute overlap-aware layout for timed events in a single day.
 * Uses a greedy column-packing algorithm (same approach as Google Calendar).
 */
export function computeEventLayouts(
  events: LayoutEvent[],
  day: Date,
  hourHeight: number,
): Map<string, EventLayout> {
  const dayS = startOfDay(day);
  const dayE = endOfDay(day);

  // 1. Compute raw positions
  const items = events.map((e) => {
    const eventStart = parseISO(e.start_at);
    const eventEnd = parseISO(e.end_at);
    const clampedStart = eventStart < dayS ? dayS : eventStart;
    const clampedEnd = eventEnd > dayE ? dayE : eventEnd;
    const topMinutes = differenceInMinutes(clampedStart, dayS);
    const durationMinutes = differenceInMinutes(clampedEnd, clampedStart);

    return {
      id: e.id,
      startMin: topMinutes,
      endMin: topMinutes + durationMinutes,
      top: (topMinutes / 60) * hourHeight,
      height: Math.max((durationMinutes / 60) * hourHeight, 20),
    };
  });

  // Sort by start time, then by longer duration first
  items.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

  // 2. Group overlapping events into clusters
  const clusters: (typeof items)[] = [];
  let currentCluster: typeof items = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0 || item.startMin < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMin;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 3. Assign columns within each cluster
  const result = new Map<string, EventLayout>();

  for (const cluster of clusters) {
    const columns: number[] = []; // tracks end time of last event in each column

    for (const item of cluster) {
      // Find first column where this event fits
      let col = 0;
      while (col < columns.length && (columns[col] ?? 0) > item.startMin) {
        col++;
      }
      if (col >= columns.length) columns.push(item.endMin);
      else columns[col] = item.endMin;

      result.set(item.id, {
        top: item.top,
        height: item.height,
        column: col,
        totalColumns: 0, // will be set after all items in cluster are processed
      });
    }

    const totalCols = columns.length;
    for (const item of cluster) {
      const layout = result.get(item.id);
      if (layout) layout.totalColumns = totalCols;
    }
  }

  return result;
}
