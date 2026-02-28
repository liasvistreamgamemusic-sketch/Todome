'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  CodeSquare,
  Minus,
  Table,
  Image,
  Link,
  Sigma,
  Smile,
  ChevronDown,
  MoreHorizontal,
  Palette,
  Highlighter,
  Plus,
  Trash2,
  Columns,
  Rows,
  TableCellsMerge,
  TableCellsSplit,
} from 'lucide-react';
import { ColorPicker } from './color-picker';
import { EmojiPicker } from './emoji-picker';
import { TableCreator } from './table-creator';
import { LinkEditor } from './link-editor';

interface EditorToolbarProps {
  editor: Editor;
}

const TEXT_COLORS = [
  '#111111', '#D32F2F', '#E64A19', '#F57C00',
  '#388E3C', '#1976D2', '#7B1FA2', '#5D4037',
];

const HIGHLIGHT_COLORS = [
  '#FFF9C4', '#FFCCBC', '#C8E6C9',
  '#BBDEFB', '#E1BEE7', '#F0F0F0',
];

const FONT_SIZES = [
  '10px', '12px', '14px', '16px', '18px', '20px',
  '24px', '28px', '32px', '36px', '48px', '64px',
];

const CODE_LANGUAGES = [
  { label: 'Plain Text', value: '' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'PHP', value: 'php' },
  { label: 'Swift', value: 'swift' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'SQL', value: 'sql' },
  { label: 'Shell', value: 'bash' },
  { label: 'JSON', value: 'json' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
];

type PopoverType =
  | 'fontSize'
  | 'textColor'
  | 'highlight'
  | 'heading'
  | 'table'
  | 'link'
  | 'image'
  | 'emoji'
  | 'codeLanguage'
  | 'overflow'
  | null;

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [imageUrl, setImageUrl] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);

  const togglePopover = useCallback(
    (popover: PopoverType) => {
      setActivePopover((prev) => (prev === popover ? null : popover));
    },
    [],
  );

  const closePopover = useCallback(() => {
    setActivePopover(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        closePopover();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closePopover]);

  const getCurrentFontSize = useCallback((): string => {
    const attrs = editor.getAttributes('textStyle');
    return (attrs.fontSize as string) || '14px';
  }, [editor]);

  const handleSetFontSize = useCallback(
    (size: string) => {
      editor.chain().focus().setFontSize(size).run();
      closePopover();
    },
    [editor, closePopover],
  );

  const handleSetTextColor = useCallback(
    (color: string) => {
      editor.chain().focus().setColor(color).run();
      closePopover();
    },
    [editor, closePopover],
  );

  const handleResetTextColor = useCallback(() => {
    editor.chain().focus().unsetColor().run();
    closePopover();
  }, [editor, closePopover]);

  const handleSetHighlight = useCallback(
    (color: string) => {
      editor.chain().focus().toggleHighlight({ color }).run();
      closePopover();
    },
    [editor, closePopover],
  );

  const handleResetHighlight = useCallback(() => {
    editor.chain().focus().unsetHighlight().run();
    closePopover();
  }, [editor, closePopover]);

  const handleSetHeading = useCallback(
    (level: 1 | 2 | 3 | 4) => {
      editor.chain().focus().toggleHeading({ level }).run();
      closePopover();
    },
    [editor, closePopover],
  );

  const handleSetParagraph = useCallback(() => {
    editor.chain().focus().setParagraph().run();
    closePopover();
  }, [editor, closePopover]);

  const handleCreateTable = useCallback(
    (rows: number, cols: number) => {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      closePopover();
    },
    [editor, closePopover],
  );

  const handleInsertImage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (imageUrl.trim()) {
        editor.chain().focus().setImage({ src: imageUrl }).run();
        setImageUrl('');
        closePopover();
      }
    },
    [editor, imageUrl, closePopover],
  );

  const handleSetLink = useCallback(
    (url: string, openInNewTab: boolean) => {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
          href: url,
          target: openInNewTab ? '_blank' : null,
        })
        .run();
      closePopover();
    },
    [editor, closePopover],
  );

  const handleRemoveLink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    closePopover();
  }, [editor, closePopover]);

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      editor.chain().focus().insertContent(emoji).run();
      closePopover();
    },
    [editor, closePopover],
  );

  const handleToggleCodeBlock = useCallback(() => {
    editor.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const handleSetCodeLanguage = useCallback(
    (language: string) => {
      editor.chain().focus().updateAttributes('codeBlock', { language }).run();
      closePopover();
    },
    [editor, closePopover],
  );

  const handleInsertMath = useCallback(() => {
    editor.chain().focus().insertContent('$E = mc^2$').run();
  }, [editor]);

  const handleInsertMentionLink = useCallback(() => {
    const title = window.prompt('Note title:');
    if (title) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          marks: [
            {
              type: 'link',
              attrs: {
                href: `#note:${encodeURIComponent(title)}`,
                class: 'mention-link',
              },
            },
          ],
          text: `[[${title}]]`,
        })
        .run();
    }
  }, [editor]);

  const isInTable = editor.isActive('table');
  const isInCodeBlock = editor.isActive('codeBlock');

  const currentHeadingLabel = (): string => {
    if (editor.isActive('heading', { level: 1 })) return 'H1';
    if (editor.isActive('heading', { level: 2 })) return 'H2';
    if (editor.isActive('heading', { level: 3 })) return 'H3';
    if (editor.isActive('heading', { level: 4 })) return 'H4';
    return 'P';
  };

  return (
    <div
      ref={toolbarRef}
      className="border-b border-border bg-transparent"
    >
      {/* Row 1: Inline formatting */}
      <div className="flex items-center gap-0.5 px-2 py-1 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Cmd+B)"
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Cmd+I)"
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Cmd+U)"
        >
          <Underline size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline code"
        >
          <Code size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Font size dropdown */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-0.5 h-7 px-2 text-xs rounded border border-transparent hover:bg-bg-tertiary text-text-primary transition-colors"
            onClick={() => togglePopover('fontSize')}
            title="Font size"
          >
            <span className="min-w-[32px] text-center">{getCurrentFontSize()}</span>
            <ChevronDown size={12} />
          </button>
          {activePopover === 'fontSize' && (
            <Popover>
              <div className="w-24 py-1 max-h-56 overflow-y-auto scrollbar-thin">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`w-full px-3 py-1 text-xs text-left hover:bg-bg-tertiary transition-colors ${
                      getCurrentFontSize() === size
                        ? 'text-accent font-medium bg-bg-secondary'
                        : 'text-text-primary'
                    }`}
                    onClick={() => handleSetFontSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </Popover>
          )}
        </div>

        <ToolbarDivider />

        {/* Text color */}
        <div className="relative">
          <ToolbarButton
            onClick={() => togglePopover('textColor')}
            isActive={activePopover === 'textColor'}
            title="Text color"
          >
            <Palette size={15} />
          </ToolbarButton>
          {activePopover === 'textColor' && (
            <Popover>
              <ColorPicker
                colors={TEXT_COLORS}
                activeColor={editor.getAttributes('textStyle').color as string | undefined}
                onSelect={handleSetTextColor}
                onReset={handleResetTextColor}
                label="Text Color"
              />
            </Popover>
          )}
        </div>

        {/* Highlight color */}
        <div className="relative">
          <ToolbarButton
            onClick={() => togglePopover('highlight')}
            isActive={editor.isActive('highlight')}
            title="Highlight"
          >
            <Highlighter size={15} />
          </ToolbarButton>
          {activePopover === 'highlight' && (
            <Popover>
              <ColorPicker
                colors={HIGHLIGHT_COLORS}
                activeColor={editor.getAttributes('highlight').color as string | undefined}
                onSelect={handleSetHighlight}
                onReset={handleResetHighlight}
                label="Highlight Color"
              />
            </Popover>
          )}
        </div>
      </div>

      {/* Row 2: Block formatting */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-t border-border flex-wrap">
        {/* Heading selector */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-0.5 h-7 px-2 text-xs rounded border border-transparent hover:bg-bg-tertiary text-text-primary font-medium transition-colors"
            onClick={() => togglePopover('heading')}
            title="Heading"
          >
            <span className="min-w-[20px]">{currentHeadingLabel()}</span>
            <ChevronDown size={12} />
          </button>
          {activePopover === 'heading' && (
            <Popover>
              <div className="w-36 py-1">
                <button
                  type="button"
                  className={`w-full px-3 py-1.5 text-sm text-left hover:bg-bg-tertiary transition-colors ${
                    !editor.isActive('heading') ? 'text-accent font-medium' : 'text-text-primary'
                  }`}
                  onClick={handleSetParagraph}
                >
                  Paragraph
                </button>
                {([1, 2, 3, 4] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`w-full px-3 py-1.5 text-left hover:bg-bg-tertiary transition-colors ${
                      editor.isActive('heading', { level })
                        ? 'text-accent font-medium'
                        : 'text-text-primary'
                    }`}
                    style={{
                      fontSize: `${1.4 - level * 0.15}em`,
                      fontWeight: 600,
                    }}
                    onClick={() => handleSetHeading(level)}
                  >
                    Heading {level}
                  </button>
                ))}
              </div>
            </Popover>
          )}
        </div>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align left"
        >
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align center"
        >
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align right"
        >
          <AlignRight size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Task list"
        >
          <ListChecks size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Blockquote */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote size={15} />
        </ToolbarButton>

        {/* Code block */}
        <ToolbarButton
          onClick={handleToggleCodeBlock}
          isActive={editor.isActive('codeBlock')}
          title="Code block"
        >
          <CodeSquare size={15} />
        </ToolbarButton>

        {/* Horizontal rule */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          <Minus size={15} />
        </ToolbarButton>
      </div>

      {/* Row 3: Contextual tools */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-t border-border flex-wrap">
        {/* Table */}
        <div className="relative">
          <ToolbarButton
            onClick={() => togglePopover('table')}
            isActive={isInTable}
            title="Insert table"
          >
            <Table size={15} />
          </ToolbarButton>
          {activePopover === 'table' && !isInTable && (
            <Popover>
              <TableCreator onCreateTable={handleCreateTable} />
            </Popover>
          )}
        </div>

        {/* Table controls when inside a table */}
        {isInTable && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add column after"
            >
              <Columns size={15} />
              <Plus size={10} className="ml-[-2px]" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Delete column"
            >
              <Columns size={15} />
              <Trash2 size={10} className="ml-[-2px]" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add row after"
            >
              <Rows size={15} />
              <Plus size={10} className="ml-[-2px]" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Delete row"
            >
              <Rows size={15} />
              <Trash2 size={10} className="ml-[-2px]" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().mergeCells().run()}
              title="Merge cells"
            >
              <TableCellsMerge size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().splitCell().run()}
              title="Split cell"
            >
              <TableCellsSplit size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Delete table"
            >
              <Table size={15} />
              <Trash2 size={10} className="ml-[-2px]" />
            </ToolbarButton>
            <ToolbarDivider />
          </>
        )}

        {/* Code block language selector when inside code block */}
        {isInCodeBlock && (
          <>
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-0.5 h-7 px-2 text-xs rounded border border-transparent hover:bg-bg-tertiary text-text-primary transition-colors"
                onClick={() => togglePopover('codeLanguage')}
                title="Code language"
              >
                <span>
                  {CODE_LANGUAGES.find(
                    (l) => l.value === (editor.getAttributes('codeBlock').language as string),
                  )?.label || 'Plain Text'}
                </span>
                <ChevronDown size={12} />
              </button>
              {activePopover === 'codeLanguage' && (
                <Popover>
                  <div className="w-36 py-1 max-h-56 overflow-y-auto scrollbar-thin">
                    {CODE_LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                        type="button"
                        className={`w-full px-3 py-1 text-xs text-left hover:bg-bg-tertiary transition-colors ${
                          editor.getAttributes('codeBlock').language === lang.value
                            ? 'text-accent font-medium bg-bg-secondary'
                            : 'text-text-primary'
                        }`}
                        onClick={() => handleSetCodeLanguage(lang.value)}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </Popover>
              )}
            </div>
            <ToolbarDivider />
          </>
        )}

        {/* Image */}
        <div className="relative">
          <ToolbarButton
            onClick={() => togglePopover('image')}
            title="Insert image"
          >
            <Image size={15} />
          </ToolbarButton>
          {activePopover === 'image' && (
            <Popover>
              <div className="w-72 p-2">
                <form onSubmit={handleInsertImage}>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Image URL..."
                      className="flex-1 h-7 px-2 text-xs rounded border border-border bg-bg-secondary text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="h-7 px-2 text-xs rounded bg-accent text-bg-primary hover:opacity-80 transition-opacity"
                    >
                      Insert
                    </button>
                  </div>
                </form>
              </div>
            </Popover>
          )}
        </div>

        {/* Link */}
        <div className="relative">
          <ToolbarButton
            onClick={() => togglePopover('link')}
            isActive={editor.isActive('link')}
            title="Insert link"
          >
            <Link size={15} />
          </ToolbarButton>
          {activePopover === 'link' && (
            <Popover>
              <LinkEditor
                initialUrl={(editor.getAttributes('link').href as string) || ''}
                initialOpenInNewTab={editor.getAttributes('link').target === '_blank'}
                onSubmit={handleSetLink}
                onRemove={handleRemoveLink}
              />
            </Popover>
          )}
        </div>

        <ToolbarDivider />

        {/* Math */}
        <ToolbarButton
          onClick={handleInsertMath}
          title="Insert math (LaTeX)"
        >
          <Sigma size={15} />
        </ToolbarButton>

        {/* Emoji */}
        <div className="relative">
          <ToolbarButton
            onClick={() => togglePopover('emoji')}
            title="Insert emoji"
          >
            <Smile size={15} />
          </ToolbarButton>
          {activePopover === 'emoji' && (
            <Popover>
              <EmojiPicker onSelect={handleInsertEmoji} />
            </Popover>
          )}
        </div>

        <ToolbarDivider />

        {/* Mention link */}
        <ToolbarButton
          onClick={handleInsertMentionLink}
          title="Link to note ([[note title]])"
        >
          <span className="text-xs font-mono">[[]]</span>
        </ToolbarButton>

        {/* Overflow menu for small screens */}
        <div className="relative ml-auto sm:hidden">
          <ToolbarButton
            onClick={() => togglePopover('overflow')}
            title="More options"
          >
            <MoreHorizontal size={15} />
          </ToolbarButton>
        </div>
      </div>
    </div>
  );
};

/* Reusable toolbar button */
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarButton = ({
  onClick,
  isActive = false,
  title,
  children,
}: ToolbarButtonProps) => (
  <button
    type="button"
    className={`flex items-center justify-center h-7 min-w-[28px] px-1 rounded transition-colors ${
      isActive
        ? 'bg-bg-tertiary text-accent'
        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
    }`}
    onClick={onClick}
    title={title}
  >
    {children}
  </button>
);

/* Toolbar divider */
const ToolbarDivider = () => (
  <div className="w-px h-4 bg-border mx-0.5" />
);

/* Popover wrapper */
interface PopoverProps {
  children: React.ReactNode;
}

const Popover = ({ children }: PopoverProps) => (
  <div className="absolute left-0 top-full mt-1 z-50 bg-bg-primary border border-border rounded-lg shadow-lg">
    {children}
  </div>
);
