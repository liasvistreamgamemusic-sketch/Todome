'use client';

import React from 'react';
import { clsx } from 'clsx';

type Props = {
  label?: string;
  error?: string;
  variant?: 'default' | 'ghost';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>;

export const Input = React.forwardRef<HTMLInputElement, Props>(
  function Input(
    {
      label,
      error,
      variant = 'default',
      leftIcon,
      rightIcon,
      wrapperClassName,
      className,
      id,
      ...rest
    },
    ref,
  ) {
    const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

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
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary [&>svg]:h-4 [&>svg]:w-4">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={clsx(
              'h-9 w-full rounded-lg px-3 text-sm text-text-primary placeholder:text-text-tertiary',
              'transition-colors duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
              'disabled:pointer-events-none disabled:opacity-50',
              variant === 'default'
                ? 'bg-bg-primary border border-[var(--border)]'
                : 'bg-transparent border-none',
              error && 'border-[#D32F2F] focus-visible:ring-[#D32F2F]',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              className,
            )}
            {...rest}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary [&>svg]:h-4 [&>svg]:w-4">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
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
