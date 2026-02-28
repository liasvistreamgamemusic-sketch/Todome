'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Tooltip } from './tooltip';

type Props = {
  icon: React.ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost';
  shape?: 'circle' | 'square';
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

const sizeStyles = {
  sm: 'h-7 w-7 [&>svg]:h-3.5 [&>svg]:w-3.5',
  md: 'h-9 w-9 [&>svg]:h-4 [&>svg]:w-4',
  lg: 'h-11 w-11 [&>svg]:h-5 [&>svg]:w-5',
} as const;

export const IconButton = React.forwardRef<HTMLButtonElement, Props>(
  function IconButton(
    {
      icon,
      label,
      size = 'md',
      variant = 'default',
      shape = 'circle',
      tooltipPosition = 'top',
      className,
      ...rest
    },
    ref,
  ) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <Tooltip content={label} position={tooltipPosition} open={showTooltip}>
        <button
          ref={ref}
          aria-label={label}
          className={clsx(
            'inline-flex items-center justify-center',
            'transition-all duration-150 ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            shape === 'circle' ? 'rounded-full' : 'rounded-lg',
            variant === 'default'
              ? 'bg-bg-secondary text-text-primary border border-[var(--border)] hover:bg-bg-tertiary'
              : 'bg-transparent text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
            sizeStyles[size],
            className,
          )}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          {...rest}
        >
          {icon}
        </button>
      </Tooltip>
    );
  },
);
