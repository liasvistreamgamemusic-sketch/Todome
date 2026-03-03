/** Pixel constants matching month-view.tsx layout. */
const DATE_HEADER_HEIGHT = 28;
const ALL_DAY_LANE_HEIGHT = 18; // barHeight(16) + barGap(2)
const TIMED_EVENT_HEIGHT = 17;
const OVERFLOW_LINK_HEIGHT = 16;
const CELL_PADDING_VERTICAL = 8; // p-1 top + p-1 bottom

const MIN_ALL_DAY_LANES = 1;
const MAX_ALL_DAY_LANES_CAP = 4;

export type CellCapacity = {
  maxAllDayLanes: number;
  maxVisibleEvents: number;
};

/**
 * Given a measured cell height, compute how many all-day lanes and
 * timed events can fit.
 *
 * maxVisibleEvents = allDayLanes + timedSlots — compatible with
 * the existing overflow formula: maxTimedVisible = maxVisibleEvents - layout.laneCount
 */
export function computeMonthCellCapacity(cellHeight: number): CellCapacity {
  if (cellHeight <= 0) {
    return { maxAllDayLanes: 1, maxVisibleEvents: 2 };
  }

  const fixedOverhead = DATE_HEADER_HEIGHT + CELL_PADDING_VERTICAL;
  const available = cellHeight - fixedOverhead - OVERFLOW_LINK_HEIGHT;

  if (available <= 0) {
    return { maxAllDayLanes: 0, maxVisibleEvents: 0 };
  }

  // Start with minimum all-day lanes
  const allDayBaseHeight = MIN_ALL_DAY_LANES * ALL_DAY_LANE_HEIGHT;
  const remainingForTimed = available - allDayBaseHeight;

  const timedSlots = Math.max(1, Math.floor(remainingForTimed / TIMED_EVENT_HEIGHT));

  // Allocate surplus space to extra all-day lanes
  const usedByTimed = timedSlots * TIMED_EVENT_HEIGHT;
  const surplus = available - allDayBaseHeight - usedByTimed;
  const extraLanes = Math.max(0, Math.floor(surplus / ALL_DAY_LANE_HEIGHT));
  const finalAllDayLanes = Math.min(MIN_ALL_DAY_LANES + extraLanes, MAX_ALL_DAY_LANES_CAP);

  return {
    maxAllDayLanes: finalAllDayLanes,
    maxVisibleEvents: finalAllDayLanes + timedSlots,
  };
}
