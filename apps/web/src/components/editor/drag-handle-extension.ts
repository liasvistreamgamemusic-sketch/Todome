'use client';

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';

const DRAGGABLE_NODE_TYPES = new Set([
  'image',
  'table',
  'codeBlock',
  'blockquote',
  'horizontalRule',
]);

const dragHandlePluginKey = new PluginKey('dragHandle');

const GRIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>`;

export const DragHandle = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: dragHandlePluginKey,
        view(editorView) {
          let dragHandleEl: HTMLElement | null = null;
          let currentNodePos: number | null = null;
          let hideTimeout: ReturnType<typeof setTimeout> | null = null;

          dragHandleEl = document.createElement('div');
          dragHandleEl.className = 'drag-handle';
          dragHandleEl.draggable = true;
          dragHandleEl.innerHTML = GRIP_SVG;
          dragHandleEl.style.display = 'none';

          // Attach to the ProseMirror DOM itself (position: relative)
          const proseMirrorEl = editorView.dom as HTMLElement;
          proseMirrorEl.style.position = 'relative';
          proseMirrorEl.appendChild(dragHandleEl);

          const showHandle = (rect: DOMRect, editorRect: DOMRect) => {
            if (!dragHandleEl) return;
            dragHandleEl.style.display = 'flex';
            dragHandleEl.classList.add('visible');
            // Position in the left padding area (28px padding-left)
            dragHandleEl.style.top = `${rect.top - editorRect.top + rect.height / 2 - 10}px`;
            dragHandleEl.style.left = '4px';
          };

          const hideHandle = () => {
            if (!dragHandleEl) return;
            dragHandleEl.classList.remove('visible');
            dragHandleEl.style.display = 'none';
            currentNodePos = null;
          };

          const handleMouseMove = (e: MouseEvent) => {
            if (hideTimeout) clearTimeout(hideTimeout);

            if (!editorView.editable) {
              hideHandle();
              return;
            }

            const coords = { left: e.clientX, top: e.clientY };
            const posInfo = editorView.posAtCoords(coords);
            if (!posInfo) {
              hideHandle();
              return;
            }

            const resolved = editorView.state.doc.resolve(posInfo.pos);
            let depth = resolved.depth;

            // Walk up to depth 1 (direct child of doc)
            while (depth > 1) {
              depth--;
            }

            if (depth < 1) {
              hideHandle();
              return;
            }

            const nodePos = resolved.before(depth);
            const node = resolved.node(depth);

            if (!DRAGGABLE_NODE_TYPES.has(node.type.name)) {
              hideHandle();
              return;
            }

            const domNode = editorView.nodeDOM(nodePos);
            if (!domNode || !(domNode instanceof HTMLElement)) {
              hideHandle();
              return;
            }

            currentNodePos = nodePos;
            const nodeRect = domNode.getBoundingClientRect();
            const editorRect = proseMirrorEl.getBoundingClientRect();
            showHandle(nodeRect, editorRect);
          };

          const handleMouseLeave = () => {
            hideTimeout = setTimeout(hideHandle, 200);
          };

          const handleDragStart = (e: DragEvent) => {
            if (currentNodePos === null || !e.dataTransfer) return;

            // Set NodeSelection so ProseMirror handles the move
            const { state } = editorView;
            const selection = NodeSelection.create(state.doc, currentNodePos);
            editorView.dispatch(state.tr.setSelection(selection));

            // Required for drag to work in all browsers
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');

            const domNode = editorView.nodeDOM(currentNodePos);
            if (domNode instanceof HTMLElement) {
              e.dataTransfer.setDragImage(domNode, 0, 0);
            }

            hideHandle();
          };

          dragHandleEl.addEventListener('mouseenter', () => {
            if (hideTimeout) clearTimeout(hideTimeout);
          });
          dragHandleEl.addEventListener('mouseleave', handleMouseLeave);
          proseMirrorEl.addEventListener('mousemove', handleMouseMove);
          proseMirrorEl.addEventListener('mouseleave', handleMouseLeave);
          dragHandleEl.addEventListener('dragstart', handleDragStart);

          return {
            update() {
              if (currentNodePos !== null) {
                const docSize = editorView.state.doc.content.size;
                if (currentNodePos >= docSize) {
                  hideHandle();
                }
              }
            },
            destroy() {
              dragHandleEl?.remove();
              proseMirrorEl.removeEventListener('mousemove', handleMouseMove);
              proseMirrorEl.removeEventListener('mouseleave', handleMouseLeave);
              if (hideTimeout) clearTimeout(hideTimeout);
            },
          };
        },
      }),
    ];
  },
});
