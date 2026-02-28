'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useDebounce } from '@todome/hooks';
import { useNoteStore } from '@todome/store';
import type { Note } from '@todome/store';

type SearchResultProps = {
  note: Note;
  query: string;
  onClick: (id: string) => void;
};

/**
 * Highlight matching text within a string by wrapping matches in <mark>.
 */
const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-accent/30 text-text-primary rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

/**
 * Extract surrounding context for a matching query within the plain text.
 */
const getMatchContext = (text: string, query: string, maxLen = 120): string => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) return text.slice(0, maxLen);

  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + (maxLen - 30));
  const slice = text.slice(start, end).replace(/\n/g, ' ');

  return (start > 0 ? '...' : '') + slice + (end < text.length ? '...' : '');
};

function SearchResult({ note, query, onClick }: SearchResultProps) {
  const context = getMatchContext(note.plain_text ?? '', query);

  return (
    <button
      type="button"
      className="w-full text-left px-3 py-2 hover:bg-bg-secondary transition-colors cursor-pointer border-b border-border last:border-b-0"
      onClick={() => onClick(note.id)}
    >
      <div className="text-sm font-medium text-text-primary truncate">
        {highlightText(note.title || '無題のメモ', query)}
      </div>
      <div className="text-xs text-text-secondary mt-0.5 line-clamp-2 leading-relaxed">
        {highlightText(context, query)}
      </div>
    </button>
  );
}

export function NoteSearch() {
  const [inputValue, setInputValue] = useState('');
  const setSearchQuery = useNoteStore((s) => s.setSearchQuery);
  const notes = useNoteStore((s) => s.notes);
  const selectNote = useNoteStore((s) => s.selectNote);

  const debouncedQuery = useDebounce(inputValue, 300);

  // Sync the debounced query value into the store
  useEffect(() => {
    setSearchQuery(debouncedQuery);
  }, [debouncedQuery, setSearchQuery]);

  const query = debouncedQuery.toLowerCase().trim();

  const results = query
    ? notes.filter(
        (n) =>
          !n.is_deleted &&
          !n.is_archived &&
          (n.title.toLowerCase().includes(query) ||
            (n.plain_text ?? '').toLowerCase().includes(query) ||
            n.tags.some((t) => t.toLowerCase().includes(query))),
      )
    : [];

  const handleSelect = useCallback(
    (id: string) => {
      selectNote(id);
    },
    [selectNote],
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    setSearchQuery('');
  }, [setSearchQuery]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="メモを検索..."
          className={clsx(
            'w-full pl-8 pr-8 py-1.5 text-sm rounded-md',
            'bg-bg-secondary border border-border',
            'text-text-primary placeholder:text-text-tertiary',
            'focus:outline-none focus:ring-1 focus:ring-accent',
          )}
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {query && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-bg-primary border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] text-text-tertiary uppercase tracking-wider border-b border-border">
            {results.length}件の結果
          </div>
          {results.map((note) => (
            <SearchResult
              key={note.id}
              note={note}
              query={debouncedQuery}
              onClick={handleSelect}
            />
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-bg-primary border border-border rounded-lg shadow-lg p-4 text-center text-sm text-text-tertiary">
          一致するメモが見つかりません
        </div>
      )}
    </div>
  );
}
