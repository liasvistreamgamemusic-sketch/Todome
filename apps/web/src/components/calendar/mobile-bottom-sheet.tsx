'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  heightPercent?: number;
};

const CLOSE_THRESHOLD_PX = 120;
const CLOSE_VELOCITY_THRESHOLD = 0.5;
const TRANSITION_TIMING = '300ms cubic-bezier(0.32, 0.72, 0, 1)';

export function MobileBottomSheet({
  isOpen,
  onClose,
  children,
  heightPercent = 66,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);
  const currentDeltaY = useRef(0);

  // Mount/unmount lifecycle for enter/exit animations
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Force a layout read before enabling the transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const applyTransform = useCallback((dy: number, animate: boolean) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const clamped = Math.max(0, dy);
    sheet.style.transition = animate ? `transform ${TRANSITION_TIMING}` : 'none';
    sheet.style.willChange = animate ? 'auto' : 'transform';
    sheet.style.transform = `translateY(${clamped}px)`;
  }, []);

  const close = useCallback(() => {
    applyTransform(window.innerHeight, true);
    onClose();
  }, [applyTransform, onClose]);

  const snapBack = useCallback(() => {
    applyTransform(0, true);
  }, [applyTransform]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollEl = scrollRef.current;
    // Only initiate drag when content is scrolled to top
    if (scrollEl && scrollEl.scrollTop > 0) return;

    dragging.current = true;
    dragStartY.current = e.touches[0]!.clientY;
    dragStartTime.current = Date.now();
    currentDeltaY.current = 0;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging.current) return;

      const dy = e.touches[0]!.clientY - dragStartY.current;

      // If user is swiping up, cancel drag and let scroll take over
      if (dy < 0) {
        dragging.current = false;
        applyTransform(0, false);
        return;
      }

      currentDeltaY.current = dy;
      applyTransform(dy, false);
    },
    [applyTransform],
  );

  const onTouchEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    const dy = currentDeltaY.current;
    const elapsed = Date.now() - dragStartTime.current;
    const velocity = dy / Math.max(elapsed, 1);

    if (dy > CLOSE_THRESHOLD_PX || velocity > CLOSE_VELOCITY_THRESHOLD) {
      close();
    } else {
      snapBack();
    }
  }, [close, snapBack]);

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/30 transition-opacity',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transitionDuration: '300ms' }}
        onClick={close}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-bg-primary shadow-xl"
        style={{
          height: `${heightPercent}vh`,
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${TRANSITION_TIMING}`,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-text-tertiary/40" />
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="overflow-y-auto overscroll-contain"
          style={{ height: `calc(100% - 24px)` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
