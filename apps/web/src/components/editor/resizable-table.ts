'use client';

import Table from '@tiptap/extension-table';
import { updateColumns } from '@tiptap/extension-table';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorView, NodeView, ViewMutationRecord } from '@tiptap/pm/view';

const MIN_TABLE_WIDTH = 120;

/**
 * Custom TableView that wraps the table in a resizable container.
 * Constructor signature: (node, cellMinWidth, view) — matches columnResizing's View option.
 * Column resizing is handled by the inner table structure (colgroup).
 * This wrapper adds a right-edge handle for whole-table width resizing.
 */
export class ResizableTableView implements NodeView {
  node: ProseMirrorNode;
  dom: HTMLElement;
  table: HTMLTableElement;
  colgroup: HTMLTableColElement;
  contentDOM: HTMLElement;

  private cellMinWidth: number;
  private editorView: EditorView;
  private resizeHandle: HTMLElement;
  private isResizing = false;
  private startX = 0;
  private startWidth = 0;

  constructor(node: ProseMirrorNode, cellMinWidth: number, view: EditorView) {
    this.node = node;
    this.cellMinWidth = cellMinWidth;
    this.editorView = view;

    // Outer resizable wrapper
    this.dom = document.createElement('div');
    this.dom.className = 'resizable-table-wrapper';

    const tableWidth = node.attrs.tableWidth as string | null;
    if (tableWidth) {
      this.dom.style.width = tableWidth;
    }

    // Inner table structure (same as original TableView)
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'tableWrapper';

    this.table = document.createElement('table');
    this.colgroup = document.createElement('colgroup');
    this.table.appendChild(this.colgroup);
    updateColumns(node, this.colgroup, this.table, cellMinWidth);

    const tbody = document.createElement('tbody');
    this.table.appendChild(tbody);
    this.contentDOM = tbody;

    tableWrapper.appendChild(this.table);
    this.dom.appendChild(tableWrapper);

    // Right-edge resize handle
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'table-width-resize-handle';
    this.dom.appendChild(this.resizeHandle);

    if (view.editable) {
      this.resizeHandle.addEventListener('mousedown', this.onMouseDown);
    }
  }

  private onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.isResizing = true;
    this.startX = e.clientX;
    this.startWidth = this.dom.getBoundingClientRect().width;
    this.dom.classList.add('resizing');
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isResizing) return;
    const delta = e.clientX - this.startX;
    const newWidth = Math.max(MIN_TABLE_WIDTH, this.startWidth + delta);

    const editorEl = this.dom.closest('.ProseMirror');
    const maxWidth = editorEl ? editorEl.clientWidth - 8 : 9999;
    this.dom.style.width = `${Math.min(newWidth, maxWidth)}px`;
  };

  private onMouseUp = () => {
    if (!this.isResizing) return;
    this.isResizing = false;
    this.dom.classList.remove('resizing');
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);

    // Persist width to node attribute
    const pos = this.editorView.posAtDOM(this.dom, 0);
    if (pos >= 0) {
      const resolved = this.editorView.state.doc.resolve(pos);
      for (let d = resolved.depth; d >= 0; d--) {
        if (resolved.node(d).type.name === 'table') {
          const tablePos = resolved.before(d);
          const { tr } = this.editorView.state;
          tr.setNodeMarkup(tablePos, undefined, {
            ...this.node.attrs,
            tableWidth: this.dom.style.width,
          });
          this.editorView.dispatch(tr);
          break;
        }
      }
    }
  };

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;

    const tableWidth = node.attrs.tableWidth as string | null;
    if (tableWidth) {
      this.dom.style.width = tableWidth;
    } else {
      this.dom.style.width = '';
    }

    updateColumns(node, this.colgroup, this.table, this.cellMinWidth);
    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord): boolean {
    return (
      mutation.type === 'attributes' &&
      (mutation.target === this.table ||
        mutation.target === this.dom ||
        mutation.target === this.resizeHandle ||
        this.colgroup.contains(mutation.target as Node))
    );
  }

  destroy() {
    this.resizeHandle.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}

/**
 * Extended Table extension with tableWidth attribute for whole-table resizing.
 */
export const ResizableTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      tableWidth: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const wrapper = element.closest('.resizable-table-wrapper');
          return (
            wrapper?.getAttribute('data-table-width') ||
            element.style.width ||
            null
          );
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.tableWidth) return {};
          return { 'data-table-width': attributes.tableWidth };
        },
      },
    };
  },
});
