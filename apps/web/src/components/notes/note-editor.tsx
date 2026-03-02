'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Menu,
  Pin,
  PinOff,
  Archive,
  Trash2,
  MoreHorizontal,
  FolderOpen,
  Save,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNoteStore } from '@todome/store';
import type { Note } from '@todome/db';
import { TiptapEditor } from '@/components/editor/tiptap-editor';
import { useNotes, useFolders, useUpdateNote, useDeleteNote, usePurgeNote } from '@/hooks/queries';

type NoteEditorProps = {
  noteId: string;
  onBack?: () => void;
  onMenu?: () => void;
};

type SaveStatus = 'saved' | 'saving' | 'error';

export function NoteEditor({ noteId, onBack, onMenu }: NoteEditorProps) {
  const { data: allNotes } = useNotes();
  const { data: folders = [] } = useFolders();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const purgeNoteMutation = usePurgeNote();
  const selectNote = useNoteStore((s) => s.selectNote);

  const note = allNotes?.find((n) => n.id === noteId) ?? null;

  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNoteIdRef = useRef<string>(noteId);
  // Track the updated_at we last wrote to distinguish our saves from remote changes
  const lastLocalSaveAtRef = useRef<string | null>(null);
  // Track the last updated_at we synced from to detect new remote versions
  const lastSyncedAtRef = useRef<string | null>(null);

  // Check if a note is empty (no title and no content)
  const isNoteEmpty = useCallback((n: Note | null): boolean => {
    if (!n) return true;
    const hasTitle = n.title.trim().length > 0;
    const hasContent = (n.plain_text ?? '').trim().length > 0;
    return !hasTitle && !hasContent;
  }, []);

  // Purge empty note from DB
  const purgeAndPersist = useCallback(
    (id: string) => {
      const targetNote = allNotes?.find((n) => n.id === id) ?? null;
      if (isNoteEmpty(targetNote)) {
        purgeNoteMutation.mutate(id);
      }
    },
    [allNotes, isNoteEmpty, purgeNoteMutation],
  );

  // Sync local state when noteId changes or remote data arrives
  useEffect(() => {
    if (prevNoteIdRef.current !== noteId) {
      purgeAndPersist(prevNoteIdRef.current);
      prevNoteIdRef.current = noteId;
      lastLocalSaveAtRef.current = null;
      lastSyncedAtRef.current = null;
    }
    if (!note) return;

    // Skip if we already synced this exact version
    if (note.updated_at === lastSyncedAtRef.current) return;

    // Skip echo-back from our own save (our save timestamp matches)
    if (note.updated_at === lastLocalSaveAtRef.current) {
      lastSyncedAtRef.current = note.updated_at;
      return;
    }

    // Remote change or initial load — accept it
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setTitle(note.title);
    setTags(note.tags);
    lastSyncedAtRef.current = note.updated_at;
    setSaveStatus('saved');
  }, [noteId, note, purgeAndPersist]);

  // Purge on unmount (when navigating away from notes page)
  useEffect(() => {
    const currentNoteId = noteId;
    return () => {
      // Cannot use hooks in cleanup; use the ref-based approach
      // The purge will happen on next mount or note switch
      void currentNoteId;
    };
  }, [noteId]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setShowFolderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const debouncedSave = useCallback(
    (patch: Partial<Note>) => {
      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const now = new Date().toISOString();
        const fullPatch = { ...patch, updated_at: now };
        lastLocalSaveAtRef.current = now;
        updateNoteMutation.mutate(
          { id: noteId, patch: fullPatch },
          {
            onSuccess: () => setSaveStatus('saved'),
            onError: () => setSaveStatus('error'),
          },
        );
      }, 500);
    },
    [noteId, updateNoteMutation],
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      debouncedSave({ title: newTitle });
    },
    [debouncedSave],
  );

  const handleContentChange = useCallback(
    (content: Record<string, unknown>, plainText: string) => {
      const autoTitle = !title.trim()
        ? plainText.split('\n')[0]?.slice(0, 100) ?? ''
        : undefined;

      debouncedSave({
        content: content as unknown as Note['content'],
        plain_text: plainText,
        ...(autoTitle !== undefined ? { title: autoTitle } : {}),
      });

      if (autoTitle !== undefined) {
        setTitle(autoTitle);
      }
    },
    [debouncedSave, title],
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && tagInput.trim()) {
        e.preventDefault();
        const newTag = tagInput.trim();
        if (!tags.includes(newTag)) {
          const newTags = [...tags, newTag];
          setTags(newTags);
          debouncedSave({ tags: newTags });
        }
        setTagInput('');
      }
      if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
        const newTags = tags.slice(0, -1);
        setTags(newTags);
        debouncedSave({ tags: newTags });
      }
    },
    [tagInput, tags, debouncedSave],
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      const newTags = tags.filter((t) => t !== tag);
      setTags(newTags);
      debouncedSave({ tags: newTags });
    },
    [tags, debouncedSave],
  );

  const handleTogglePin = useCallback(() => {
    updateNoteMutation.mutate({ id: noteId, patch: { is_pinned: !note?.is_pinned } });
  }, [note, noteId, updateNoteMutation]);

  const handleArchive = useCallback(() => {
    updateNoteMutation.mutate({ id: noteId, patch: { is_archived: true } });
    selectNote(null);
  }, [noteId, updateNoteMutation, selectNote]);

  const handleDelete = useCallback(() => {
    deleteNoteMutation.mutate(noteId);
    selectNote(null);
  }, [noteId, deleteNoteMutation, selectNote]);

  const handleMoveToFolder = useCallback(
    (folderId: string | null) => {
      updateNoteMutation.mutate({ id: noteId, patch: { folder_id: folderId } });
      setShowFolderMenu(false);
    },
    [noteId, updateNoteMutation],
  );

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary">
        メモが見つかりません
      </div>
    );
  }

  const currentFolder = folders.find((f) => f.id === note.folder_id);

  return (
    <div className="flex flex-col h-full bg-white/80 dark:bg-black/40 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          {onMenu && (
            <button
              type="button"
              onClick={onMenu}
              className="p-2 rounded-md text-text-secondary hover:bg-bg-secondary transition-colors mr-1"
              aria-label="メモ一覧"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          {onBack && !onMenu && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-md text-text-secondary hover:bg-bg-secondary transition-colors mr-1"
              aria-label="戻る"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {/* Save status */}
          <div className="flex items-center gap-1 text-xs text-text-tertiary mr-2">
            {saveStatus === 'saving' && (
              <>
                <Save className="h-3 w-3 animate-pulse" />
                <span>保存中...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Save className="h-3 w-3" />
                <span>保存済み</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-red-500">保存エラー</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleTogglePin}
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              note.is_pinned
                ? 'text-accent hover:bg-accent/10'
                : 'text-text-tertiary hover:bg-bg-secondary',
            )}
            title={note.is_pinned ? 'ピン解除' : 'ピン留め'}
          >
            {note.is_pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={handleArchive}
            className="p-1.5 rounded-md text-text-tertiary hover:bg-bg-secondary transition-colors"
            title="アーカイブ"
          >
            <Archive className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded-md text-text-tertiary hover:bg-red-500/10 hover:text-red-500 transition-colors"
            title="削除"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {/* More menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu((v) => !v)}
              className="p-1.5 rounded-md text-text-tertiary hover:bg-bg-secondary transition-colors"
              title="その他"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-bg-primary border border-border rounded-lg shadow-lg z-30 py-1">
                <button
                  type="button"
                  onClick={handleTogglePin}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2"
                >
                  <Pin className="h-4 w-4" />
                  {note.is_pinned ? 'ピン解除' : 'ピン留め'}
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2"
                >
                  <Archive className="h-4 w-4" />
                  アーカイブ
                </button>
                <div className="border-t border-border my-1" />
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2 text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                  削除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title & metadata */}
      <div className="px-4 md:px-6 pt-4 shrink-0">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="タイトル"
          className="w-full text-xl md:text-2xl font-bold text-text-primary bg-transparent border-none outline-none placeholder:text-text-tertiary"
        />

        {/* Tags input */}
        <div className="flex items-center flex-wrap gap-1 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-bg-tertiary text-text-secondary"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-text-primary"
              >
                &times;
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={tags.length === 0 ? 'タグを追加...' : ''}
            className="flex-1 min-w-[80px] text-xs bg-transparent border-none outline-none text-text-secondary placeholder:text-text-tertiary py-0.5"
          />
        </div>

        {/* Folder selector */}
        <div className="relative mt-2 mb-2" ref={folderMenuRef}>
          <button
            type="button"
            onClick={() => setShowFolderMenu((v) => !v)}
            className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <FolderOpen className="h-3 w-3" />
            <span>{currentFolder?.name ?? '未分類'}</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {showFolderMenu && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-bg-primary border border-border rounded-lg shadow-lg z-30 py-1">
              <button
                type="button"
                onClick={() => handleMoveToFolder(null)}
                className={clsx(
                  'w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary',
                  !note.folder_id && 'bg-bg-secondary font-medium',
                )}
              >
                未分類
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => handleMoveToFolder(folder.id)}
                  className={clsx(
                    'w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2',
                    note.folder_id === folder.id && 'bg-bg-secondary font-medium',
                  )}
                >
                  {folder.color && (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: folder.color }}
                    />
                  )}
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 px-4 md:px-6 pb-4 md:pb-6 overflow-y-auto">
        <TiptapEditor
          content={note.content}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
}
