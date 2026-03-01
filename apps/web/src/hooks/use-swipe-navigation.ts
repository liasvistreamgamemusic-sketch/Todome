'use client';

import { useCallback, useRef } from 'react';

type SwipeHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
};

const SWIPE_THRESHOLD = 60;

export function useSwipeNavigation(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
): SwipeHandlers {
  const startRef = useRef({ x: 0, y: 0 });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      startRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - startRef.current.x;
      const dy = Math.abs(touch.clientY - startRef.current.y);

      // Only trigger if horizontal movement exceeds threshold
      // and vertical movement is less than horizontal (not a scroll)
      if (Math.abs(dx) >= SWIPE_THRESHOLD && dy < Math.abs(dx)) {
        if (dx < 0) onSwipeLeft();
        else onSwipeRight();
      }
    },
    [onSwipeLeft, onSwipeRight],
  );

  return { onTouchStart, onTouchEnd };
}
