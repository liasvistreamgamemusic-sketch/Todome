'use client';

import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Pin, MoreVertical, Archive, FolderOpen, Trash2, FileText, FileDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { Note, Folder } from '@todome/store';
import { formatRelativeDate } from '@/lib/format-date';

type NoteListItemProps = {
  note: Note;
  isActive: boolean;
  folders: Folder[];
  onClick: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
  onExportText: (id: string) => void;
  onExportPdf: (id: string) => void;
};

const MAX_VISIBLE_TAGS = 3;

export const NoteListItem = memo(function NoteListItem({
  note,
  isActive,
  folders,
  onClick,
  onContextMenu,
  onPin,
  onArchive,
  onDelete,
  onMoveToFolder,
  onExportText,
  onExportPdf,
}: NoteListItemProps) {
  const [open, setOpen] = useState(false);
  const [folderSub, setFolderSub] = useState(false);
  const [exportSub, setExportSub] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const previewText = (note.plain_text ?? '').slice(0, 120).replace(/\n/g, ' ');
  const visibleTags = note.tags.slice(0, MAX_VISIBLE_TAGS);
  const extraTagCount = note.tags.length - MAX_VISIBLE_TAGS;

  const closeMenu = useCallback(() => {
    setOpen(false);
    setFolderSub(false);
    setExportSub(false);
  }, []);

  // close on outside mousedown — registered only while open
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, closeMenu]);

  const handleMenuBtn = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((v) => !v);
    setFolderSub(false);
    setExportSub(false);
  };

  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
    closeMenu();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={clsx(
        'w-full text-left px-3 py-2.5 border-b border-border group relative',
        'transition-colors duration-100 cursor-pointer select-none',
        'hover:bg-bg-secondary',
        isActive && 'bg-bg-tertiary',
      )}
      onClick={() => onClick(note.id)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(note.id)}
      onContextMenu={(e) => onContextMenu(e, note.id)}
    >
      <div className="flex items-start gap-1.5 pr-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {note.is_pinned && <Pin className="h-3 w-3 text-text-secondary shrink-0 fill-current" />}
            <span className="text-sm font-semibold text-text-primary truncate block">
              {note.title || '無題のメモ'}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2 leading-relaxed">
            {previewText || 'メモの内容がありません'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5 pr-6">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {visibleTags.map((tag) => (
            <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-bg-tertiary text-text-secondary truncate max-w-[72px]">
              {tag}
            </span>
          ))}
          {extraTagCount > 0 && <span className="text-[10px] text-text-tertiary">+{extraTagCount}</span>}
        </div>
        <span className="text-[10px] text-text-tertiary whitespace-nowrap ml-2">
          {formatRelativeDate(note.updated_at)}
        </span>
      </div>

      {/* 3-dot trigger */}
      <button
        ref={btnRef}
        type="button"
        aria-label="メニュー"
        onClick={handleMenuBtn}
        className={clsx(
          'absolute right-2 top-1/2 -translate-y-1/2 p-2 md:p-1 rounded z-10',
          'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors',
          'opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100',
          open && 'opacity-100 bg-bg-tertiary text-text-primary',
        )}
      >
        <MoreVertical className="h-4 w-4 md:h-3.5 md:w-3.5" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-44 bg-bg-primary border border-border rounded-lg shadow-xl z-50 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={act(() => onPin(note.id))}
            className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
            <Pin className="h-4 w-4" />
            {note.is_pinned ? 'ピン解除' : 'ピン留め'}
          </button>
          <button type="button" onClick={act(() => onArchive(note.id))}
            className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
            <Archive className="h-4 w-4" />
            アーカイブ
          </button>

          {/* folder sub */}
          <div className="relative">
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setFolderSub((v) => !v); setExportSub(false); }}
              className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              フォルダへ移動
              <span className="ml-auto text-text-tertiary">›</span>
            </button>
            {folderSub && (
              <div className="absolute left-0 top-full md:right-full md:top-0 md:left-auto mr-1 w-40 bg-bg-primary border border-border rounded-lg shadow-xl z-50 py-1">
                <button type="button" onClick={act(() => onMoveToFolder(note.id, null))}
                  className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary">未分類</button>
                {folders.map((f) => (
                  <button key={f.id} type="button" onClick={act(() => onMoveToFolder(note.id, f.id))}
                    className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
                    {f.color && <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />}
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* export sub */}
          <div className="relative">
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setExportSub((v) => !v); setFolderSub(false); }}
              className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              出力
              <span className="ml-auto text-text-tertiary">›</span>
            </button>
            {exportSub && (
              <div className="absolute left-0 top-full md:right-full md:top-0 md:left-auto mr-1 w-44 bg-bg-primary border border-border rounded-lg shadow-xl z-50 py-1">
                <button type="button" onClick={act(() => onExportText(note.id))}
                  className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
                  <FileText className="h-4 w-4" />テキスト (.txt)
                </button>
                <button type="button" onClick={act(() => onExportPdf(note.id))}
                  className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
                  <FileDown className="h-4 w-4" />PDF (印刷)
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-border my-1" />
          <button type="button" onClick={act(() => onDelete(note.id))}
            className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2 text-red-500">
            <Trash2 className="h-4 w-4" />
            削除
          </button>
        </div>
      )}
    </div>
  );
});
