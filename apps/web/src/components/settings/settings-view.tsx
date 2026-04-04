'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Sun,
  Moon,
  Monitor,
  FileJson,
  FileText,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useUiStore, useTranslation } from '@todome/store';
import type { Theme, FontSize, Locale, CalendarWeekStart } from '@todome/store';
import { Button } from '@todome/ui';
import { clsx } from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { useNotes, useTodos, useCalendarEvents } from '@/hooks/queries';
import { exportToJSON, exportToMarkdown } from './export-data';
import { SubscriptionManager } from './subscription-manager';
import { SharedCalendarManager } from './shared-calendar-manager';
import { requestNotificationPermission, sendNotification, isTauriEnv } from '@/lib/notifications';
import {
  isPushSupported,
  isPushSubscribed as checkPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-subscription';

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

const SettingsSection = ({
  title,
  description,
  children,
}: SettingsSectionProps) => (
  <section className="space-y-4">
    <div>
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
      )}
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

type SettingsRowProps = {
  label: string;
  description?: string;
  children: React.ReactNode;
};

const SettingsRow = ({ label, description, children }: SettingsRowProps) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-bg-primary px-4 py-3">
    <div className="min-w-0">
      <p className="text-sm font-medium text-text-primary">{label}</p>
      {description && (
        <p className="text-xs text-text-secondary mt-0.5">{description}</p>
      )}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

type SegmentedControlProps<T extends string | number> = {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
};

const SegmentedControl = <T extends string | number>({
  value,
  onChange,
  options,
}: SegmentedControlProps<T>) => (
  <div className="inline-flex rounded-lg border border-[var(--border)] bg-bg-secondary p-0.5">
    {options.map((option) => (
      <button
        key={String(option.value)}
        type="button"
        onClick={() => onChange(option.value)}
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors duration-150 md:py-1.5',
          value === option.value
            ? 'bg-bg-primary text-text-primary shadow-sm'
            : 'text-text-secondary hover:text-text-primary',
        )}
      >
        {option.icon}
        {option.label}
      </button>
    ))}
  </div>
);

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

const ToggleSwitch = ({ checked, onChange, label }: ToggleSwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={clsx(
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
      checked ? 'bg-[var(--accent)]' : 'bg-bg-tertiary',
    )}
  >
    <span
      className={clsx(
        'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
        checked ? 'translate-x-5' : 'translate-x-0',
      )}
    />
  </button>
);

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
];

