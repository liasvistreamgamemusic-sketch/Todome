'use client';

import React, { useCallback, useRef } from 'react';
import { clsx } from 'clsx';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export const Slider = React.forwardRef<HTMLInputElement, Props>(
  function Slider(
    {
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      showValue = true,
      label,
      disabled = false,
      className,
    },
    ref,
  ) {
    const trackRef = useRef<HTMLDivElement>(null);
    const sliderId = label ? `slider-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined;

    const percentage = ((value - min) / (max - min)) * 100;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(e.target.value));
      },
      [onChange],
    );

    return (
      <div className={clsx('flex flex-col gap-2', className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={sliderId}
                className="text-sm font-medium text-text-secondary"
              >
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm tabular-nums text-text-tertiary">
                {value}
              </span>
            )}
          </div>
        )}
        <div ref={trackRef} className="relative flex items-center h-5">
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-bg-tertiary">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-100 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            ref={ref}
            id={sliderId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={label}
            className={clsx(
              'absolute inset-x-0 h-5 w-full cursor-pointer appearance-none bg-transparent',
              'disabled:pointer-events-none disabled:opacity-50',
              '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
              '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:shadow-md',
              '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
              '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150',
              '[&::-webkit-slider-thumb]:hover:scale-110',
              '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4',
              '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2',
              '[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--accent)]',
              '[&::-moz-range-thumb]:shadow-md',
              'focus-visible:outline-none',
              '[&:focus-visible::-webkit-slider-thumb]:ring-2 [&:focus-visible::-webkit-slider-thumb]:ring-[var(--accent)] [&:focus-visible::-webkit-slider-thumb]:ring-offset-2',
            )}
          />
        </div>
      </div>
    );
  },
);
