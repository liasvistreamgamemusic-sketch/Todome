'use client';

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const slashCommandPluginKey = new PluginKey('slashCommand');

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: slashCommandPluginKey,
        props: {
          handleKeyDown(view, event) {
            if (event.key !== '/') return false;

            const { $from } = view.state.selection;

            // Only trigger in an empty paragraph
            if ($from.parent.type.name !== 'paragraph') return false;
            if ($from.parent.textContent !== '') return false;

            // Calculate position for the menu
            const coords = view.coordsAtPos($from.pos);
            window.dispatchEvent(
              new CustomEvent('slash-command:open', {
                detail: { x: coords.left, y: coords.bottom },
              }),
            );

            // Let '/' be typed into the document
            return false;
          },
        },
      }),
    ];
  },
});
