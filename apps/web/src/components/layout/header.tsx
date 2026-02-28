'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useUiStore } from '@todome/store';

const SECTION_TITLES: Record<string, string> = {
  '/notes': 'メモ',
  '/todos': 'Todo',
  '/calendar': 'カレンダー',
  '/settings': '設定',
};

const getSectionTitle = (pathname: string): string => {
  for (const [path, title] of Object.entries(SECTION_TITLES)) {
    if (pathname.startsWith(path)) return title;
  }
  return 'Todome';
};

export const Header = () => {
  const pathname = usePathname();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const title = getSectionTitle(pathname);

  return (
    <header className="flex items-center gap-3 border-b glass px-4 py-2.5 md:hidden">
      <button
        type="button"
        onClick={toggleSidebar}
        className="rounded-md p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition"
        aria-label="メニューを開く"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-base font-semibold text-text-primary">{title}</h1>
    </header>
  );
};
