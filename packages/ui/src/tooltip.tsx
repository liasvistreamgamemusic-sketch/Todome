'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

type Props = {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  open?: boolean;
  children: React.ReactElement;
};

const positionStyles = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
} as const;

export function Tooltip({
  content,
  position = 'top',
  delay = 300,
  open: controlledOpen,
  children,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledOpen ?? internalOpen;

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setInternalOpen(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setInternalOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      switch (position) {
        case 'top':
          setCoords({ top: rect.top + scrollY - 8, left: rect.left + scrollX + rect.width / 2 });
          break;
        case 'bottom':
          setCoords({ top: rect.bottom + scrollY + 8, left: rect.left + scrollX + rect.width / 2 });
          break;
        case 'left':
          setCoords({ top: rect.top + scrollY + rect.height / 2, left: rect.left + scrollX - 8 });
          break;
        case 'right':
          setCoords({ top: rect.top + scrollY + rect.height / 2, left: rect.right + scrollX + 8 });
          break;
      }
    } else {
      setCoords(null);
    }
  }, [isOpen, position]);

  const transformOrigin = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  } as const;

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={controlledOpen === undefined ? show : undefined}
        onMouseLeave={controlledOpen === undefined ? hide : undefined}
        onFocus={controlledOpen === undefined ? show : undefined}
        onBlur={controlledOpen === undefined ? hide : undefined}
      >
        {children}
      </span>
      {isOpen && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              transform: transformOrigin[position],
              zIndex: 9999,
            }}
            className={clsx(
              'pointer-events-none rounded-md bg-text-primary px-2.5 py-1.5 text-xs text-bg-primary',
              'shadow-lg',
              'animate-in fade-in duration-150',
            )}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
