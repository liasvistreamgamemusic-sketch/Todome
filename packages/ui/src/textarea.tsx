'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';

type Props = {
  label?: string;
  error?: string;
  autoResize?: boolean;
  wrapperClassName?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(
  function Textarea(
    {
      label,
      error,
      autoResize = true,
      wrapperClassName,
      className,
      id,
      onChange,
      ...rest
    },
    ref,
  ) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const textareaId = id ?? (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }
      },
      [ref],
    );

    const resize = useCallback(() => {
      const el = innerRef.current;
      if (el && autoResize) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    }, [autoResize]);

    useEffect(() => {
      resize();
    }, [resize]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        resize();
        onChange?.(e);
      },
      [resize, onChange],
    );

    return (
      <div className={clsx('flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={setRefs}
          id={textareaId}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          onChange={handleChange}
          className={clsx(
            'w-full rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary',
            'bg-bg-primary border border-[var(--border)]',
            'transition-colors duration-150 ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
            'disabled:pointer-events-none disabled:opacity-50',
            autoResize && 'resize-none overflow-hidden',
            error && 'border-[#D32F2F] focus-visible:ring-[#D32F2F]',
            className,
          )}
          {...rest}
        />
        {error && (
          <p
            id={`${textareaId}-error`}
            className="text-xs text-[#D32F2F]"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
