'use client';

import type { CalendarProvider } from '@todome/db';
import { Calendar } from 'lucide-react';

type Props = {
  provider: CalendarProvider;
  size?: number;
  className?: string;
};

export const ProviderIcon = ({ provider, size = 14, className }: Props) => {
  switch (provider) {
    case 'google':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="Google Calendar">
          <path d="M18 3h-1V1h-2v2H9V1H7v2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" fill="#4285F4" />
          <rect x="6" y="9" width="12" height="10" rx="0" fill="white" />
          <path d="M8 13h3v3H8z" fill="#34A853" />
          <path d="M13 13h3v3h-3z" fill="#FBBC04" />
          <path d="M8 9h3v3H8z" fill="#EA4335" />
          <path d="M13 9h3v3h-3z" fill="#4285F4" />
        </svg>
      );
    case 'outlook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="Outlook">
          <rect x="3" y="3" width="18" height="18" rx="2" fill="#0078D4" />
          <ellipse cx="10" cy="13" rx="4" ry="4.5" fill="white" />
          <ellipse cx="10" cy="13" rx="2.5" ry="3" fill="#0078D4" />
          <rect x="15" y="8" width="4" height="1.5" rx="0.5" fill="white" opacity="0.8" />
          <rect x="15" y="11" width="4" height="1.5" rx="0.5" fill="white" opacity="0.8" />
          <rect x="15" y="14" width="4" height="1.5" rx="0.5" fill="white" opacity="0.8" />
        </svg>
      );
    case 'apple':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="Apple Calendar">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="#FF3B30" />
          <path d="M3 9h18v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9z" fill="white" />
          <text x="12" y="18.5" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#333" fontFamily="system-ui">
            {new Date().getDate()}
          </text>
        </svg>
      );
    default:
      return <Calendar size={size} className={className ?? 'text-text-secondary'} />;
  }
};
