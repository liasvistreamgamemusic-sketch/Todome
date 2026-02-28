'use client';

import { clsx } from 'clsx';
import { X } from 'lucide-react';

type Props = {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md';
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
};

const variantStyles = {
  default: 'bg-bg-tertiary text-text-secondary',
  primary: 'bg-[var(--accent)]/15 text-[var(--accent)]',
  success: 'bg-[#388E3C]/15 text-[#388E3C]',
  danger: 'bg-[#D32F2F]/15 text-[#D32F2F]',
  warning: 'bg-[#F57C00]/15 text-[#F57C00]',
} as const;

const sizeStyles = {
  sm: 'h-5 px-1.5 text-xs gap-1',
  md: 'h-6 px-2 text-xs gap-1.5',
} as const;

export function Badge({
  variant = 'default',
  size = 'md',
  onRemove,
  children,
  className,
}: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        'transition-colors duration-150 ease-out',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
          aria-label="Remove"
        >
          <X className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        </button>
      )}
    </span>
  );
}
