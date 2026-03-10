'use client';

import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Pin, MoreVertical, Archive, ArchiveRestore, FolderOpen, Trash2, FileText, FileDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useDraggable } from '@dnd-kit/core';
import { useTranslation } from '@todome/store';
import type { NoteSummary, Folder } from '@todome/store';
import { formatRelativeDate } from '@/lib/format-date';

type NoteCardProps = {
  note: NoteSummary;
  isActive: boolean;
  folders: Folder[];
  isArchiveView?: boolean;
  onClick: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
  onExportText: (id: string) => void;
  onExportPdf: (id: string) => void;
};

export const NoteCard = memo(function NoteCard({
  note,
  isActive,
  folders,
  isArchiveView,
  onClick,
  onContextMenu,
  onPin,
  onArchive,
  onRestore,
  onDelete,
  onMoveToFolder,
  onExportText,
  onExportPdf,
}: NoteCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: note.id });

  const [open, setOpen] = useState(false);
  const [folderSub, setFolderSub] = useState(false);
  const [exportSub, setExportSub] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const previewText = (note.plain_text ?? '').slice(0, 100).replace(/\n/g, ' ');

  const closeMenu = useCallback(() => {
    setOpen(false);
    setFolderSub(false);
    setExportSub(false);
  }, []);

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
      ref={setDragRef}
      {...attributes}
      className={clsx(
        'w-full text-left rounded-lg border border-border p-3 group relative',
        'transition-colors duration-100 cursor-pointer select-none',
        'hover:bg-bg-secondary',
        isActive && 'bg-bg-tertiary ring-1 ring-accent',
        isDragging && 'opacity-50',
      )}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      onClick={() => onClick(note.id)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(note.id)}
      onContextMenu={(e) => onContextMenu(e, note.id)}
      {...listeners}
    >
      <div className="flex items-center gap-1 pr-6">
        {note.is_pinned && <Pin className="h-3 w-3 text-text-secondary shrink-0 fill-current" />}
        <span className="text-sm font-semibold text-text-primary truncate block">
          {note.title || t('notes.untitled')}
        </span>
      </div>

      <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
        {previewText || t('notes.noContent')}
      </p>

      <div className="flex items-center justify-end mt-2">
        <span className="text-[10px] text-text-tertiary whitespace-nowrap">
          {formatRelativeDate(note.updated_at)}
        </span>
      </div>

      {/* 3-dot trigger */}
      <button
        ref={btnRef}
        type="button"
        aria-label={t('notes.menu')}
        onClick={handleMenuBtn}
        className={clsx(
          'absolute right-2 top-2 p-2 md:p-1 rounded z-10',
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
          className="absolute right-0 top-8 w-44 bg-bg-primary border border-border rounded-lg shadow-xl z-50 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {isArchiveView && onRestore ? (
            <>
              <button type="button" onClick={act(() => onRestore(note.id))}
                className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
                <ArchiveRestore className="h-4 w-4" />
                {t('common.restore')}
              </button>
              <div className="border-t border-border my-1" />
              <button type="button" onClick={act(() => onDelete(note.id))}
                className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2 text-red-500">
                <Trash2 className="h-4 w-4" />
                {t('common.deletePermanently')}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={act(() => onPin(note.id))}
                className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
                <Pin className="h-4 w-4" />
                {note.is_pinned ? t('notes.unpin') : t('notes.pin')}
              </button>
              <button type="button" onClick={act(() => onArchive(note.id))}
                className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
                <Archive className="h-4 w-4" />
                {t('notes.archive')}
              </button>

              <div className="relative">
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setFolderSub((v) => !v); setExportSub(false); }}
                  className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />{t('notes.moveToFolder')}
                  <span className="ml-auto text-text-tertiary">›</span>
                </button>
                {folderSub && (
                  <div className="absolute left-0 top-full md:right-full md:top-0 md:left-auto mr-1 w-40 bg-bg-primary border border-border rounded-lg shadow-xl z-50 py-1">
                    <button type="button" onClick={act(() => onMoveToFolder(note.id, null))}
                      className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary">{t('notes.uncategorized')}</button>
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

              <div className="relative">
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setExportSub((v) => !v); setFolderSub(false); }}
                  className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
                  <FileDown className="h-4 w-4" />{t('notes.output')}
                  <span className="ml-auto text-text-tertiary">›</span>
                </button>
                {exportSub && (
                  <div className="absolute left-0 top-full md:right-full md:top-0 md:left-auto mr-1 w-44 bg-bg-primary border border-border rounded-lg shadow-xl z-50 py-1">
                    <button type="button" onClick={act(() => onExportText(note.id))}
                      className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
                      <FileText className="h-4 w-4" />{t('notes.exportText')}
                    </button>
                    <button type="button" onClick={act(() => onExportPdf(note.id))}
                      className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2">
                      <FileDown className="h-4 w-4" />{t('notes.exportPdf')}
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-border my-1" />
              <button type="button" onClick={act(() => onDelete(note.id))}
                className="w-full text-left px-3 py-2.5 md:py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2 text-red-500">
                <Trash2 className="h-4 w-4" />{t('common.delete')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});
