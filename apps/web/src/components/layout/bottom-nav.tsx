'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, CheckSquare, BookOpen, Calendar, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from '@todome/store';

type BottomNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const BottomNav = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const items: BottomNavItem[] = [
    { href: '/notes', label: t('nav.notes'), icon: FileText },
    { href: '/todos', label: t('nav.todos'), icon: CheckSquare },
    { href: '/diary', label: t('nav.diary'), icon: BookOpen },
    { href: '/calendar', label: t('nav.calendar'), icon: Calendar },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <nav className="shrink-0 border-t glass">
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
