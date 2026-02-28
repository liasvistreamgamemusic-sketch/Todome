'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Briefcase,
  BookOpen,
  Heart,
  Star,
  Code,
  Music,
  Camera,
  FolderOpen,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNoteStore } from '@todome/store';
import type { Folder } from '@todome/store';
import { useClickOutside } from '@todome/hooks';

const PRESET_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
] as const;

const ICON_OPTIONS = [
  { name: 'folder', icon: FolderOpen },
  { name: 'file', icon: FileText },
  { name: 'briefcase', icon: Briefcase },
  { name: 'book', icon: BookOpen },
  { name: 'heart', icon: Heart },
  { name: 'star', icon: Star },
  { name: 'code', icon: Code },
  { name: 'music', icon: Music },
  { name: 'camera', icon: Camera },
] as const;

type FolderDialogProps = {
  open: boolean;
  onClose: () => void;
  editingFolderId?: string | null;
};

export function FolderDialog({
  open,
  onClose,
  editingFolderId,
}: FolderDialogProps) {
  const folders = useNoteStore((s) => s.folders);
  const addFolder = useNoteStore((s) => s.addFolder);
  const updateFolder = useNoteStore((s) => s.updateFolder);

  const editingFolder = editingFolderId
    ? folders.find((f) => f.id === editingFolderId) ?? null
    : null;

  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>('folder');
  const [parentId, setParentId] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useClickOutside(dialogRef, onClose);

  // Initialize form when opening
  useEffect(() => {
    if (open) {
      if (editingFolder) {
        setName(editingFolder.name);
        setColor(editingFolder.color);
        setIcon(editingFolder.icon);
        setParentId(editingFolder.parent_id);
      } else {
        setName('');
        setColor(null);
        setIcon('folder');
        setParentId(null);
      }
      // Focus name input after short delay for DOM to settle
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [open, editingFolder]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) return;

      if (editingFolder) {
        updateFolder(editingFolder.id, {
          name: trimmedName,
          color,
          icon,
          parent_id: parentId,
          updated_at: new Date().toISOString(),
        });
      } else {
        const now = new Date().toISOString();
        const newFolder: Folder = {
          id: crypto.randomUUID(),
          user_id: '',
          name: trimmedName,
          color,
          icon,
          parent_id: parentId,
          sort_order: folders.length,
          created_at: now,
          updated_at: now,
        };
        addFolder(newFolder);
      }

      onClose();
    },
    [name, color, icon, parentId, editingFolder, folders.length, addFolder, updateFolder, onClose],
  );

  // Available parent folders (exclude self and descendants for editing)
  const parentOptions = editingFolderId
    ? folders.filter((f) => f.id !== editingFolderId)
    : folders;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative bg-bg-primary border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">
            {editingFolder ? 'フォルダを編集' : '新規フォルダ'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-text-tertiary hover:bg-bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="folder-name"
              className="block text-xs font-medium text-text-secondary mb-1"
            >
              名前
            </label>
            <input
              ref={nameInputRef}
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="フォルダ名を入力"
              className={clsx(
                'w-full px-3 py-1.5 text-sm rounded-md',
                'bg-bg-secondary border border-border',
                'text-text-primary placeholder:text-text-tertiary',
                'focus:outline-none focus:ring-1 focus:ring-accent',
              )}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              カラー
            </label>
            <div className="flex items-center gap-2">
              {/* No color option */}
              <button
                type="button"
                onClick={() => setColor(null)}
                className={clsx(
                  'h-7 w-7 rounded-full border-2 transition-all',
                  'bg-bg-tertiary',
                  color === null
                    ? 'border-accent scale-110'
                    : 'border-transparent hover:border-border',
                )}
                title="なし"
              />
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx(
                    'h-7 w-7 rounded-full border-2 transition-all',
                    color === c
                      ? 'border-accent scale-110'
                      : 'border-transparent hover:border-border',
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Icon selector */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              アイコン
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ICON_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setIcon(opt.name)}
                    className={clsx(
                      'p-1.5 rounded-md transition-colors',
                      icon === opt.name
                        ? 'bg-accent/10 text-accent ring-1 ring-accent'
                        : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary',
                    )}
                    title={opt.name}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parent folder */}
          <div>
            <label
              htmlFor="parent-folder"
              className="block text-xs font-medium text-text-secondary mb-1"
            >
              親フォルダ
            </label>
            <select
              id="parent-folder"
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className={clsx(
                'w-full px-3 py-1.5 text-sm rounded-md',
                'bg-bg-secondary border border-border',
                'text-text-primary',
                'focus:outline-none focus:ring-1 focus:ring-accent',
              )}
            >
              <option value="">なし（ルート）</option>
              {parentOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-md text-text-secondary hover:bg-bg-secondary transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={clsx(
                'px-4 py-1.5 text-sm rounded-md font-medium transition-colors',
                name.trim()
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed',
              )}
            >
              {editingFolder ? '保存' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
