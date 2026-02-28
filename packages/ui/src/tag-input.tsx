'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  label?: string;
  error?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
};

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add tag...',
  label,
  error,
  maxTags,
  disabled = false,
  className,
  wrapperClassName,
}: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const inputId = label ? `tag-input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined;

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) &&
      !value.includes(s) &&
      input.length > 0,
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      if (value.includes(trimmed)) return;
      if (maxTags && value.length >= maxTags) return;
      onChange([...value, trimmed]);
      setInput('');
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    },
    [value, onChange, maxTags],
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (activeSuggestion >= 0 && filteredSuggestions[activeSuggestion]) {
          addTag(filteredSuggestions[activeSuggestion]);
        } else {
          addTag(input);
        }
        return;
      }

      if (e.key === 'Backspace' && input === '' && value.length > 0) {
        removeTag(value.length - 1);
        return;
      }

      if (showSuggestions && filteredSuggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveSuggestion((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveSuggestion((prev) =>
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
          );
        } else if (e.key === 'Escape') {
          setShowSuggestions(false);
          setActiveSuggestion(-1);
        }
      }
    },
    [input, value, addTag, removeTag, showSuggestions, filteredSuggestions, activeSuggestion],
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Handle comma-separated input
    if (val.includes(',')) {
      const parts = val.split(',');
      parts.forEach((part) => {
        if (part.trim()) addTag(part);
      });
      return;
    }
    setInput(val);
    setShowSuggestions(true);
    setActiveSuggestion(-1);
  }, [addTag]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <div ref={containerRef} className="relative">
        <div
          className={clsx(
            'flex flex-wrap items-center gap-1.5 rounded-lg px-2 py-1.5',
            'bg-bg-primary border border-[var(--border)]',
            'transition-colors duration-150 ease-out',
            'focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-1',
            error && 'border-[#D32F2F] focus-within:ring-[#D32F2F]',
            disabled && 'opacity-50 pointer-events-none',
            className,
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {value.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1 rounded-md bg-bg-tertiary px-2 py-0.5 text-xs font-medium text-text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="rounded-sm hover:opacity-70 transition-opacity"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => input && setShowSuggestions(true)}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled || (maxTags !== undefined && value.length >= maxTags)}
            className="flex-1 min-w-[80px] bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none py-0.5"
            aria-label={label ?? 'Add tag'}
            aria-autocomplete="list"
            aria-expanded={showSuggestions && filteredSuggestions.length > 0}
            role="combobox"
          />
        </div>

        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            role="listbox"
            className={clsx(
              'absolute left-0 right-0 top-full z-10 mt-1',
              'max-h-40 overflow-y-auto rounded-lg bg-bg-primary p-1 shadow-lg',
              'border border-[var(--border)]',
              'animate-in fade-in slide-in-from-top-1 duration-150',
            )}
          >
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                role="option"
                aria-selected={index === activeSuggestion}
                tabIndex={-1}
                className={clsx(
                  'flex w-full items-center rounded-md px-2.5 py-1.5 text-sm text-text-primary',
                  'transition-colors duration-100 ease-out cursor-pointer',
                  index === activeSuggestion
                    ? 'bg-bg-secondary'
                    : 'hover:bg-bg-secondary',
                )}
                onClick={() => addTag(suggestion)}
                onMouseEnter={() => setActiveSuggestion(index)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p
          className="text-xs text-[#D32F2F]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
