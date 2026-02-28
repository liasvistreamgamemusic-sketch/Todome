'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  CheckSquare,
  Calendar,
  Settings,
  Search,
  ChevronRight,
  PanelLeftClose,
} from 'lucide-react';
import { useUiStore } from '@todome/store';
import { useNoteStore } from '@todome/store';
import { clsx } from 'clsx';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/notes', label: 'メモ', icon: FileText },
  { href: '/todos', label: 'Todo', icon: CheckSquare },
  { href: '/calendar', label: 'カレンダー', icon: Calendar },
];

type FolderTreeItemProps = {
  id: string;
  name: string;
  depth: number;
};

const FolderTreeItem = ({ id, name, depth }: FolderTreeItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === `/notes/folders/${id}`;

  return (
    <Link
      href={`/notes/folders/${id}`}
      className={clsx(
        'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition',
        'hover:bg-bg-tertiary',
        isActive
          ? 'bg-bg-tertiary text-text-primary font-medium'
          : 'text-text-secondary',
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <ChevronRight className="h-3 w-3 shrink-0" />
      <span className="truncate">{name}</span>
    </Link>
  );
};

export const Sidebar = () => {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);
  const folders = useNoteStore((s) => s.folders);

  const handleSearchFocus = useCallback(() => {
    toggleCommandPalette();
  }, [toggleCommandPalette]);

  return (
    <aside
      className={clsx(
        'flex h-full flex-col glass border-r transition-[width,opacity] duration-200 ease-out overflow-hidden',
        sidebarOpen ? 'w-sidebar opacity-100' : 'w-0 opacity-0',
      )}
    >
      <div className="flex min-w-[240px] flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/notes" className="text-lg font-bold text-text-primary">
            Todome
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-md p-1 text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary transition"
            aria-label="サイドバーを閉じる"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={handleSearchFocus}
            className="flex w-full items-center gap-2 rounded-md border bg-bg-primary px-3 py-1.5 text-sm text-text-tertiary hover:border-accent transition"
          >
            <Search className="h-3.5 w-3.5" />
            <span>検索...</span>
            <kbd className="ml-auto text-[10px] text-text-tertiary bg-bg-tertiary rounded px-1 py-0.5">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-1">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={clsx(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition',
                      'hover:bg-bg-tertiary',
                      isActive
                        ? 'bg-bg-tertiary text-text-primary font-medium'
                        : 'text-text-secondary',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </Link>

                  {/* Folder tree under notes */}
                  {href === '/notes' && isActive && folders.length > 0 && (
                    <ul className="mt-0.5 space-y-0.5">
                      {folders
                        .filter((f) => f.parent_id === null)
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((folder) => (
                          <li key={folder.id}>
                            <FolderTreeItem
                              id={folder.id}
                              name={folder.name}
                              depth={1}
                            />
                          </li>
                        ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom settings link */}
        <div className="border-t px-3 py-2">
          <Link
            href="/settings"
            className={clsx(
              'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition',
              'hover:bg-bg-tertiary',
              pathname.startsWith('/settings')
                ? 'bg-bg-tertiary text-text-primary font-medium'
                : 'text-text-secondary',
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>設定</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};
