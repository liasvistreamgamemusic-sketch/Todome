'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, CheckSquare, BookOpen, Calendar, Settings } from 'lucide-react';
import { clsx } from 'clsx';

type BottomNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const BottomNav = () => {
  const pathname = usePathname();

  const items: BottomNavItem[] = [
    { href: '/notes', label: 'メモ', icon: FileText },
    { href: '/todos', label: 'Todo', icon: CheckSquare },
    { href: '/diary', label: '日記', icon: BookOpen },
    { href: '/calendar', label: 'カレンダー', icon: Calendar },
    { href: '/settings', label: '設定', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t glass">
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <ul className="flex items-center justify-around">
          {items.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);

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
      </div>
    </nav>
  );
};
