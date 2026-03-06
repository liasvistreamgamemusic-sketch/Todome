'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { ResizableImage } from './resizable-image';
import { ResizableTable, ResizableTableView } from './resizable-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Mathematics from '@tiptap/extension-mathematics';
import { createLowlight, common } from 'lowlight';
import { FontSize } from './font-size-extension';
import { DragHandle } from './drag-handle-extension';
import { AudioNode } from './audio-node';
import { EditorToolbar } from './editor-toolbar';
import './editor-styles.css';

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: JSONContent | null;
  onChange: (content: JSONContent, plainText: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export const TiptapEditor = ({
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true,
}: TiptapEditorProps) => {
  // Suppress onChange during programmatic content updates (e.g. remote sync)
  const suppressOnChangeRef = useRef(false);
  // Store pending remote content to apply when editor loses focus
  const latestContentRef = useRef<JSONContent | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        codeBlock: false,
        dropcursor: {
          width: 2,
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          loading: 'lazy',
        },
      }),
      ResizableTable.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 60,
        lastColumnResizable: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        View: ResizableTableView as any,
      }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: null,
      }),
      Mathematics.configure({
        regex: /\$([^$]*)\$/g,
        katexOptions: {
          throwOnError: false,
          displayMode: false,
        },
      }),
      DragHandle,
      AudioNode,
    ],
    content: content ?? undefined,
    editable,
    editorProps: {
      attributes: {
        class: 'prose-editor',
        spellcheck: 'true',
      },
      clipboardTextSerializer: (slice) => {
        return slice.content.textBetween(0, slice.content.size, '\n');
      },
      handleDrop: (_view, event) => {
        const hasFiles = event.dataTransfer?.files?.length;
        if (hasFiles) {
          const images = Array.from(event.dataTransfer.files).filter((file) =>
            file.type.startsWith('image/'),
          );
          if (images.length > 0) {
            event.preventDefault();
            images.forEach((image) => {
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const result = readerEvent.target?.result;
                if (typeof result === 'string') {
                  editor?.chain().focus().setImage({ src: result }).run();
                }
              };
              reader.readAsDataURL(image);
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const hasFiles = event.clipboardData?.files?.length;
        if (hasFiles) {
          const images = Array.from(event.clipboardData.files).filter((file) =>
            file.type.startsWith('image/'),
          );
          if (images.length > 0) {
            event.preventDefault();
            images.forEach((image) => {
              const reader = new FileReader();
              reader.onload = (readerEvent) => {
                const result = readerEvent.target?.result;
                if (typeof result === 'string') {
                  editor?.chain().focus().setImage({ src: result }).run();
                }
              };
              reader.readAsDataURL(image);
            });
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (suppressOnChangeRef.current) return;
      onChange(currentEditor.getJSON(), currentEditor.getText());
    },
    immediatelyRender: false,
  });

  // Auto-focus on mount when editable
  useEffect(() => {
    if (editor && editable) {
      const timer = setTimeout(() => {
        editor.commands.focus('end');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editor, editable]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Update content from outside (remote sync) without triggering onChange
  const handleContentUpdate = useCallback(
    (newContent: JSONContent | null) => {
      if (!editor) return;

      // null content → clear the editor (e.g. switching to a new diary)
      if (!newContent) {
        if (!editor.isEmpty) {
          queueMicrotask(() => {
            if (!editor.isDestroyed) {
              suppressOnChangeRef.current = true;
              editor.commands.clearContent();
              suppressOnChangeRef.current = false;
            }
          });
        }
        return;
      }

      // If editor is focused, defer the update to prevent IME/input disruption
      if (editor.isFocused) {
        latestContentRef.current = newContent;
        return;
      }

      const currentContent = JSON.stringify(editor.getJSON());
      const incomingContent = JSON.stringify(newContent);
      if (currentContent !== incomingContent) {
        // Defer to avoid flushSync-during-render error from React/ProseMirror
        queueMicrotask(() => {
          if (!editor.isDestroyed) {
            suppressOnChangeRef.current = true;
            editor.commands.setContent(newContent);
            suppressOnChangeRef.current = false;
          }
        });
      }
    },
    [editor],
  );

  useEffect(() => {
    handleContentUpdate(content);
  }, [content, handleContentUpdate]);

  // Apply deferred remote content when editor loses focus
  useEffect(() => {
    if (!editor) return;

    const handleBlur = () => {
      const pending = latestContentRef.current;
      if (!pending) return;
      latestContentRef.current = null;

      const currentContent = JSON.stringify(editor.getJSON());
      const incomingContent = JSON.stringify(pending);
      if (currentContent !== incomingContent) {
        suppressOnChangeRef.current = true;
        editor.commands.setContent(pending);
        suppressOnChangeRef.current = false;
      }
    };

    editor.on('blur', handleBlur);
    return () => {
      editor.off('blur', handleBlur);
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="tiptap-editor border border-border rounded-lg">
        <div className="h-10 border-b border-border bg-bg-primary animate-pulse" />
        <div className="p-4 min-h-[200px] bg-bg-primary" />
      </div>
    );
  }

  return (
    <div className="tiptap-editor rounded-xl glass border">
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};
