'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'info' | 'success' | 'error' | 'warning';

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
};

type ToastOptions = {
  type?: ToastType;
  duration?: number;
};

const toastIcons = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
} as const;

const toastStyles = {
  info: 'border-l-[var(--accent)]',
  success: 'border-l-[#388E3C]',
  error: 'border-l-[#D32F2F]',
  warning: 'border-l-[#F57C00]',
} as const;

const toastIconStyles = {
  info: 'text-[var(--accent)]',
  success: 'text-[#388E3C]',
  error: 'text-[#D32F2F]',
  warning: 'text-[#F57C00]',
} as const;

// Global state for toasts
type Listener = () => void;
let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach((l) => l());
}

function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function toast(message: string, options: ToastOptions = {}) {
  const item: ToastItem = {
    id: generateId(),
    type: options.type ?? 'info',
    message,
    duration: options.duration ?? 4000,
  };
  toasts = [...toasts, item];
  emitChange();
  return item.id;
}

toast.success = (message: string, duration?: number) =>
  toast(message, { type: 'success', duration });
toast.error = (message: string, duration?: number) =>
  toast(message, { type: 'error', duration });
toast.warning = (message: string, duration?: number) =>
  toast(message, { type: 'warning', duration });
toast.info = (message: string, duration?: number) =>
  toast(message, { type: 'info', duration });

toast.dismiss = (id: string) => {
  toasts = toasts.filter((t) => t.id !== id);
  emitChange();
};

function useToasts(): ToastItem[] {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return toasts;
}

type ToastEntryProps = {
  item: ToastItem;
  onDismiss: (id: string) => void;
};

function ToastEntry({ item, onDismiss }: ToastEntryProps) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const Icon = toastIcons[item.type];

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(item.id), 200);
  }, [item.id, onDismiss]);

  useEffect(() => {
    if (item.duration > 0) {
      timerRef.current = setTimeout(dismiss, item.duration);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [item.duration, dismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'flex items-start gap-3 rounded-lg bg-bg-primary p-3 shadow-lg',
        'border border-[var(--border)] border-l-4',
        toastStyles[item.type],
        'transition-all duration-200 ease-out',
        exiting
          ? 'opacity-0 translate-x-full'
          : 'opacity-100 translate-x-0 animate-in slide-in-from-right fade-in duration-200',
      )}
    >
      <Icon className={clsx('h-5 w-5 shrink-0 mt-0.5', toastIconStyles[item.type])} />
      <p className="flex-1 text-sm text-text-primary">{item.message}</p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-0.5 text-text-tertiary hover:text-text-primary transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

type ToastContainerProps = {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
};

export function ToastContainer({ position = 'bottom-right' }: ToastContainerProps) {
  const items = useToasts();

  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  } as const;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={clsx(
        'fixed z-50 flex flex-col gap-2 w-80',
        positionStyles[position],
      )}
      aria-label="Notifications"
    >
      {items.map((item) => (
        <ToastEntry
          key={item.id}
          item={item}
          onDismiss={toast.dismiss}
        />
      ))}
    </div>,
    document.body,
  );
}
