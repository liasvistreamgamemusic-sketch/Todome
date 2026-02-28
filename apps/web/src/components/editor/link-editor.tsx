'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ExternalLink, Trash2, Check } from 'lucide-react';

interface LinkEditorProps {
  initialUrl: string;
  initialOpenInNewTab: boolean;
  onSubmit: (url: string, openInNewTab: boolean) => void;
  onRemove: () => void;
}

export const LinkEditor = ({
  initialUrl,
  initialOpenInNewTab,
  onSubmit,
  onRemove,
}: LinkEditorProps) => {
  const [url, setUrl] = useState(initialUrl);
  const [openInNewTab, setOpenInNewTab] = useState(initialOpenInNewTab);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (url.trim()) {
        const normalizedUrl =
          url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')
            ? url
            : `https://${url}`;
        onSubmit(normalizedUrl, openInNewTab);
      }
    },
    [url, openInNewTab, onSubmit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onRemove();
      }
    },
    [onRemove],
  );

  return (
    <div className="w-72 p-2">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-1.5 mb-2">
          <ExternalLink size={14} className="text-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            className="flex-1 h-7 px-2 text-xs rounded border border-border bg-bg-secondary text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border accent-accent"
            />
            <span className="text-xs text-text-secondary">Open in new tab</span>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="submit"
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-bg-tertiary text-text-secondary hover:text-success transition-colors"
              title="Apply link"
            >
              <Check size={14} />
            </button>
            {initialUrl && (
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-bg-tertiary text-text-secondary hover:text-danger transition-colors"
                onClick={onRemove}
                title="Remove link"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
