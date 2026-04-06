import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode, NodeType } from '@tiptap/pm/model';
import { Fragment } from '@tiptap/pm/model';

type ListKind = 'bulletList' | 'orderedList' | 'taskList';

const LIST_ITEM_MAP: Record<ListKind, string> = {
  bulletList: 'listItem',
  orderedList: 'listItem',
  taskList: 'taskItem',
};

const LIST_NODE_NAMES = new Set(['bulletList', 'orderedList', 'taskList']);
const LIST_ITEM_NAMES = new Set(['listItem', 'taskItem']);

function isListNode(node: ProseMirrorNode): boolean {
  return LIST_NODE_NAMES.has(node.type.name);
}

/**
 * Recursively converts all list/listItem nodes in the tree to the target types,
 * preserving the nesting structure.
 */
function convertNodeTree(
  node: ProseMirrorNode,
  targetListType: NodeType,
  targetItemType: NodeType,
): ProseMirrorNode {
  const children: ProseMirrorNode[] = [];
  node.content.forEach((child) => {
    children.push(convertNodeTree(child, targetListType, targetItemType));
  });
  const newContent = Fragment.from(children);

  if (LIST_NODE_NAMES.has(node.type.name) && node.type !== targetListType) {
    return targetListType.create(null, newContent, node.marks);
  }

  if (LIST_ITEM_NAMES.has(node.type.name) && node.type !== targetItemType) {
    const attrs =
      targetItemType.name === 'taskItem' ? { checked: false } : {};
    return targetItemType.create(attrs, newContent, node.marks);
  }

  if (node.content.eq(newContent)) return node;
  return node.copy(newContent);
}

/**
 * Attempts an in-place list type conversion that preserves nesting.
 * Returns true if conversion was performed.
 */
function convertListInPlace(editor: Editor, targetKind: ListKind): boolean {
  const { state } = editor;
  const { doc, selection, schema } = state;
  const { from, to } = selection;

  const targetListType = schema.nodes[targetKind];
  const targetItemType = schema.nodes[LIST_ITEM_MAP[targetKind]];
  if (!targetListType || !targetItemType) return false;

  // Find the outermost list that fully contains the selection
  const $from = doc.resolve(from);
  let outerPos: number | null = null;
  let outerNode: ProseMirrorNode | null = null;

  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (isListNode(node)) {
      const pos = $from.before(d);
      if (pos + node.nodeSize >= to) {
        outerPos = pos;
        outerNode = node;
      }
    }
  }

  if (outerPos !== null && outerNode) {
    if (outerNode.type === targetListType) return false;
    const converted = convertNodeTree(outerNode, targetListType, targetItemType);
    editor.view.dispatch(state.tr.replaceWith(outerPos, outerPos + outerNode.nodeSize, converted));
    return true;
  }

  // Selection spans multiple top-level nodes
  const lists: { pos: number; node: ProseMirrorNode }[] = [];
  doc.forEach((node, offset) => {
    if (isListNode(node) && node.type !== targetListType) {
      if (offset < to && offset + node.nodeSize > from) {
        lists.push({ pos: offset, node });
      }
    }
  });

  if (lists.length === 0) return false;

  const tr = state.tr;
  for (let i = lists.length - 1; i >= 0; i--) {
    const entry = lists[i]!;
    const converted = convertNodeTree(entry.node, targetListType, targetItemType);
    tr.replaceWith(entry.pos, entry.pos + entry.node.nodeSize, converted);
  }
  editor.view.dispatch(tr);
  return true;
}

/**
 * Toggle list type with nesting preservation.
 * Converts in-place when switching between list types;
 * falls back to built-in toggle for wrap/unwrap.
 */
export function toggleList(editor: Editor, kind: ListKind): void {
  if (convertListInPlace(editor, kind)) return;

  switch (kind) {
    case 'bulletList':
      editor.chain().focus().toggleBulletList().run();
      break;
    case 'orderedList':
      editor.chain().focus().toggleOrderedList().run();
      break;
    case 'taskList':
      editor.chain().focus().toggleTaskList().run();
      break;
  }
}
