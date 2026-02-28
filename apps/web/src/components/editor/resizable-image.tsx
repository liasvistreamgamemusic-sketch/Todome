'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type HandlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface ResizableImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, string>;
}

interface DragState {
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  handle: HandlePosition;
}

const PRESET_WIDTHS = [
  { label: '25%', value: 25 },
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: '100%', value: 100 },
] as const;

const HANDLE_POSITIONS: readonly HandlePosition[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;

const MIN_WIDTH = 40;
const MIN_HEIGHT = 40;

/* ------------------------------------------------------------------ */
/*  NodeView Component                                                 */
/* ------------------------------------------------------------------ */

const ResizableImageView = ({
  node,
  updateAttributes,
  selected,
  editor,
}: NodeViewProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const [isResizing, setIsResizing] = useState(false);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);

  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) || '';
  const title = (node.attrs.title as string) || '';
  const width = node.attrs.width as string | null;
  const height = node.attrs.height as string | null;

  const isEditable = editor.isEditable;
  const showControls = selected && isEditable;

  /* ---- Aspect ratio helper ---- */
  const getAspectRatio = useCallback((): number => {
    const img = imgRef.current;
    if (!img || img.naturalHeight === 0) return 1;
    return img.naturalWidth / img.naturalHeight;
  }, []);

  /* ---- Drag handlers ---- */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: HandlePosition) => {
      e.preventDefault();
      e.stopPropagation();

      const img = imgRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();

      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        handle,
      };

      setIsResizing(true);
      setDisplaySize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    },
    [],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;

      const aspectRatio = getAspectRatio();

      let deltaX = e.clientX - state.startX;
      const isLeftHandle = state.handle.includes('left');

      if (isLeftHandle) {
        deltaX = -deltaX;
      }

      let newWidth = Math.max(MIN_WIDTH, state.startWidth + deltaX);
      let newHeight = Math.max(MIN_HEIGHT, newWidth / aspectRatio);

      /* Clamp to editor content width */
      const editorEl = wrapperRef.current?.closest('.ProseMirror');
      if (editorEl) {
        const maxWidth = editorEl.clientWidth - 40; /* account for padding */
        newWidth = Math.min(newWidth, maxWidth);
        newHeight = newWidth / aspectRatio;
      }

      setDisplaySize({ w: Math.round(newWidth), h: Math.round(newHeight) });

      const img = imgRef.current;
      if (img) {
        img.style.width = `${Math.round(newWidth)}px`;
        img.style.height = `${Math.round(newHeight)}px`;
      }
    };

    const handleMouseUp = () => {
      const size = displaySize;
      if (size) {
        updateAttributes({
          width: `${size.w}px`,
          height: `${size.h}px`,
        });
      }

      dragStateRef.current = null;
      setIsResizing(false);
      setDisplaySize(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, displaySize, getAspectRatio, updateAttributes]);

  /* ---- Preset width handler ---- */
  const handlePresetWidth = useCallback(
    (percent: number) => {
      const editorEl = wrapperRef.current?.closest('.ProseMirror');
      if (!editorEl) return;

      const contentWidth = editorEl.clientWidth - 40;
      const newWidth = Math.round((contentWidth * percent) / 100);
      const aspectRatio = getAspectRatio();
      const newHeight = Math.round(newWidth / aspectRatio);

      updateAttributes({
        width: `${newWidth}px`,
        height: `${newHeight}px`,
      });
    },
    [getAspectRatio, updateAttributes],
  );

  /* ---- Keyboard support ---- */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showControls) return;

      const editorEl = wrapperRef.current?.closest('.ProseMirror');
      if (!editorEl) return;

      const contentWidth = editorEl.clientWidth - 40;
      const img = imgRef.current;
      if (!img) return;

      const currentWidth = img.getBoundingClientRect().width;
      const aspectRatio = getAspectRatio();
      let newWidth: number | null = null;

      if (e.key === '-' || e.key === '_') {
        newWidth = Math.max(MIN_WIDTH, currentWidth - 20);
      } else if (e.key === '=' || e.key === '+') {
        newWidth = Math.min(contentWidth, currentWidth + 20);
      }

      if (newWidth !== null) {
        e.preventDefault();
        const newHeight = Math.round(newWidth / aspectRatio);
        updateAttributes({
          width: `${Math.round(newWidth)}px`,
          height: `${newHeight}px`,
        });
      }
    },
    [showControls, getAspectRatio, updateAttributes],
  );

  /* ---- Compute image style ---- */
  const imageStyle: React.CSSProperties = {};
  if (width) imageStyle.width = width;
  if (height) imageStyle.height = height;

  return (
    <NodeViewWrapper
      as="div"
      className={`resizable-image-wrapper${showControls ? ' selected' : ''}${isResizing ? ' resizing' : ''}`}
      ref={wrapperRef}
      onKeyDown={handleKeyDown}
      tabIndex={showControls ? 0 : undefined}
      role="group"
      aria-label={`Image: ${alt || 'embedded image'}`}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        title={title}
        loading="lazy"
        style={imageStyle}
        draggable={false}
      />

      {/* Resize handles */}
      {showControls &&
        HANDLE_POSITIONS.map((pos) => (
          <span
            key={pos}
            className={`resize-handle resize-handle--${pos}`}
            onMouseDown={(e) => handleMouseDown(e, pos)}
            role="separator"
            aria-orientation="vertical"
            aria-label={`Resize ${pos.replace('-', ' ')}`}
            tabIndex={-1}
          />
        ))}

      {/* Dimension indicator while resizing */}
      {isResizing && displaySize && (
        <span className="image-size-indicator">
          {displaySize.w} x {displaySize.h}
        </span>
      )}

      {/* Preset size toolbar */}
      {showControls && !isResizing && (
        <div className="image-toolbar" role="toolbar" aria-label="Image size presets">
          {PRESET_WIDTHS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className="image-toolbar__btn"
              onClick={() => handlePresetWidth(preset.value)}
              title={`Set width to ${preset.label}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </NodeViewWrapper>
  );
};

/* ------------------------------------------------------------------ */
/*  Extension                                                          */
/* ------------------------------------------------------------------ */

export const ResizableImage = Image.extend<ResizableImageOptions>({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width') || element.style.width || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width, style: `width: ${attributes.width as string}` };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute('height') || element.style.height || null,
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height, style: `height: ${attributes.height as string}` };
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const styles: string[] = [];
    if (HTMLAttributes.width) styles.push(`width: ${HTMLAttributes.width as string}`);
    if (HTMLAttributes.height) styles.push(`height: ${HTMLAttributes.height as string}`);

    const styleAttr = styles.length > 0 ? { style: styles.join('; ') } : {};

    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, styleAttr),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
