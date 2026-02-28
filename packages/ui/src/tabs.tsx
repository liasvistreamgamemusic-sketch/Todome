'use client';

import React, { useState, useCallback, useRef, useId } from 'react';
import { clsx } from 'clsx';

type Tab = {
  value: string;
  label: string;
  disabled?: boolean;
};

type TabsProps = {
  tabs: Tab[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

type TabPanelProps = {
  value: string;
  children: React.ReactNode;
  className?: string;
};

export function Tabs({
  tabs,
  value: controlledValue,
  defaultValue,
  onChange,
  children,
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? tabs[0]?.value ?? '',
  );
  const tabListRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();

  const activeValue = controlledValue ?? internalValue;

  const handleSelect = useCallback(
    (tabValue: string) => {
      if (controlledValue === undefined) {
        setInternalValue(tabValue);
      }
      onChange?.(tabValue);
    },
    [controlledValue, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      const currentIndex = enabledTabs.findIndex((t) => t.value === activeValue);

      let newIndex = -1;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          newIndex = currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = enabledTabs.length - 1;
          break;
      }

      if (newIndex >= 0) {
        const newTab = enabledTabs[newIndex];
        if (newTab) {
          handleSelect(newTab.value);
          const tabEl = tabListRef.current?.querySelector<HTMLButtonElement>(
            `[data-tab-value="${newTab.value}"]`,
          );
          tabEl?.focus();
        }
      }
    },
    [tabs, activeValue, handleSelect],
  );

  return (
    <div className={className}>
      <div
        ref={tabListRef}
        role="tablist"
        aria-orientation="horizontal"
        className="flex border-b border-[var(--border)]"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.value === activeValue;
          return (
            <button
              key={tab.value}
              role="tab"
              type="button"
              id={`tab-${uniqueId}-${tab.value}`}
              aria-selected={isActive}
              aria-controls={`panel-${uniqueId}-${tab.value}`}
              aria-disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
              data-tab-value={tab.value}
              disabled={tab.disabled}
              onClick={() => handleSelect(tab.value)}
              className={clsx(
                'relative px-4 py-2 text-sm font-medium',
                'transition-colors duration-150 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset',
                isActive
                  ? 'text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary',
                tab.disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement<TabPanelProps>(child)) return null;
        const panelValue = child.props.value;
        return (
          <div
            key={panelValue}
            role="tabpanel"
            id={`panel-${uniqueId}-${panelValue}`}
            aria-labelledby={`tab-${uniqueId}-${panelValue}`}
            hidden={panelValue !== activeValue}
            tabIndex={0}
            className={child.props.className}
          >
            {panelValue === activeValue && child.props.children}
          </div>
        );
      })}
    </div>
  );
}

export function TabPanel({ children, className }: TabPanelProps) {
  return <div className={className}>{children}</div>;
}
