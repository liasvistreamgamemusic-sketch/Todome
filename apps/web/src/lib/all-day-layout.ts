import { parseISO, startOfDay, endOfDay, differenceInCalendarDays } from 'date-fns';

/** Minimal event shape required for all-day spanning layout. */
export type AllDayEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  color: string | null;
  provider?: string;
};

/** A single spanning bar within one week row. */
export type SpanBar = {
  event: AllDayEvent;
  startCol: number;
  colSpan: number;
  lane: number;
  /** True if the actual event start is within this week (show rounded-l). */
  isStart: boolean;
  /** True if the actual event end is within this week (show rounded-r). */
  isEnd: boolean;
};

export type AllDayLayoutResult = {
  spans: SpanBar[];
  /** Number of lanes used (for reserving height). */
  laneCount: number;
  /** Per-day overflow count (events that didn't fit in maxLanes). */
  overflowByCol: number[];
};

/**
 * Compute spanning layout for all-day events within a single week row.
 *
 * Algorithm:
 * 1. Collect all-day events overlapping with the week
 * 2. Compute each event's column span (clamped to week boundaries)
 * 3. Sort by span width desc, then start col asc (place longest bars first)
 * 4. Greedy lane assignment: find first lane where columns are free
 * 5. Events exceeding maxLanes are counted as overflow per day
 */
export function computeAllDayLayout(
  weekDays: Date[],
  allDayEvents: AllDayEvent[],
  maxLanes: number,
): AllDayLayoutResult {
  const cols = weekDays.length;
  if (cols === 0) return { spans: [], laneCount: 0, overflowByCol: [] };

  const weekStart = startOfDay(weekDays[0]!);
  const weekEnd = endOfDay(weekDays[cols - 1]!);

  // 1. Collect events overlapping this week and compute their column range
  type EventSpan = {
    event: AllDayEvent;
    startCol: number;
    endCol: number; // inclusive
    isStart: boolean;
    isEnd: boolean;
  };

  const eventSpans: EventSpan[] = [];

  for (const event of allDayEvents) {
    if (!event.is_all_day) continue;

    const eventStart = startOfDay(parseISO(event.start_at));
    const eventEnd = endOfDay(parseISO(event.end_at));

    // Check overlap with week
    if (eventStart > weekEnd || eventEnd < weekStart) continue;

    // Compute column range (clamped to week)
    const startCol = eventStart < weekStart
      ? 0
      : differenceInCalendarDays(eventStart, weekStart);
    const endCol = eventEnd > weekEnd
      ? cols - 1
      : differenceInCalendarDays(startOfDay(parseISO(event.end_at)), weekStart);

    // Clamp to valid range
    const clampedStart = Math.max(0, Math.min(cols - 1, startCol));
    const clampedEnd = Math.max(clampedStart, Math.min(cols - 1, endCol));

    eventSpans.push({
      event,
      startCol: clampedStart,
      endCol: clampedEnd,
      isStart: eventStart >= weekStart,
      isEnd: endOfDay(parseISO(event.end_at)) <= weekEnd,
    });
  }

  // 2. Sort: longest span first, then earliest start
  eventSpans.sort((a, b) => {
    const spanA = a.endCol - a.startCol;
    const spanB = b.endCol - b.startCol;
    if (spanB !== spanA) return spanB - spanA;
    return a.startCol - b.startCol;
  });

  // 3. Greedy lane assignment
  // lanes[lane][col] = true if occupied
  const lanes: boolean[][] = [];
  const spans: SpanBar[] = [];
  const overflowByCol = new Array<number>(cols).fill(0);

  for (const es of eventSpans) {
    const colSpan = es.endCol - es.startCol + 1;

    // Find first lane where all columns in [startCol, endCol] are free
    let assignedLane = -1;
    for (let lane = 0; lane < lanes.length; lane++) {
      let fits = true;
      for (let c = es.startCol; c <= es.endCol; c++) {
        if (lanes[lane]![c]) {
          fits = false;
          break;
        }
      }
      if (fits) {
        assignedLane = lane;
        break;
      }
    }

    // No existing lane fits — create a new one
    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push(new Array<boolean>(cols).fill(false));
    }

    // Check if this lane exceeds maxLanes
    if (assignedLane >= maxLanes) {
      for (let c = es.startCol; c <= es.endCol; c++) {
        overflowByCol[c] = (overflowByCol[c] ?? 0) + 1;
      }
      continue;
    }

    // Occupy columns in this lane
    for (let c = es.startCol; c <= es.endCol; c++) {
      lanes[assignedLane]![c] = true;
    }

    spans.push({
      event: es.event,
      startCol: es.startCol,
      colSpan,
      lane: assignedLane,
      isStart: es.isStart,
      isEnd: es.isEnd,
    });
  }

  const laneCount = Math.min(lanes.length, maxLanes);

  return { spans, laneCount, overflowByCol };
}
