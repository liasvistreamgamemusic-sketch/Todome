'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  showTimePicker?: boolean;
  locale?: 'en' | 'ja';
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
};

const weekDaysEn = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const weekDaysJa = ['\u65E5', '\u6708', '\u706B', '\u6C34', '\u6728', '\u91D1', '\u571F'] as const;

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date...',
  label,
  error,
  minDate,
  maxDate,
  showTimePicker = false,
  locale = 'en',
  disabled = false,
  className,
  wrapperClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ?? new Date());
  const [hours, setHoursState] = useState(value ? getHours(value) : 0);
  const [minutes, setMinutesState] = useState(value ? getMinutes(value) : 0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const inputId = label ? `date-picker-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined;
  const dateLocale = locale === 'ja' ? ja : undefined;
  const weekDays = locale === 'ja' ? weekDaysJa : weekDaysEn;

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calStart;
    while (!isAfter(day, calEnd)) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [viewDate]);

  const isDateDisabled = useCallback(
    (date: Date) => {
      if (minDate && isBefore(date, startOfMonth(minDate)) && !isSameMonth(date, minDate)) return true;
      if (minDate && isBefore(date, minDate)) return true;
      if (maxDate && isAfter(date, maxDate)) return true;
      return false;
    },
    [minDate, maxDate],
  );

  const openPopup = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setViewDate(value ?? new Date());
    if (value) {
      setHoursState(getHours(value));
      setMinutesState(getMinutes(value));
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [disabled, value]);

  const closePopup = useCallback(() => {
    setOpen(false);
  }, []);

  const selectDate = useCallback(
    (date: Date) => {
      if (isDateDisabled(date)) return;
      let newDate = date;
      if (showTimePicker) {
        newDate = setMinutes(setHours(date, hours), minutes);
      }
      onChange?.(newDate);
      if (!showTimePicker) {
        closePopup();
      }
    },
    [onChange, closePopup, showTimePicker, hours, minutes, isDateDisabled],
  );

  const handleTimeChange = useCallback(
    (newHours: number, newMinutes: number) => {
      setHoursState(newHours);
      setMinutesState(newMinutes);
      if (value) {
        onChange?.(setMinutes(setHours(value, newHours), newMinutes));
      }
    },
    [value, onChange],
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closePopup();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopup();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, closePopup]);

  const formatValue = () => {
    if (!value) return '';
    const dateStr = format(value, locale === 'ja' ? 'yyyy/MM/dd' : 'MMM d, yyyy', {
      locale: dateLocale,
    });
    if (showTimePicker) {
      return `${dateStr} ${format(value, 'HH:mm')}`;
    }
    return dateStr;
  };

  return (
    <div className={clsx('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        onClick={open ? closePopup : openPopup}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={clsx(
          'flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm',
          'bg-bg-primary border border-[var(--border)]',
          'transition-colors duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
          'disabled:pointer-events-none disabled:opacity-50',
          error && 'border-[#D32F2F] focus-visible:ring-[#D32F2F]',
          className,
        )}
      >
        <Calendar className="h-4 w-4 text-text-tertiary shrink-0" />
        <span
          className={clsx(
            'flex-1 text-left truncate',
            value ? 'text-text-primary' : 'text-text-tertiary',
          )}
        >
          {formatValue() || placeholder}
        </span>
      </button>

      {error && (
        <p id={`${inputId}-error`} className="text-xs text-[#D32F2F]" role="alert">
          {error}
        </p>
      )}

      {open && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label="Date picker"
            className={clsx(
              'rounded-xl bg-bg-primary p-4 shadow-xl',
              'border border-[var(--border)]',
              'animate-in fade-in slide-in-from-top-1 duration-150',
            )}
            style={{
              position: 'absolute',
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 9999,
            }}
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewDate(subMonths(viewDate, 1))}
                className="rounded-md p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-text-primary">
                {format(viewDate, locale === 'ja' ? 'yyyy\u5E74 M\u6708' : 'MMMM yyyy', {
                  locale: dateLocale,
                })}
              </span>
              <button
                type="button"
                onClick={() => setViewDate(addMonths(viewDate, 1))}
                className="rounded-md p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="flex items-center justify-center h-8 text-xs font-medium text-text-tertiary"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7" role="grid" aria-label="Calendar">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, viewDate);
                const isSelected = value ? isSameDay(day, value) : false;
                const isToday = isSameDay(day, new Date());
                const isDisabled = isDateDisabled(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => selectDate(day)}
                    disabled={isDisabled}
                    aria-selected={isSelected}
                    aria-label={format(day, 'PPPP', { locale: dateLocale })}
                    className={clsx(
                      'flex items-center justify-center h-8 w-8 rounded-md text-sm',
                      'transition-colors duration-100 ease-out',
                      !isCurrentMonth && 'text-text-tertiary/40',
                      isCurrentMonth && !isSelected && 'text-text-primary hover:bg-bg-secondary',
                      isSelected && 'bg-[var(--accent)] text-white font-medium',
                      isToday && !isSelected && 'font-bold',
                      isDisabled && 'opacity-30 cursor-not-allowed',
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Time picker */}
            {showTimePicker && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2 justify-center">
                <label className="text-xs text-text-secondary">Time:</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hours.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const h = Math.min(23, Math.max(0, Number(e.target.value)));
                    handleTimeChange(h, minutes);
                  }}
                  className="w-12 rounded-md border border-[var(--border)] bg-bg-primary px-2 py-1 text-center text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  aria-label="Hours"
                />
                <span className="text-text-tertiary font-medium">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const m = Math.min(59, Math.max(0, Number(e.target.value)));
                    handleTimeChange(hours, m);
                  }}
                  className="w-12 rounded-md border border-[var(--border)] bg-bg-primary px-2 py-1 text-center text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  aria-label="Minutes"
                />
              </div>
            )}

            {/* Today button */}
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setViewDate(today);
                  selectDate(today);
                }}
                className="text-xs text-[var(--accent)] hover:underline transition-colors"
              >
                {locale === 'ja' ? '\u4ECA\u65E5' : 'Today'}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
