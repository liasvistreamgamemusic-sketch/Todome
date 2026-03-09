'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor, JSONContent } from '@tiptap/react';
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

export { type Editor } from '@tiptap/react';

interface TiptapEditorProps {
  content: JSONContent | null;
  onChange: (content: JSONContent, plainText: string) => void;
  placeholder?: string;
  editable?: boolean;
  hideToolbar?: boolean;
  onEditorReady?: (editor: Editor) => void;
  contentKey?: string;
}

export const TiptapEditor = ({
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  hideToolbar = false,
  onEditorReady,
  contentKey,
}: TiptapEditorProps) => {
  const suppressOnChangeRef = useRef(false);
  const latestContentRef = useRef<JSONContent | null>(null);
  const prevContentKeyRef = useRef<string | undefined>(contentKey);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
        dropcursor: { width: 2 },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
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
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { loading: 'lazy' },
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
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
      Mathematics.configure({
        regex: /\$([^$]*)\$/g,
        katexOptions: { throwOnError: false, displayMode: false },
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

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

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

  // Update content from outside (remote sync / document switch) without triggering onChange
  const handleContentUpdate = useCallback(
    (newContent: JSONContent | null) => {
      if (!editor) return;

      // Detect document switch via contentKey
      const isDocumentSwitch = contentKey !== undefined && contentKey !== prevContentKeyRef.current;
      if (isDocumentSwitch) {
        prevContentKeyRef.current = contentKey;
        latestContentRef.current = null;
      }

      // null content → clear the editor (e.g. switching to a new diary)
      if (!newContent) {
        if (!editor.isEmpty) {
          suppressOnChangeRef.current = true;
          queueMicrotask(() => {
            if (!editor.isDestroyed) {
              editor.commands.clearContent();
              queueMicrotask(() => {
                suppressOnChangeRef.current = false;
              });
            } else {
              suppressOnChangeRef.current = false;
            }
          });
        }
        return;
      }

      // Only defer for remote sync when focused, not for document switches
      if (editor.isFocused && !isDocumentSwitch) {
        latestContentRef.current = newContent;
        return;
      }

      // Apply content update with proper suppress timing
      suppressOnChangeRef.current = true;
      queueMicrotask(() => {
        if (!editor.isDestroyed) {
          editor.commands.setContent(newContent);
          queueMicrotask(() => {
            suppressOnChangeRef.current = false;
          });
        } else {
          suppressOnChangeRef.current = false;
        }
      });
    },
    [editor, contentKey],
  );

  useEffect(() => {
    handleContentUpdate(content);
  }, [content, handleContentUpdate]);

  // Apply deferred remote content when editor loses focus.
  // Use a short delay so toolbar clicks (which refocus the editor via
  // editor.chain().focus()) don't cause a stale content overwrite.
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!editor) return;

    const handleBlur = () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        if (editor.isFocused || editor.isDestroyed) return;

        const pending = latestContentRef.current;
        if (!pending) return;
        latestContentRef.current = null;

        suppressOnChangeRef.current = true;
        editor.commands.setContent(pending);
        queueMicrotask(() => {
          suppressOnChangeRef.current = false;
        });
      }, 150);
    };

    const handleFocus = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    editor.on('blur', handleBlur);
    editor.on('focus', handleFocus);
    return () => {
      editor.off('blur', handleBlur);
      editor.off('focus', handleFocus);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
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
      {editable && !hideToolbar && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};
