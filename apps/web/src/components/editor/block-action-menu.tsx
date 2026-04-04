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
} from 'lucide-react';
import { useTranslation } from '@todome/store';
import type { TranslationKey } from '@todome/store';

interface BlockActionMenuProps {
  editor: Editor | null;
}

interface MenuState {
  open: boolean;
  pos: number;
  nodeType: string;
  x: number;
  y: number;
}

const BLOCK_ACTIONS: {
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  action: (editor: Editor, pos: number) => void;
}[] = [
  {
    labelKey: 'editor.blockMenu.text',
    icon: Type,
    action: (editor, pos) => {
      editor.chain().focus().setTextSelection(pos + 1).setParagraph().run();
    },
  },
  {
    labelKey: 'editor.blockMenu.heading1',
    icon: Heading1,
    action: (editor, pos) => {
      editor.chain().focus().setTextSelection(pos + 1).toggleHeading({ level: 1 }).run();
    },
  },
  {
    labelKey: 'editor.blockMenu.heading2',
    icon: Heading2,
    action: (editor, pos) => {
      editor.chain().focus().setTextSelection(pos + 1).toggleHeading({ level: 2 }).run();
    },
  },
  {
    labelKey: 'editor.blockMenu.heading3',
    icon: Heading3,
    action: (editor, pos) => {
      editor.chain().focus().setTextSelection(pos + 1).toggleHeading({ level: 3 }).run();
    },
  },
  {
    labelKey: 'editor.blockMenu.bulletList',
    icon: List,
    action: (editor, pos) => {
      editor.chain().focus().setTextSelection(pos + 1).toggleBulletList().run();
    },
  },
  {
    labelKey: 'editor.blockMenu.numberedList',
    icon: ListOrdered,
    action: (editor, pos) => {
      editor.chain().focus().setTextSelection(pos + 1).toggleOrderedList().run();
    },
  },
  {
    labelKey: 'editor.blockMenu.taskList',
    icon: ListChecks,
    action: (editor, pos) => {
      editor.chain().focus().setTextSelection(pos + 1).toggleTaskList().run();
    },
  },
  {
    labelKey: 'editor.blockMenu.codeBlock',
    icon: Code2,
    action: (editor, pos) => {
      editor.chain().focus().setTextSelection(pos + 1).toggleCodeBlock().run();
    },
  },
  {
    labelKey: 'editor.blockMenu.blockquote',
    icon: Quote,
    action: (editor, pos) => {
      editor.chain().focus().setTextSelection(pos + 1).toggleBlockquote().run();
    },
  },
];

const initialMenuState: MenuState = {
  open: false,
  pos: 0,
  nodeType: '',
  x: 0,
  y: 0,
};

export const BlockActionMenu = ({ editor }: BlockActionMenuProps) => {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<MenuState>(initialMenuState);
  const menuRef = useRef<HTMLDivElement>(null);
  const listenerAdded = useRef(false);

  const close = useCallback(() => {
    setMenu(initialMenuState);
  }, []);

  // Listen for the custom event dispatched by the drag handle
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        pos: number;
        nodeType: string;
        rect: { x: number; y: number; width: number; height: number };
      };
      setMenu({
        open: true,
        pos: detail.pos,
        nodeType: detail.nodeType,
        x: detail.rect.x,
        y: detail.rect.y + detail.rect.height + 4,
      });
    };

    window.addEventListener('block-action-menu:open', handleOpen);
    return () => window.removeEventListener('block-action-menu:open', handleOpen);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!menu.open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [menu.open, close]);

  // Close on click outside
  useEffect(() => {
    if (!menu.open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    // Use setTimeout to avoid immediate close from the triggering click
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
  const menuWidth = 200;
  const menuHeight = BLOCK_ACTIONS.length * 36 + 32;
  const x = Math.min(menu.x, window.innerWidth - menuWidth - 8);
  const y = menu.y + menuHeight > window.innerHeight
    ? menu.y - menuHeight - 8
    : menu.y;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] w-[200px] rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] shadow-lg py-1 overflow-hidden"
      style={{ left: x, top: y }}
    >
      <div className="px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)]">
        {t('editor.blockMenu.turnInto')}
      </div>
      {BLOCK_ACTIONS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.labelKey}
            type="button"
            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors duration-100 cursor-pointer"
            onClick={() => {
              const node = editor.state.doc.nodeAt(menu.pos);
              if (!node) { close(); return; }
              item.action(editor, menu.pos);
              close();
            }}
          >
            <Icon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            <span>{t(item.labelKey)}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
};
