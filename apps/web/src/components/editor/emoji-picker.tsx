'use client';

import { useState, useCallback } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

interface EmojiCategory {
  name: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    emojis: [
      '\u{1F600}', '\u{1F603}', '\u{1F604}', '\u{1F601}', '\u{1F606}', '\u{1F605}',
      '\u{1F602}', '\u{1F923}', '\u{1F60A}', '\u{1F607}', '\u{1F642}', '\u{1F643}',
      '\u{1F609}', '\u{1F60C}', '\u{1F60D}', '\u{1F970}', '\u{1F618}', '\u{1F617}',
      '\u{1F619}', '\u{1F61A}', '\u{1F60B}', '\u{1F61B}', '\u{1F61C}', '\u{1F92A}',
      '\u{1F61D}', '\u{1F911}', '\u{1F917}', '\u{1F92D}', '\u{1F92B}', '\u{1F914}',
      '\u{1F910}', '\u{1F928}', '\u{1F610}', '\u{1F611}', '\u{1F636}', '\u{1F60F}',
      '\u{1F612}', '\u{1F644}', '\u{1F62C}', '\u{1F925}', '\u{1F60E}', '\u{1F913}',
      '\u{1F9D0}', '\u{1F615}', '\u{1F61F}', '\u{1F641}', '\u{2639}\u{FE0F}', '\u{1F62E}',
      '\u{1F62F}', '\u{1F632}', '\u{1F633}', '\u{1F97A}', '\u{1F626}', '\u{1F627}',
      '\u{1F628}', '\u{1F630}', '\u{1F625}', '\u{1F622}', '\u{1F62D}', '\u{1F631}',
    ],
  },
  {
    name: 'Gestures',
    emojis: [
      '\u{1F44D}', '\u{1F44E}', '\u{1F44A}', '\u{270A}', '\u{1F91B}', '\u{1F91C}',
      '\u{1F44F}', '\u{1F64C}', '\u{1F450}', '\u{1F932}', '\u{1F91D}', '\u{1F64F}',
      '\u{270D}\u{FE0F}', '\u{1F485}', '\u{1F933}', '\u{1F4AA}', '\u{1F9BE}', '\u{1F9BF}',
      '\u{1F448}', '\u{1F449}', '\u{261D}\u{FE0F}', '\u{1F446}', '\u{1F595}', '\u{1F447}',
      '\u{270C}\u{FE0F}', '\u{1F91E}', '\u{1F596}', '\u{1F918}', '\u{1F919}', '\u{1F590}\u{FE0F}',
      '\u{270B}', '\u{1F44C}', '\u{1F44B}', '\u{1F91F}', '\u{1F44C}', '\u{1F90F}',
    ],
  },
  {
    name: 'Objects',
    emojis: [
      '\u{2764}\u{FE0F}', '\u{1F4AF}', '\u{1F525}', '\u{2B50}', '\u{1F31F}', '\u{1F4A5}',
      '\u{1F4A2}', '\u{1F4A6}', '\u{1F4A8}', '\u{1F4AB}', '\u{1F389}', '\u{1F38A}',
      '\u{2728}', '\u{1F388}', '\u{1F381}', '\u{1F3C6}', '\u{1F3C5}', '\u{1F947}',
      '\u{1F4DD}', '\u{1F4D6}', '\u{1F4DA}', '\u{1F4BB}', '\u{1F4F1}', '\u{1F4E7}',
      '\u{1F4C5}', '\u{1F4CB}', '\u{1F4CC}', '\u{1F4CE}', '\u{1F511}', '\u{1F512}',
      '\u{1F513}', '\u{1F527}', '\u{1F528}', '\u{1F6E0}\u{FE0F}', '\u{1F4A1}', '\u{23F0}',
    ],
  },
  {
    name: 'Nature',
    emojis: [
      '\u{1F436}', '\u{1F431}', '\u{1F42D}', '\u{1F439}', '\u{1F430}', '\u{1F98A}',
      '\u{1F43B}', '\u{1F43C}', '\u{1F428}', '\u{1F42F}', '\u{1F981}', '\u{1F42E}',
      '\u{1F437}', '\u{1F438}', '\u{1F435}', '\u{1F412}', '\u{1F414}', '\u{1F427}',
      '\u{1F426}', '\u{1F985}', '\u{1F98B}', '\u{1F41B}', '\u{1F339}', '\u{1F33B}',
      '\u{1F33A}', '\u{1F337}', '\u{1F331}', '\u{1F332}', '\u{1F333}', '\u{1F334}',
      '\u{1F335}', '\u{1F340}', '\u{1F341}', '\u{1F342}', '\u{1F343}', '\u{1F490}',
    ],
  },
  {
    name: 'Food',
    emojis: [
      '\u{1F34E}', '\u{1F34A}', '\u{1F34B}', '\u{1F34C}', '\u{1F349}', '\u{1F347}',
      '\u{1F353}', '\u{1F348}', '\u{1F352}', '\u{1F351}', '\u{1F34D}', '\u{1F95D}',
      '\u{1F345}', '\u{1F346}', '\u{1F951}', '\u{1F955}', '\u{1F33D}', '\u{1F336}\u{FE0F}',
      '\u{1F35E}', '\u{1F950}', '\u{1F956}', '\u{1F9C0}', '\u{1F354}', '\u{1F355}',
      '\u{1F35F}', '\u{1F363}', '\u{1F371}', '\u{1F358}', '\u{1F359}', '\u{1F35C}',
      '\u{1F370}', '\u{1F382}', '\u{1F366}', '\u{1F369}', '\u{1F36B}', '\u{2615}',
    ],
  },
];

export const EmojiPicker = ({ onSelect }: EmojiPickerProps) => {
  const [activeCategory, setActiveCategory] = useState(0);

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji);
    },
    [onSelect],
  );

  return (
    <div className="w-72 p-2">
      <div className="flex gap-0.5 mb-2 border-b border-border pb-1.5">
        {EMOJI_CATEGORIES.map((category, index) => (
          <button
            key={category.name}
            type="button"
            className={`flex-1 text-xs py-1 rounded transition-colors ${
              activeCategory === index
                ? 'bg-bg-tertiary text-text-primary font-medium'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
            }`}
            onClick={() => setActiveCategory(index)}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-9 gap-0.5 max-h-48 overflow-y-auto scrollbar-thin">
        {(EMOJI_CATEGORIES[activeCategory]?.emojis ?? []).map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded text-base hover:bg-bg-tertiary transition-colors"
            onClick={() => handleSelect(emoji)}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
