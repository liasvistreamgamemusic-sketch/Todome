'use client';

import { useState, useCallback } from 'react';

interface TableCreatorProps {
  onCreateTable: (rows: number, cols: number) => void;
}

const MAX_ROWS = 8;
const MAX_COLS = 8;

export const TableCreator = ({ onCreateTable }: TableCreatorProps) => {
  const [hoveredRow, setHoveredRow] = useState(0);
  const [hoveredCol, setHoveredCol] = useState(0);

  const handleMouseEnter = useCallback((row: number, col: number) => {
    setHoveredRow(row);
    setHoveredCol(col);
  }, []);

  const handleClick = useCallback(
    (row: number, col: number) => {
      onCreateTable(row, col);
    },
    [onCreateTable],
  );

  return (
    <div className="p-2">
      <div className="mb-2 text-xs text-text-secondary text-center">
        {hoveredRow > 0 && hoveredCol > 0
          ? `${hoveredRow} x ${hoveredCol}`
          : 'Select dimensions'}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}>
        {Array.from({ length: MAX_ROWS }, (_, rowIndex) =>
          Array.from({ length: MAX_COLS }, (_, colIndex) => {
            const row = rowIndex + 1;
            const col = colIndex + 1;
            const isHighlighted = row <= hoveredRow && col <= hoveredCol;
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                className={`w-5 h-5 rounded-sm border transition-colors ${
                  isHighlighted
                    ? 'bg-accent/20 border-accent/40'
                    : 'bg-bg-secondary border-border hover:border-accent/30'
                }`}
                onMouseEnter={() => handleMouseEnter(row, col)}
                onClick={() => handleClick(row, col)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
};