export const SettingsView = () => {
  const { t } = useTranslation();
  const { setTheme } = useTheme();
  const uiTheme = useUiStore((s) => s.theme);
  const fontSize = useUiStore((s) => s.fontSize);
  const locale = useUiStore((s) => s.locale);
  const calendarWeekStart = useUiStore((s) => s.calendarWeekStart);
  const notificationsEnabled = useUiStore((s) => s.notificationsEnabled);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const setUiTheme = useUiStore((s) => s.setTheme);
  const setFontSize = useUiStore((s) => s.setFontSize);
  const setLocale = useUiStore((s) => s.setLocale);
  const setCalendarWeekStart = useUiStore((s) => s.setCalendarWeekStart);
  const setNotificationsEnabled = useUiStore((s) => s.setNotificationsEnabled);
  const setSoundEnabled = useUiStore((s) => s.setSoundEnabled);

  const { data: notes } = useNotes();
  const { data: todos } = useTodos();
  const { data: events } = useCalendarEvents();

  const queryClient = useQueryClient();

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [pushSubscribed, setPushSubscribed] = useState<boolean | null>(null);
  const [pushSubscribing, setPushSubscribing] = useState(false);

  // Load last sync time from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('todome-settings');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        if (typeof parsed.lastSyncTime === 'string') {
          setLastSyncTime(parsed.lastSyncTime);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Check push subscription status
  useEffect(() => {
    if (isTauriEnv() || !isPushSupported()) {
      setPushSubscribed(null);
      return;
    }
    checkPushSubscribed().then(setPushSubscribed);
  }, [notificationsEnabled]);

  // Load user email from Supabase
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { supabase } = await import('@todome/db');
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          setUserEmail(data.user.email);
        }
      } catch {
        // Supabase not available
      }
    };
    loadUser();
  }, []);

  const handleThemeChange = useCallback(
    (value: Theme) => {
      setUiTheme(value);
      setTheme(value);
    },
    [setUiTheme, setTheme],
  );

  const handleNotificationToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        setPushSubscribing(true);
        const granted = await requestNotificationPermission();
        if (!granted) {
          setPushSubscribing(false);
          return;
        }
        setNotificationsEnabled(true);
        // Auto-subscribe to push (web/PWA only)
        if (isPushSupported() && !isTauriEnv()) {
          const ok = await subscribeToPush();
          setPushSubscribed(ok);
        }
        setPushSubscribing(false);
        // Send test notification
        sendNotification(
          t('notification.test.title'),
          t('notification.test.body'),
          { sound: soundEnabled },
        );
      } else {
        setNotificationsEnabled(false);
        // Unsubscribe from push
        if (isPushSupported() && !isTauriEnv()) {
          await unsubscribeFromPush();
          setPushSubscribed(false);
        }
      }
    },
    [setNotificationsEnabled, soundEnabled, t],
  );

  const handleSoundToggle = useCallback(
    (enabled: boolean) => {
      setSoundEnabled(enabled);
    },
    [setSoundEnabled],
  );

  const handleExportJSON = useCallback(() => {
    exportToJSON(notes ?? [], todos ?? [], events ?? []);
  }, [notes, todos, events]);

  const handleExportMarkdown = useCallback(() => {
    exportToMarkdown(notes ?? []);
  }, [notes]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await queryClient.invalidateQueries();
      const now = new Date().toISOString();
      setLastSyncTime(now);
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('todome-settings');
          const current = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
          localStorage.setItem('todome-settings', JSON.stringify({ ...current, lastSyncTime: now }));
        } catch {
          // Ignore
        }
      }
    } catch {
      // Sync failed
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient]);

  const handleLogout = useCallback(async () => {
    try {
      const { supabase } = await import('@todome/db');
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch {
      // Sign out failed
    }
  }, []);

  const fontSizeOptions = [
    { value: 'small' as FontSize, label: t('settings.fontSize.small') },
    { value: 'medium' as FontSize, label: t('settings.fontSize.medium') },
    { value: 'large' as FontSize, label: t('settings.fontSize.large') },
    { value: 'xlarge' as FontSize, label: t('settings.fontSize.xlarge') },
  ];

  const weekStartOptions = [
    { value: 0 as CalendarWeekStart, label: t('settings.calendar.weekStart.sunday') },
    { value: 1 as CalendarWeekStart, label: t('settings.calendar.weekStart.monday') },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold text-text-primary">{t('settings.title')}</h1>

      <div className="space-y-8">
        {/* Appearance */}
        <SettingsSection title={t('settings.appearance')} description={t('settings.appearance.description')}>
          <SettingsRow label={t('settings.theme')}>
            <SegmentedControl<Theme>
              value={uiTheme}
              onChange={handleThemeChange}
              options={[
                { value: 'light', label: t('settings.theme.light'), icon: <Sun className="h-3.5 w-3.5" /> },
                { value: 'dark', label: t('settings.theme.dark'), icon: <Moon className="h-3.5 w-3.5" /> },
                { value: 'system', label: t('settings.theme.system'), icon: <Monitor className="h-3.5 w-3.5" /> },
              ]}
            />
          </SettingsRow>
          <SettingsRow label={t('settings.fontSize')}>
            <SegmentedControl<FontSize>
              value={fontSize}
              onChange={setFontSize}
              options={fontSizeOptions}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Language */}
        <SettingsSection title={t('settings.language')} description={t('settings.language.description')}>
          <SettingsRow label={t('settings.language.label')}>
            <SegmentedControl<Locale>
              value={locale}
              onChange={setLocale}
              options={LOCALE_OPTIONS}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title={t('settings.notifications')} description={t('settings.notifications.description')}>
          <SettingsRow
            label={t('settings.notifications.label')}
            description={
              pushSubscribing
                ? t('settings.notifications.push.subscribing')
                : notificationsEnabled && !isTauriEnv() && isPushSupported()
                  ? pushSubscribed
                    ? t('settings.notifications.push.subscribed')
                    : t('settings.notifications.push.notSubscribed')
                  : t('settings.notifications.detail')
            }
          >
            <ToggleSwitch
              checked={notificationsEnabled}
              onChange={handleNotificationToggle}
              label={t('settings.notifications.enable')}
            />
          </SettingsRow>
          <SettingsRow
            label={t('settings.sound')}
            description={t('settings.sound.detail')}
          >
            <ToggleSwitch
              checked={soundEnabled}
              onChange={handleSoundToggle}
              label={t('settings.sound.enable')}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Calendar */}
        <SettingsSection title={t('settings.calendar')} description={t('settings.calendar.description')}>
          <SettingsRow label={t('settings.calendar.weekStart')}>
            <SegmentedControl<CalendarWeekStart>
              value={calendarWeekStart}
              onChange={setCalendarWeekStart}
              options={weekStartOptions}
            />
          </SettingsRow>
          <SubscriptionManager />
        </SettingsSection>

        {/* Shared Calendars */}
        <SettingsSection title={t('settings.sharedCalendar')} description={t('settings.sharedCalendar.description')}>
          <SharedCalendarManager />
        </SettingsSection>

        {/* Data */}
        <SettingsSection title={t('settings.data')} description={t('settings.data.description')}>
          <SettingsRow
            label={t('settings.data.jsonExport')}
            description={t('settings.data.jsonExport.detail')}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportJSON}
            >
              <FileJson className="h-4 w-4" />
              {t('common.export')}
            </Button>
          </SettingsRow>
          <SettingsRow
            label={t('settings.data.markdownExport')}
            description={t('settings.data.markdownExport.detail')}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportMarkdown}
            >
              <FileText className="h-4 w-4" />
              {t('common.export')}
            </Button>
          </SettingsRow>
          <SettingsRow
            label={t('settings.data.sync')}
            description={
              lastSyncTime
                ? t('settings.data.sync.lastSync', { time: new Date(lastSyncTime).toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US') })
                : t('settings.data.sync.notSynced')
            }
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSync}
              loading={isSyncing}
            >
              <RefreshCw className={clsx('h-4 w-4', isSyncing && 'animate-spin')} />
              {t('settings.data.sync.button')}
            </Button>
          </SettingsRow>
        </SettingsSection>

        {/* Account */}
        <SettingsSection title={t('settings.account')} description={t('settings.account.description')}>
          <SettingsRow
            label={t('settings.account.email')}
            description={userEmail ?? t('settings.account.notLoggedIn')}
          >
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              {t('settings.account.logout')}
            </Button>
          </SettingsRow>
        </SettingsSection>
      </div>
    </div>
  );
};
