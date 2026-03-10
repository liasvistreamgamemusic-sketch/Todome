'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, User, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore, useTranslation } from '@todome/store';
import { useClickOutside } from '@todome/hooks';
import { useSharedCalendars } from '@/hooks/queries';

export function CalendarSelector() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const showPersonalCalendar = useCalendarStore((s) => s.showPersonalCalendar);
  const hiddenSharedCalendarIds = useCalendarStore((s) => s.hiddenSharedCalendarIds);
  const setShowPersonalCalendar = useCalendarStore((s) => s.setShowPersonalCalendar);
  const toggleSharedCalendarVisibility = useCalendarStore((s) => s.toggleSharedCalendarVisibility);

  const { data: sharedCalendars = [] } = useSharedCalendars();

  useClickOutside(panelRef, () => setOpen(false));

  const toggleOpen = useCallback(() => setOpen((v) => !v), []);

  const visibleCount = (showPersonalCalendar ? 1 : 0) +
    sharedCalendars.filter((c) => !hiddenSharedCalendarIds.has(c.id)).length;
  const totalCount = 1 + sharedCalendars.length;

  const buttonRect = buttonRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={clsx(
          'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
          'border border-[var(--border)] text-text-secondary',
          'hover:bg-bg-secondary transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
          open && 'bg-bg-secondary',
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        <span className="hidden md:inline">
          {visibleCount}/{totalCount}
        </span>
        <ChevronDown className={clsx('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && buttonRect && createPortal(
        <div
          ref={panelRef}
          className="fixed z-50 w-64 rounded-lg border border-[var(--border)] bg-bg-primary shadow-lg py-1"
          style={{
            top: buttonRect.bottom + 4,
            left: Math.min(buttonRect.left, window.innerWidth - 272),
          }}
        >
          <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            {t('calendar.selector')}
          </div>

          {/* Personal calendar */}
          <CalendarRow
            icon={<User className="h-3.5 w-3.5" />}
            color="var(--accent)"
            label={t('calendar.personal')}
            checked={showPersonalCalendar}
            onChange={() => setShowPersonalCalendar(!showPersonalCalendar)}
          />

          {/* Shared calendars */}
          {sharedCalendars.length > 0 && (
            <>
              <div className="border-t border-[var(--border)] my-1" />
              <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                {t('calendar.shared')}
              </div>
              {sharedCalendars.map((cal) => (
                <CalendarRow
                  key={cal.id}
                  icon={<Users className="h-3.5 w-3.5" />}
                  color={cal.color}
                  label={cal.title}
                  checked={!hiddenSharedCalendarIds.has(cal.id)}
                  onChange={() => toggleSharedCalendarVisibility(cal.id)}
                />
              ))}
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

function CalendarRow({
  icon,
  color,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-bg-secondary transition-colors"
    >
      <span
        className={clsx(
          'flex h-5 w-5 items-center justify-center rounded shrink-0 transition-opacity',
          !checked && 'opacity-30',
        )}
        style={{ color }}
      >
        {icon}
      </span>
      <span
        className={clsx(
          'flex-1 text-left truncate text-text-primary transition-opacity',
          !checked && 'opacity-50',
        )}
      >
        {label}
      </span>
      <span
        className={clsx(
          'h-3 w-3 rounded-full shrink-0 border-2 transition-all',
          checked
            ? 'border-transparent'
            : 'border-text-tertiary bg-transparent',
        )}
        style={checked ? { backgroundColor: color } : undefined}
      />
    </button>
  );
}
