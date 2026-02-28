'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  FileText,
  CheckSquare,
  Calendar,
  Plus,
  Settings,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { useNoteStore, useCalendarStore, useTodoStore, useUiStore } from '@todome/store';
import { useDebounce } from '@todome/hooks';
import { clsx } from 'clsx';

type CommandItem = {
  id: string;
  label: string;
  secondaryText?: string;
  icon: React.ReactNode;
  group: string;
  onSelect: () => void;
};

const fuzzyMatch = (text: string, query: string): boolean => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
};

export const CommandPalette = () => {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);
  const notes = useNoteStore((s) => s.notes);
  const todos = useTodoStore((s) => s.todos);
  const events = useCalendarStore((s) => s.events);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);

  const close = useCallback(() => {
    if (open) {
      toggleCommandPalette();
    }
    setSearch('');
  }, [open, toggleCommandPalette]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  const recentItems = useMemo<CommandItem[]>(() => {
    const recentNotes = [...notes]
      .filter((n) => !n.is_deleted)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 3)
      .map((n): CommandItem => ({
        id: `recent-note-${n.id}`,
        label: n.title || '無題のメモ',
        secondaryText: 'メモ',
        icon: <FileText className="h-4 w-4" />,
        group: '最近のアイテム',
        onSelect: () => {
          router.push(`/notes?id=${n.id}`);
          close();
        },
      }));

    const recentTodos = [...todos]
      .filter((t) => !t.is_deleted)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 2)
      .map((t): CommandItem => ({
        id: `recent-todo-${t.id}`,
        label: t.title,
        secondaryText: 'Todo',
        icon: <CheckSquare className="h-4 w-4" />,
        group: '最近のアイテム',
        onSelect: () => {
          router.push(`/todos?id=${t.id}`);
          close();
        },
      }));

    const recentEvents = [...events]
      .filter((e) => !e.is_deleted)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 2)
      .map((e): CommandItem => ({
        id: `recent-event-${e.id}`,
        label: e.title,
        secondaryText: 'カレンダー',
        icon: <Calendar className="h-4 w-4" />,
        group: '最近のアイテム',
        onSelect: () => {
          router.push(`/calendar?id=${e.id}`);
          close();
        },
      }));

    return [...recentNotes, ...recentTodos, ...recentEvents];
  }, [notes, todos, events, router, close]);

  const noteItems = useMemo<CommandItem[]>(() => {
    return notes
      .filter((n) => !n.is_deleted && !n.is_archived)
      .map((n): CommandItem => ({
        id: `note-${n.id}`,
        label: n.title || '無題のメモ',
        secondaryText: (n.plain_text ?? '').slice(0, 60),
        icon: <FileText className="h-4 w-4" />,
        group: 'メモ',
        onSelect: () => {
          router.push(`/notes?id=${n.id}`);
          close();
        },
      }));
  }, [notes, router, close]);

  const todoItems = useMemo<CommandItem[]>(() => {
    return todos
      .filter((t) => !t.is_deleted)
      .map((t): CommandItem => ({
        id: `todo-${t.id}`,
        label: t.title,
        secondaryText: t.due_date
          ? `期限: ${new Date(t.due_date).toLocaleDateString('ja-JP')}`
          : undefined,
        icon: <CheckSquare className="h-4 w-4" />,
        group: 'Todo',
        onSelect: () => {
          router.push(`/todos?id=${t.id}`);
          close();
        },
      }));
  }, [todos, router, close]);

  const eventItems = useMemo<CommandItem[]>(() => {
    return events
      .filter((e) => !e.is_deleted)
      .map((e): CommandItem => ({
        id: `event-${e.id}`,
        label: e.title,
        secondaryText: new Date(e.start_at).toLocaleDateString('ja-JP'),
        icon: <Calendar className="h-4 w-4" />,
        group: 'カレンダー',
        onSelect: () => {
          router.push(`/calendar?id=${e.id}`);
          close();
        },
      }));
  }, [events, router, close]);

  const actionItems = useMemo<CommandItem[]>(() => [
    {
      id: 'action-new-note',
      label: '新しいメモ',
      icon: <Plus className="h-4 w-4" />,
      group: 'アクション',
      onSelect: () => {
        router.push('/notes?new=true');
        close();
      },
    },
    {
      id: 'action-new-todo',
      label: '新しいTodo',
      icon: <Plus className="h-4 w-4" />,
      group: 'アクション',
      onSelect: () => {
        router.push('/todos?new=true');
        close();
      },
    },
    {
      id: 'action-new-event',
      label: '新しいイベント',
      icon: <Plus className="h-4 w-4" />,
      group: 'アクション',
      onSelect: () => {
        router.push('/calendar?new=true');
        close();
      },
    },
    {
      id: 'action-settings',
      label: '設定',
      icon: <Settings className="h-4 w-4" />,
      group: 'アクション',
      onSelect: () => {
        router.push('/settings');
        close();
      },
    },
    {
      id: 'action-toggle-theme',
      label: theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え',
      icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      group: 'アクション',
      onSelect: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        close();
      },
    },
  ], [router, close, theme, setTheme]);

  const filteredGroups = useMemo(() => {
    const query = debouncedSearch.trim();

    const filterItems = (items: CommandItem[]): CommandItem[] => {
      if (!query) return items;
      return items.filter(
        (item) =>
          fuzzyMatch(item.label, query) ||
          (item.secondaryText && fuzzyMatch(item.secondaryText, query)),
      );
    };

    const groups: { name: string; items: CommandItem[] }[] = [];

    if (!query) {
      const recent = filterItems(recentItems);
      if (recent.length > 0) groups.push({ name: '最近のアイテム', items: recent });
    }

    const filteredNotes = filterItems(noteItems);
    if (filteredNotes.length > 0) groups.push({ name: 'メモ', items: filteredNotes.slice(0, 10) });

    const filteredTodos = filterItems(todoItems);
    if (filteredTodos.length > 0) groups.push({ name: 'Todo', items: filteredTodos.slice(0, 10) });

    const filteredEvents = filterItems(eventItems);
    if (filteredEvents.length > 0) groups.push({ name: 'カレンダー', items: filteredEvents.slice(0, 10) });

    const filteredActions = filterItems(actionItems);
    if (filteredActions.length > 0) groups.push({ name: 'アクション', items: filteredActions });

    return groups;
  }, [debouncedSearch, recentItems, noteItems, todoItems, eventItems, actionItems]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={close}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 top-[20%] mx-auto w-full max-w-lg px-4">
        <Command
          className={clsx(
            'rounded-xl border border-[var(--border)] bg-bg-primary shadow-2xl',
            'overflow-hidden',
          )}
          shouldFilter={false}
        >
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3">
            <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="検索..."
              className={clsx(
                'h-11 w-full bg-transparent text-sm text-text-primary',
                'placeholder:text-text-tertiary',
                'focus-visible:outline-none',
              )}
            />
            <kbd className="shrink-0 rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-tertiary">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto scrollbar-thin p-2">
            <Command.Empty className="py-6 text-center text-sm text-text-tertiary">
              結果が見つかりません
            </Command.Empty>

            {filteredGroups.map((group) => (
              <Command.Group
                key={group.name}
                heading={group.name}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-tertiary"
              >
                {group.items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={item.onSelect}
                    className={clsx(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm',
                      'text-text-primary',
                      'data-[selected=true]:bg-bg-secondary',
                      'transition-colors duration-100',
                    )}
                  >
                    <span className="shrink-0 text-text-tertiary">
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.secondaryText && (
                      <span className="shrink-0 text-xs text-text-tertiary truncate max-w-32">
                        {item.secondaryText}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
