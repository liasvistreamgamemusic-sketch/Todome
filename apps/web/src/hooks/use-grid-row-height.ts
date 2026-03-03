'use client';

import { useState, useEffect, useCallback, type RefObject } from 'react';

/**
 * Measures the height of a single row in a CSS Grid container
 * with equal-height rows (using `minmax(0, 1fr)`).
 *
 * Returns 0 before the first measurement (SSR / pre-mount).
 */
export const useGridRowHeight = (
  gridRef: RefObject<HTMLDivElement | null>,
  rowCount: number,
): number => {
  const [rowHeight, setRowHeight] = useState(0);

  const measure = useCallback(() => {
    const el = gridRef.current;
    if (!el || rowCount <= 0) return;
    const height = Math.floor(el.clientHeight / rowCount);
    setRowHeight((prev) => (prev === height ? prev : height));
  }, [gridRef, rowCount]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(el);

    return () => observer.disconnect();
  }, [gridRef, measure]);

  return rowHeight;
};
