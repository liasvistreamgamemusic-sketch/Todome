'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Spinner } from './spinner';

type Props = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const variantStyles = {
  primary:
    'bg-[var(--accent)] text-white hover:opacity-90 active:opacity-80',
  secondary:
    'bg-bg-secondary text-text-primary border border-[var(--border)] hover:bg-bg-tertiary active:opacity-80',
  ghost:
    'bg-transparent text-text-primary hover:bg-bg-secondary active:bg-bg-tertiary',
  danger:
    'bg-[#D32F2F] text-white hover:opacity-90 active:opacity-80',
} as const;

const sizeStyles = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2.5',
} as const;

const iconOnlySizeStyles = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
} as const;

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      iconOnly = false,
      loading = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center rounded-lg font-medium',
          'transition-all duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size],
          className,
        )}
        {...rest}
      >
        {loading ? (
          <>
            <Spinner size={size === 'lg' ? 'md' : 'sm'} />
            {!iconOnly && children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
