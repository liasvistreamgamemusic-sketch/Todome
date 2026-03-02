'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  Plus, List, LayoutGrid, ArrowUpDown,
  FolderPlus, Check, X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNoteStore } from '@todome/store';
import type { NoteSortBy } from '@todome/store';
import type { Note, Folder } from '@todome/db';
import { useKeyboardShortcut, useClickOutside } from '@todome/hooks';
import {
  useNotes, useFolders, useCreateNote, useUpdateNote,
  useDeleteNote, useCreateFolder, useUserId,
} from '@/hooks/queries';
import { filterAndSortNotes } from '@/lib/note-filters';
import { NoteListItem } from './note-list-item';
import { NoteCard } from './note-card';
import { NoteSearch } from './note-search';
import { exportNoteAsText, exportNoteAsPdf } from '../settings/export-data';

const SORT_OPTIONS: { value: NoteSortBy; label: string }[] = [
  { value: 'updated_at', label: '更新日' },
  { value: 'created_at', label: '作成日' },
  { value: 'title', label: 'タイトル' },
  { value: 'manual', label: '手動' },
];

const FOLDER_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

type NoteListProps = {
  onSelectNote?: (id: string) => void;
  onCreateNote?: (id: string) => void;
};

export function NoteList({ onSelectNote, onCreateNote }: NoteListProps = {}) {
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId);
  const selectedFolderId = useNoteStore((s) => s.selectedFolderId);
  const searchQuery = useNoteStore((s) => s.searchQuery);
  const viewMode = useNoteStore((s) => s.viewMode);
  const sortBy = useNoteStore((s) => s.sortBy);
  const noteFilter = useNoteStore((s) => s.noteFilter);
  const selectNote = useNoteStore((s) => s.selectNote);
  const setViewMode = useNoteStore((s) => s.setViewMode);
  const setSortBy = useNoteStore((s) => s.setSortBy);

  const userId = useUserId();
  const { data: allNotes } = useNotes();
  const { data: folders = [] } = useFolders();
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const createFolderMutation = useCreateFolder();

  const isArchiveView = noteFilter === 'archived';

  const notes = useMemo(
    () => filterAndSortNotes(allNotes ?? [], { folderId: selectedFolderId, searchQuery, sortBy, noteFilter }),
    [allNotes, selectedFolderId, searchQuery, sortBy, noteFilter],
  );

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState<string>(FOLDER_COLORS[4] ?? '#3b82f6');

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useClickOutside(sortMenuRef, () => setShowSortMenu(false));

  const { pinned, unpinned } = useMemo(() => {
    const p: Note[] = [], u: Note[] = [];
    for (const n of notes) (n.is_pinned ? p : u).push(n);
    return { pinned: p, unpinned: u };
  }, [notes]);

  const handleNewNote = useCallback(() => {
    if (!userId) return;
    const now = new Date().toISOString();
    const n: Note = {
      id: crypto.randomUUID(), user_id: userId, title: '',
      content: { type: 'doc', content: [] }, plain_text: '',
      folder_id: selectedFolderId, tags: [], is_pinned: false,
      is_archived: false, is_deleted: false,
      created_at: now, updated_at: now, synced_at: null,
    };
    createNoteMutation.mutate(n);
    if (onCreateNote) onCreateNote(n.id);
    else if (onSelectNote) onSelectNote(n.id);
    else selectNote(n.id);
  }, [userId, selectedFolderId, createNoteMutation, selectNote, onSelectNote, onCreateNote]);

  useKeyboardShortcut('cmd+n', handleNewNote);

  const handleCreateFolder = useCallback(() => {
    if (!folderName.trim() || !userId) return;
    const now = new Date().toISOString();
    const f: Folder = {
      id: crypto.randomUUID(), user_id: userId, name: folderName.trim(),
      color: folderColor, icon: null, parent_id: null,
      sort_order: folders.length, created_at: now, updated_at: now,
    };
    createFolderMutation.mutate(f);
    setFolderName('');
    setFolderColor(FOLDER_COLORS[4] ?? '#3b82f6');
    setShowFolderForm(false);
  }, [folderName, folderColor, folders.length, userId, createFolderMutation]);

  const handlePin = useCallback((id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    updateNoteMutation.mutate({ id, patch: { is_pinned: !note.is_pinned } });
  }, [notes, updateNoteMutation]);

  const handleArchive = useCallback((id: string) => {
    updateNoteMutation.mutate({ id, patch: { is_archived: true } });
    if (selectedNoteId === id) selectNote(null);
  }, [updateNoteMutation, selectedNoteId, selectNote]);

  const handleRestore = useCallback((id: string) => {
    updateNoteMutation.mutate({ id, patch: { is_archived: false } });
    if (selectedNoteId === id) selectNote(null);
  }, [updateNoteMutation, selectedNoteId, selectNote]);

  const handleDelete = useCallback((id: string) => {
    deleteNoteMutation.mutate(id);
    if (selectedNoteId === id) selectNote(null);
  }, [deleteNoteMutation, selectedNoteId, selectNote]);

  const handleMoveToFolder = useCallback((id: string, folderId: string | null) => {
    updateNoteMutation.mutate({ id, patch: { folder_id: folderId } });
  }, [updateNoteMutation]);

  const handleExportText = useCallback((id: string) => {
    const note = (allNotes ?? []).find((n) => n.id === id);
    if (note) exportNoteAsText(note);
  }, [allNotes]);

  const handleExportPdf = useCallback((id: string) => {
    const note = (allNotes ?? []).find((n) => n.id === id);
    if (note) exportNoteAsPdf(note);
  }, [allNotes]);

  const handleContextMenu = useCallback((e: React.MouseEvent, _id: string) => {
    e.preventDefault();
  }, []);

  const handleNoteClick = useCallback((id: string) => {
    if (onSelectNote) onSelectNote(id);
    else selectNote(id);
  }, [onSelectNote, selectNote]);

  const itemProps = {
    folders,
    isArchiveView,
    onClick: handleNoteClick,
    onContextMenu: handleContextMenu,
    onPin: handlePin,
    onArchive: handleArchive,
    onRestore: handleRestore,
    onDelete: handleDelete,
    onMoveToFolder: handleMoveToFolder,
    onExportText: handleExportText,
    onExportPdf: handleExportPdf,
  };

  const renderNote = (note: Note) => {
    const props = { ...itemProps, note, isActive: selectedNoteId === note.id };
    return viewMode === 'card'
      ? <NoteCard key={note.id} {...props} />
      : <NoteListItem key={note.id} {...props} />;
  };

  return (
    <div className="w-full md:w-[300px] h-full md:border-r flex flex-col glass md:shrink-0">
      <div className="px-3 pt-3 pb-2 space-y-2 shrink-0">
        <NoteSearch />

        <div className="flex items-center justify-between">
          {isArchiveView ? (
            <span className="text-xs font-medium text-text-secondary">アーカイブ</span>
          ) : (
            <button type="button" onClick={handleNewNote}
              className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors">
              <Plus className="h-3.5 w-3.5" />新規メモ
            </button>
          )}

          <div className="flex items-center gap-1">
            <button type="button" title="フォルダを作成"
              onClick={() => { setShowFolderForm((v) => !v); setTimeout(() => folderInputRef.current?.focus(), 50); }}
              className="p-2 md:p-1 rounded text-text-tertiary hover:bg-bg-secondary transition-colors">
              <FolderPlus className="h-4 w-4 md:h-3.5 md:w-3.5" />
            </button>

            <button type="button"
              onClick={() => setViewMode(viewMode === 'list' ? 'card' : 'list')}
              className="p-2 md:p-1 rounded text-text-tertiary hover:bg-bg-secondary transition-colors"
              title={viewMode === 'list' ? 'カード表示' : 'リスト表示'}>
              {viewMode === 'list' ? <LayoutGrid className="h-4 w-4 md:h-3.5 md:w-3.5" /> : <List className="h-4 w-4 md:h-3.5 md:w-3.5" />}
            </button>

            <div className="relative" ref={sortMenuRef}>
              <button type="button" title="並び替え"
                onClick={() => setShowSortMenu((v) => !v)}
                className="p-2 md:p-1 rounded text-text-tertiary hover:bg-bg-secondary transition-colors">
                <ArrowUpDown className="h-4 w-4 md:h-3.5 md:w-3.5" />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-bg-primary border border-border rounded-lg shadow-lg z-20 py-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                      className={clsx('w-full text-left px-3 py-1.5 text-xs hover:bg-bg-secondary',
                        sortBy === opt.value && 'font-medium text-accent bg-bg-secondary')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showFolderForm && (
          <div className="rounded-lg border border-border bg-bg-secondary p-2 space-y-2">
            <input ref={folderInputRef} type="text" value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setShowFolderForm(false); setFolderName(''); }
              }}
              placeholder="フォルダ名"
              className="w-full text-xs bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {FOLDER_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setFolderColor(c)}
                    className="h-4 w-4 rounded-full transition-all"
                    style={{ backgroundColor: c, outline: folderColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setShowFolderForm(false); setFolderName(''); }}
                  className="p-0.5 rounded text-text-tertiary hover:text-text-primary transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={handleCreateFolder} disabled={!folderName.trim()}
                  className="p-0.5 rounded text-accent hover:text-accent/80 transition-colors disabled:opacity-40">
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <p className="text-text-tertiary text-sm mb-2">
              {isArchiveView ? 'アーカイブされたメモはありません' : 'メモがありません'}
            </p>
            {!isArchiveView && (
              <button type="button" onClick={handleNewNote}
                className="text-xs text-accent hover:text-accent/80 transition-colors">新規メモを作成</button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          <div className="px-3 pb-3 space-y-3">
            {pinned.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary px-1 pt-1">ピン留め</p>
                <div className="grid grid-cols-1 gap-2">{pinned.map(renderNote)}</div>
                {unpinned.length > 0 && <div className="border-t border-border" />}
              </>
            )}
            {unpinned.length > 0 && <div className="grid grid-cols-1 gap-2">{unpinned.map(renderNote)}</div>}
          </div>
        ) : (
          <div>
            {pinned.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary px-3 py-1.5">ピン留め</p>
                {pinned.map(renderNote)}
                {unpinned.length > 0 && <div className="border-t border-border" />}
              </>
            )}
            {unpinned.map(renderNote)}
          </div>
        )}
      </div>
    </div>
  );
}
