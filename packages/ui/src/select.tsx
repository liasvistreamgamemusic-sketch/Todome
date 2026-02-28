'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { ChevronDown, Check, Search } from 'lucide-react';

type Option = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type Props = {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
};

export const Select = React.forwardRef<HTMLButtonElement, Props>(
  function Select(
    {
      options,
      value,
      onChange,
      placeholder = 'Select...',
      label,
      error,
      searchable = false,
      disabled = false,
      className,
      wrapperClassName,
    },
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({
      top: 0,
      left: 0,
      width: 0,
    });

    const selectId = label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined;

    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }
      },
      [ref],
    );

    const filteredOptions = useMemo(
      () =>
        search
          ? options.filter((opt) =>
              opt.label.toLowerCase().includes(search.toLowerCase()),
            )
          : options,
      [options, search],
    );

    const enabledOptions = useMemo(
      () => filteredOptions.filter((opt) => !opt.disabled),
      [filteredOptions],
    );

    const selectedOption = options.find((opt) => opt.value === value);

    const openMenu = useCallback(() => {
      if (disabled) return;
      setOpen(true);
      setSearch('');
      setActiveIndex(-1);

      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setMenuPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }

      requestAnimationFrame(() => {
        if (searchable) {
          searchRef.current?.focus();
        }
      });
    }, [disabled, searchable]);

    const closeMenu = useCallback(() => {
      setOpen(false);
      setSearch('');
      setActiveIndex(-1);
      triggerRef.current?.focus();
    }, []);

    const selectOption = useCallback(
      (opt: Option) => {
        if (opt.disabled) return;
        onChange?.(opt.value);
        closeMenu();
      },
      [onChange, closeMenu],
    );

    useEffect(() => {
      if (!open) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (
          listRef.current &&
          !listRef.current.contains(e.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node)
        ) {
          closeMenu();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, closeMenu]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!open) {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openMenu();
          }
          return;
        }

        switch (e.key) {
          case 'ArrowDown': {
            e.preventDefault();
            const currentIdx = enabledOptions.findIndex(
              (_, i) => filteredOptions.indexOf(enabledOptions[i]!) === activeIndex,
            );
            const nextIdx = currentIdx < enabledOptions.length - 1 ? currentIdx + 1 : 0;
            const nextOpt = enabledOptions[nextIdx];
            if (nextOpt) setActiveIndex(filteredOptions.indexOf(nextOpt));
            break;
          }
          case 'ArrowUp': {
            e.preventDefault();
            const currentIdx = enabledOptions.findIndex(
              (_, i) => filteredOptions.indexOf(enabledOptions[i]!) === activeIndex,
            );
            const prevIdx = currentIdx > 0 ? currentIdx - 1 : enabledOptions.length - 1;
            const prevOpt = enabledOptions[prevIdx];
            if (prevOpt) setActiveIndex(filteredOptions.indexOf(prevOpt));
            break;
          }
          case 'Enter': {
            e.preventDefault();
            const opt = filteredOptions[activeIndex];
            if (opt && !opt.disabled) selectOption(opt);
            break;
          }
          case 'Escape':
            e.preventDefault();
            closeMenu();
            break;
        }
      },
      [open, activeIndex, filteredOptions, enabledOptions, openMenu, closeMenu, selectOption],
    );

    return (
      <div className={clsx('flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <button
          ref={setRefs}
          id={selectId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          disabled={disabled}
          onClick={open ? closeMenu : openMenu}
          onKeyDown={handleKeyDown}
          className={clsx(
            'flex h-9 w-full items-center justify-between rounded-lg px-3 text-sm',
            'bg-bg-primary border border-[var(--border)]',
            'transition-colors duration-150 ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
            'disabled:pointer-events-none disabled:opacity-50',
            error && 'border-[#D32F2F] focus-visible:ring-[#D32F2F]',
            className,
          )}
        >
          <span
            className={clsx(
              'flex items-center gap-2 truncate',
              !selectedOption && 'text-text-tertiary',
              selectedOption && 'text-text-primary',
            )}
          >
            {selectedOption?.icon}
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown
            className={clsx(
              'h-4 w-4 text-text-tertiary transition-transform duration-150',
              open && 'rotate-180',
            )}
          />
        </button>

        {error && (
          <p
            id={`${selectId}-error`}
            className="text-xs text-[#D32F2F]"
            role="alert"
          >
            {error}
          </p>
        )}

        {open && typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={listRef}
              role="listbox"
              aria-label={label ?? 'Options'}
              className={clsx(
                'overflow-hidden rounded-lg bg-bg-primary shadow-lg',
                'border border-[var(--border)]',
                'animate-in fade-in slide-in-from-top-1 duration-150',
              )}
              style={{
                position: 'absolute',
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                zIndex: 9999,
              }}
              onKeyDown={handleKeyDown}
            >
              {searchable && (
                <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
                  <Search className="h-4 w-4 text-text-tertiary" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setActiveIndex(-1);
                    }}
                    className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
                    placeholder="Search..."
                    aria-label="Search options"
                  />
                </div>
              )}
              <div className="max-h-60 overflow-y-auto p-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-text-tertiary">
                    No results found
                  </div>
                ) : (
                  filteredOptions.map((opt, index) => (
                    <button
                      key={opt.value}
                      role="option"
                      aria-selected={opt.value === value}
                      aria-disabled={opt.disabled}
                      tabIndex={-1}
                      className={clsx(
                        'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm',
                        'transition-colors duration-100 ease-out',
                        index === activeIndex && 'bg-bg-secondary',
                        opt.disabled
                          ? 'opacity-50 cursor-not-allowed text-text-tertiary'
                          : 'text-text-primary hover:bg-bg-secondary cursor-pointer',
                      )}
                      onClick={() => selectOption(opt)}
                      onMouseEnter={() => !opt.disabled && setActiveIndex(index)}
                    >
                      {opt.icon && (
                        <span className="text-text-tertiary [&>svg]:h-4 [&>svg]:w-4">
                          {opt.icon}
                        </span>
                      )}
                      <span className="flex-1 text-left truncate">{opt.label}</span>
                      {opt.value === value && (
                        <Check className="h-4 w-4 text-[var(--accent)]" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  },
);
