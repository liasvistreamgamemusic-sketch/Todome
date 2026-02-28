'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, CheckSquare, Calendar, Search } from 'lucide-react';
import { useUiStore } from '@todome/store';
import { clsx } from 'clsx';

type BottomNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: () => void;
};

export const BottomNav = () => {
  const pathname = usePathname();
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);

  const items: BottomNavItem[] = [
    { href: '/notes', label: 'メモ', icon: FileText },
    { href: '/todos', label: 'Todo', icon: CheckSquare },
    { href: '/calendar', label: 'カレンダー', icon: Calendar },
    { href: '#search', label: '検索', icon: Search, action: toggleCommandPalette },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t glass md:hidden">
      <ul
        className="flex items-center justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {items.map(({ href, label, icon: Icon, action }) => {
          const isActive = href !== '#search' && pathname.startsWith(href);

          if (action) {
            return (
              <li key={href} className="flex-1">
                <button
                  type="button"
                  onClick={action}
                  className="flex w-full flex-col items-center gap-0.5 py-2 text-text-tertiary transition hover:text-text-primary"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px]">{label}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={clsx(
                  'flex flex-col items-center gap-0.5 py-2 transition',
                  isActive
                    ? 'text-accent'
                    : 'text-text-tertiary hover:text-text-primary',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
