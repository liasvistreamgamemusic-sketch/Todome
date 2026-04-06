'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Code2,
  Quote,
  Table,
  ImageIcon,
  Sigma,
  Minus,
} from 'lucide-react';
import { useTranslation } from '@todome/store';
import type { TranslationKey } from '@todome/store';
import { toggleList } from './list-commands';

interface SlashCommandMenuProps {
  editor: Editor | null;
}

interface MenuState {
  open: boolean;
  x: number;
  y: number;
}

interface SlashItem {
  id: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  action: (editor: Editor) => void;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    id: 'text',
    labelKey: 'editor.slashCommand.text',
    icon: Type,
    keywords: ['text', 'paragraph', 'plain', 'テキスト'],
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'heading1',
    labelKey: 'editor.slashCommand.heading1',
    icon: Heading1,
    keywords: ['heading', 'h1', '見出し'],
    action: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    labelKey: 'editor.slashCommand.heading2',
    icon: Heading2,
    keywords: ['heading', 'h2', '見出し'],
    action: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    labelKey: 'editor.slashCommand.heading3',
    icon: Heading3,
    keywords: ['heading', 'h3', '見出し'],
    action: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: 'bulletList',
    labelKey: 'editor.slashCommand.bulletList',
    icon: List,
    keywords: ['bullet', 'list', 'unordered', 'リスト'],
    action: (editor) => toggleList(editor, 'bulletList'),
  },
  {
    id: 'numberedList',
    labelKey: 'editor.slashCommand.numberedList',
    icon: ListOrdered,
    keywords: ['numbered', 'ordered', 'list', '番号'],
    action: (editor) => toggleList(editor, 'orderedList'),
  },
  {
    id: 'taskList',
    labelKey: 'editor.slashCommand.taskList',
    icon: ListChecks,
    keywords: ['task', 'todo', 'checkbox', 'タスク'],
    action: (editor) => toggleList(editor, 'taskList'),
  },
  {
    id: 'codeBlock',
    labelKey: 'editor.slashCommand.codeBlock',
    icon: Code2,
    keywords: ['code', 'block', 'pre', 'コード'],
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'blockquote',
    labelKey: 'editor.slashCommand.blockquote',
    icon: Quote,
    keywords: ['quote', 'blockquote', '引用'],
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'table',
    labelKey: 'editor.slashCommand.table',
    icon: Table,
    keywords: ['table', 'grid', 'テーブル'],
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'image',
    labelKey: 'editor.slashCommand.image',
    icon: ImageIcon,
    keywords: ['image', 'picture', 'photo', '画像'],
    action: (editor) => {
      editor.chain().focus().run();
    },
  },
  {
    id: 'math',
    labelKey: 'editor.slashCommand.math',
    icon: Sigma,
    keywords: ['math', 'equation', 'latex', 'katex', '数式'],
    action: (editor) => {
      editor.chain().focus().insertContent({ type: 'text', text: '$E = mc^2$' }).run();
    },
  },
  {
    id: 'divider',
    labelKey: 'editor.slashCommand.divider',
    icon: Minus,
    keywords: ['divider', 'horizontal', 'rule', 'hr', '区切り'],
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

const initialMenuState: MenuState = { open: false, x: 0, y: 0 };

export const SlashCommandMenu = ({ editor }: SlashCommandMenuProps) => {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<MenuState>(initialMenuState);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef('');
  const listenerAdded = useRef(false);

  const close = useCallback(() => {
    setMenu(initialMenuState);
    setFilter('');
    setSelectedIndex(0);
    filterRef.current = '';
  }, []);

  // Delete the slash text from the current paragraph
  const deleteSlashText = useCallback(() => {
    if (!editor) return;
    const { state } = editor.view;
    const { $from } = state.selection;
    const textContent = $from.parent.textContent;
    if (textContent.startsWith('/')) {
      const start = $from.start();
      const end = start + textContent.length;
      editor.view.dispatch(state.tr.delete(start, end));
    }
  }, [editor]);

  // Execute a menu item action
  const executeItem = useCallback(
    (item: SlashItem) => {
      if (!editor) return;
      deleteSlashText();
      item.action(editor);
      close();
    },
    [editor, deleteSlashText, close],
  );

  // Listen for the custom event from the slash command extension
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x: number; y: number };
      setMenu({ open: true, x: detail.x, y: detail.y + 4 });
      setFilter('');
      setSelectedIndex(0);
      filterRef.current = '';
    };

    window.addEventListener('slash-command:open', handleOpen);
    return () => window.removeEventListener('slash-command:open', handleOpen);
  }, []);

  // Watch editor content to update filter and detect when slash is removed
  useEffect(() => {
    if (!menu.open || !editor) return;

    const handleUpdate = () => {
      const { $from } = editor.state.selection;
      const text = $from.parent.textContent;

      if (!text.startsWith('/')) {
        close();
        return;
      }

      const query = text.slice(1);
      filterRef.current = query;
      setFilter(query);
      setSelectedIndex(0);
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [menu.open, editor, close]);

  // Filter items
  const filteredItems = filter
    ? SLASH_ITEMS.filter((item) => {
        const q = filter.toLowerCase();
        const label = t(item.labelKey).toLowerCase();
        return (
          label.includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.includes(q))
        );
      })
    : SLASH_ITEMS;

  // Keyboard navigation
  useEffect(() => {
    if (!menu.open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        deleteSlashText();
        close();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredItems.length === 0) return;
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredItems.length === 0) return;
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item) executeItem(item);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [menu.open, filteredItems, selectedIndex, executeItem, deleteSlashText, close]);

  // Close when clicking outside
  useEffect(() => {
    if (!menu.open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const timer = setTimeout(() => {
      listenerAdded.current = true;
      window.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (listenerAdded.current) {
        window.removeEventListener('mousedown', handleClick);
        listenerAdded.current = false;
      }
    };
  }, [menu.open, close]);

  if (!menu.open || !editor) return null;

  // Clamp position to viewport
  const menuWidth = 220;
  const menuHeight = Math.min(filteredItems.length * 36 + 8, 320);
  const x = Math.min(menu.x, window.innerWidth - menuWidth - 8);
  const y = menu.y + menuHeight > window.innerHeight
    ? menu.y - menuHeight - 8
    : menu.y;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] w-[220px] max-h-[320px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] shadow-lg py-1 scrollbar-thin"
      style={{ left: x, top: y }}
    >
      {filteredItems.length === 0 ? (
        <div className="px-3 py-4 text-center text-sm text-[var(--text-tertiary)]">
          {t('editor.slashCommand.noResults')}
        </div>
      ) : (
        filteredItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm text-[var(--text-primary)] transition-colors duration-100 cursor-pointer ${
                index === selectedIndex ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]'
              }`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => executeItem(item)}
            >
              <Icon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })
      )}
    </div>,
    document.body,
  );
};
