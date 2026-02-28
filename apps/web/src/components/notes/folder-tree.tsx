'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder as FolderIcon,
  Archive,
  Trash2,
  FileText,
  Plus,
  Pencil,
  Palette,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNoteStore } from '@todome/store';
import type { Folder } from '@todome/store';
import { useClickOutside } from '@todome/hooks';

type FolderNodeProps = {
  folder: Folder;
  children: Folder[];
  allFolders: Folder[];
  noteCount: number;
  depth: number;
  selectedFolderId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string | null) => void;
  onToggle: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  getNoteCounts: (folderId: string) => number;
};

function FolderNode({
  folder,
  children,
  allFolders,
  noteCount,
  depth,
  selectedFolderId,
  expandedIds,
  onSelect,
  onToggle,
  onContextMenu,
  getNoteCounts,
}: FolderNodeProps) {
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = children.length > 0;

  return (
    <div>
      <button
        type="button"
        className={clsx(
          'w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded-md',
          'hover:bg-bg-secondary transition-colors cursor-pointer',
          isSelected && 'bg-bg-tertiary font-medium',
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(folder.id)}
        onContextMenu={(e) => onContextMenu(e, folder.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(folder.id);
            }}
            className="shrink-0 p-0.5 hover:bg-bg-tertiary rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-text-tertiary" />
            ) : (
              <ChevronRight className="h-3 w-3 text-text-tertiary" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {folder.color ? (
          <span
            className="inline-block h-3.5 w-3.5 rounded shrink-0"
            style={{ backgroundColor: folder.color }}
          />
        ) : isExpanded ? (
          <FolderOpen className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
        ) : (
          <FolderIcon className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
        )}

        <span className="truncate flex-1 text-left text-text-primary">
          {folder.name}
        </span>

        {noteCount > 0 && (
          <span className="text-[10px] text-text-tertiary tabular-nums shrink-0">
            {noteCount}
          </span>
        )}
      </button>

      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => {
            const grandChildren = allFolders.filter(
              (f) => f.parent_id === child.id,
            );
            return (
              <FolderNode
                key={child.id}
                folder={child}
                children={grandChildren}
                allFolders={allFolders}
                noteCount={getNoteCounts(child.id)}
                depth={depth + 1}
                selectedFolderId={selectedFolderId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggle={onToggle}
                onContextMenu={onContextMenu}
                getNoteCounts={getNoteCounts}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

type FolderContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  folderId: string | null;
};

type FolderTreeProps = {
  onNewFolder?: () => void;
  onEditFolder?: (folderId: string) => void;
};

export function FolderTree({ onNewFolder, onEditFolder }: FolderTreeProps) {
  const folders = useNoteStore((s) => s.folders);
  const notes = useNoteStore((s) => s.notes);
  const selectedFolderId = useNoteStore((s) => s.selectedFolderId);
  const selectFolder = useNoteStore((s) => s.selectFolder);
  const deleteFolder = useNoteStore((s) => s.deleteFolder);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<FolderContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    folderId: null,
  });

  const contextMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(contextMenuRef, () =>
    setContextMenu((s) => ({ ...s, visible: false })),
  );

  // Count notes per folder
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.is_deleted || note.is_archived) continue;
      const key = note.folder_id ?? '__all__';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [notes]);

  const getNoteCounts = useCallback(
    (folderId: string) => noteCounts[folderId] ?? 0,
    [noteCounts],
  );

  const totalActiveNotes = useMemo(
    () => notes.filter((n) => !n.is_deleted && !n.is_archived).length,
    [notes],
  );

  const archivedCount = useMemo(
    () => notes.filter((n) => n.is_archived && !n.is_deleted).length,
    [notes],
  );

  const trashedCount = useMemo(
    () => notes.filter((n) => n.is_deleted).length,
    [notes],
  );

  const rootFolders = useMemo(
    () =>
      folders
        .filter((f) => f.parent_id === null)
        .sort((a, b) => a.sort_order - b.sort_order),
    [folders],
  );

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (id: string | null) => {
      selectFolder(id);
    },
    [selectFolder],
  );

  const handleFolderContextMenu = useCallback(
    (e: React.MouseEvent, folderId: string) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        folderId,
      });
    },
    [],
  );

  const handleRename = useCallback(() => {
    if (contextMenu.folderId && onEditFolder) {
      onEditFolder(contextMenu.folderId);
    }
    setContextMenu((s) => ({ ...s, visible: false }));
  }, [contextMenu.folderId, onEditFolder]);

  const handleDeleteFolder = useCallback(() => {
    if (contextMenu.folderId) {
      deleteFolder(contextMenu.folderId);
    }
    setContextMenu((s) => ({ ...s, visible: false }));
  }, [contextMenu.folderId, deleteFolder]);

  return (
    <div className="flex flex-col h-full text-sm">
      {/* All Notes */}
      <button
        type="button"
        className={clsx(
          'w-full flex items-center gap-1.5 px-2 py-1 rounded-md',
          'hover:bg-bg-secondary transition-colors cursor-pointer',
          selectedFolderId === null && 'bg-bg-tertiary font-medium',
        )}
        onClick={() => handleSelect(null)}
      >
        <FileText className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
        <span className="flex-1 text-left text-text-primary">すべてのメモ</span>
        <span className="text-[10px] text-text-tertiary tabular-nums">
          {totalActiveNotes}
        </span>
      </button>

      {/* Folder list */}
      <div className="flex-1 mt-1 overflow-y-auto min-h-0 space-y-0.5">
        {rootFolders.map((folder) => {
          const childFolders = folders.filter(
            (f) => f.parent_id === folder.id,
          );
          return (
            <FolderNode
              key={folder.id}
              folder={folder}
              children={childFolders}
              allFolders={folders}
              noteCount={getNoteCounts(folder.id)}
              depth={0}
              selectedFolderId={selectedFolderId}
              expandedIds={expandedIds}
              onSelect={handleSelect}
              onToggle={handleToggle}
              onContextMenu={handleFolderContextMenu}
              getNoteCounts={getNoteCounts}
            />
          );
        })}
      </div>

      {/* New folder */}
      {onNewFolder && (
        <button
          type="button"
          onClick={onNewFolder}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors mt-1"
        >
          <Plus className="h-3 w-3" />
          新規フォルダ
        </button>
      )}

      {/* Bottom items */}
      <div className="border-t border-border mt-2 pt-1 space-y-0.5">
        <button
          type="button"
          className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-bg-secondary transition-colors cursor-pointer text-text-secondary"
          onClick={() => {
            // Archive view is handled externally; for now just deselect folder
            handleSelect(null);
          }}
        >
          <Archive className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">アーカイブ</span>
          {archivedCount > 0 && (
            <span className="text-[10px] text-text-tertiary tabular-nums">
              {archivedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-bg-secondary transition-colors cursor-pointer text-text-secondary"
          onClick={() => {
            handleSelect(null);
          }}
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">ゴミ箱</span>
          {trashedCount > 0 && (
            <span className="text-[10px] text-text-tertiary tabular-nums">
              {trashedCount}
            </span>
          )}
        </button>
      </div>

      {/* Context menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed bg-bg-primary border border-border rounded-lg shadow-lg z-50 py-1 w-44"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            onClick={handleRename}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            名前変更
          </button>
          <button
            type="button"
            onClick={handleRename}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2"
          >
            <Palette className="h-4 w-4" />
            色・アイコン変更
          </button>
          <div className="border-t border-border my-1" />
          <button
            type="button"
            onClick={handleDeleteFolder}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-secondary flex items-center gap-2 text-red-500"
          >
            <Trash2 className="h-4 w-4" />
            削除
          </button>
        </div>
      )}
    </div>
  );
}
