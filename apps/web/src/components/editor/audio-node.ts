'use client';

import { Node, mergeAttributes } from '@tiptap/core';

export interface AudioOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    audio: {
      setAudio: (options: { src: string; duration?: number }) => ReturnType;
    };
  }
}

export const AudioNode = Node.create<AudioOptions>({
  name: 'audio',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      duration: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="audio"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src as string;
    const duration = HTMLAttributes.duration as number;
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': 'audio',
        class: 'audio-player-node',
      }),
      [
        'audio',
        { src, controls: 'true', preload: 'metadata', class: 'audio-element' },
      ],
      ['span', { class: 'audio-duration' }, timeStr],
    ];
  },

  addCommands() {
    return {
      setAudio:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
