'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface ColorPickerProps {
  colors: string[];
  activeColor: string | undefined;
  onSelect: (color: string) => void;
  onReset: () => void;
  label: string;
}

export const ColorPicker = ({
  colors,
  activeColor,
  onSelect,
  onReset,
  label,
}: ColorPickerProps) => {
  const [customColor, setCustomColor] = useState('#000000');
  const [showCustom, setShowCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCustomColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCustomColor(value);
      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        onSelect(value);
      }
    },
    [onSelect],
  );

  const handleColorInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCustomColor(value);
      onSelect(value);
    },
    [onSelect],
  );

  useEffect(() => {
    if (showCustom && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustom]);

  return (
    <div className="w-52 p-2">
      <div className="mb-1.5 px-1 text-xs font-medium text-text-secondary">
        {label}
      </div>
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className="group relative w-full aspect-square rounded-md border border-border transition-all hover:scale-110 focus:outline-none focus:ring-1 focus:ring-accent"
            style={{ backgroundColor: color }}
            onClick={() => onSelect(color)}
            title={color}
          >
            {activeColor === color && (
              <span className="absolute inset-0 flex items-center justify-center">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="drop-shadow-sm"
                >
                  <path
                    d="M3 7L6 10L11 4"
                    stroke={isLightColor(color) ? '#111' : '#fff'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="flex-1 h-7 text-xs rounded border border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary transition-colors"
          onClick={onReset}
        >
          Reset
        </button>
        <button
          type="button"
          className="flex-1 h-7 text-xs rounded border border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary transition-colors"
          onClick={() => setShowCustom(!showCustom)}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={customColor}
            onChange={handleColorInputChange}
            className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent p-0"
          />
          <input
            ref={inputRef}
            type="text"
            value={customColor}
            onChange={handleCustomColorChange}
            placeholder="#000000"
            className="flex-1 h-7 px-2 text-xs rounded border border-border bg-bg-secondary text-text-primary focus:outline-none focus:border-accent"
            maxLength={7}
          />
        </div>
      )}
    </div>
  );
};

const isLightColor = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
};
