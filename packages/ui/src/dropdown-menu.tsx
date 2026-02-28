'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

type MenuItem = {
  type?: 'item';
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
};

type MenuDivider = {
  type: 'divider';
};

type MenuEntry = MenuItem | MenuDivider;

type Props = {
  trigger: React.ReactElement;
  items: MenuEntry[];
  align?: 'start' | 'end';
  className?: string;
};

export function DropdownMenu({ trigger, items, align = 'start', className }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const actionItems = items
    .map((item, idx) => ({ item, idx }))
    .filter((entry): entry is { item: MenuItem; idx: number } =>
      entry.item.type !== 'divider' && !entry.item.disabled,
    );

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) setActiveIndex(-1);
      return !prev;
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: align === 'end'
          ? rect.right + window.scrollX
          : rect.left + window.scrollX,
      });
    }
  }, [open, align]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(true);
          setActiveIndex(0);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const currentPos = actionItems.findIndex((ai) => ai.idx === activeIndex);
          const nextPos = currentPos < actionItems.length - 1 ? currentPos + 1 : 0;
          setActiveIndex(actionItems[nextPos]?.idx ?? -1);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const currentPos = actionItems.findIndex((ai) => ai.idx === activeIndex);
          const prevPos = currentPos > 0 ? currentPos - 1 : actionItems.length - 1;
          setActiveIndex(actionItems[prevPos]?.idx ?? -1);
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const active = items[activeIndex];
          if (active && active.type !== 'divider' && !active.disabled) {
            active.onClick?.();
            close();
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'Home': {
          e.preventDefault();
          setActiveIndex(actionItems[0]?.idx ?? -1);
          break;
        }
        case 'End': {
          e.preventDefault();
          setActiveIndex(actionItems[actionItems.length - 1]?.idx ?? -1);
          break;
        }
      }
    },
    [open, activeIndex, items, actionItems, close],
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </div>
      {open && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            className={clsx(
              'fixed min-w-[180px] rounded-lg glass-sm p-1 shadow-lg',
              'border border-[var(--border)]',
              'animate-fade-in',
              align === 'end' && '-translate-x-full',
              className,
            )}
            style={{
              position: 'absolute',
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 9999,
            }}
            onKeyDown={handleKeyDown}
          >
            {items.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div
                    key={`divider-${index}`}
                    className="my-1 h-px bg-[var(--border)]"
                    role="separator"
                  />
                );
              }

              return (
                <button
                  key={`item-${index}`}
                  role="menuitem"
                  tabIndex={-1}
                  disabled={item.disabled}
                  className={clsx(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-text-primary',
                    'transition-colors duration-100 ease-out',
                    'focus-visible:outline-none',
                    index === activeIndex && 'bg-bg-secondary',
                    item.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-bg-secondary cursor-pointer',
                  )}
                  onClick={() => {
                    item.onClick?.();
                    close();
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {item.icon && (
                    <span className="text-text-tertiary [&>svg]:h-4 [&>svg]:w-4">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <span className="ml-auto text-xs text-text-tertiary">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
