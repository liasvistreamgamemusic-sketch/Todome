'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { Check, Minus } from 'lucide-react';

type Props = {
  label?: string;
  indeterminate?: boolean;
  wrapperClassName?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Checkbox = React.forwardRef<HTMLInputElement, Props>(
  function Checkbox(
    {
      label,
      indeterminate = false,
      wrapperClassName,
      className,
      id,
      checked,
      ...rest
    },
    ref,
  ) {
    const innerRef = useRef<HTMLInputElement | null>(null);
    const checkboxId = id ?? (label ? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
      },
      [ref],
    );

    useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const isChecked = indeterminate || checked;

    return (
      <label
        htmlFor={checkboxId}
        className={clsx(
          'inline-flex items-center gap-2 cursor-pointer select-none',
          rest.disabled && 'pointer-events-none opacity-50',
          wrapperClassName,
        )}
      >
        <span className="relative flex items-center justify-center">
          <input
            ref={setRefs}
            id={checkboxId}
            type="checkbox"
            checked={checked}
            className="peer sr-only"
            {...rest}
          />
          <span
            className={clsx(
              'flex h-4 w-4 items-center justify-center rounded border',
              'transition-all duration-150 ease-out',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)] peer-focus-visible:ring-offset-2',
              isChecked
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                : 'bg-bg-primary border-[var(--border)]',
              className,
            )}
            aria-hidden="true"
          >
            {indeterminate ? (
              <Minus className="h-3 w-3" strokeWidth={3} />
            ) : checked ? (
              <Check className="h-3 w-3" strokeWidth={3} />
            ) : null}
          </span>
        </span>
        {label && (
          <span className="text-sm text-text-primary">{label}</span>
        )}
      </label>
    );
  },
);
