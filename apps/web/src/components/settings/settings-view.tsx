'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Sun,
  Moon,
  Monitor,
  Download,
  FileJson,
  FileText,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import {
  useUiStore,
  useNoteStore,
  useTodoStore,
  useCalendarStore,
} from '@todome/store';
import type { Theme, FontSize, Locale, CalendarWeekStart } from '@todome/store';
import { Button } from '@todome/ui';
import { clsx } from 'clsx';
import { exportToJSON, exportToMarkdown } from './export-data';

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
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150',
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

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
  { value: 'xlarge', label: '特大' },
];

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
];

const WEEK_START_OPTIONS: { value: CalendarWeekStart; label: string }[] = [
  { value: 0, label: '日曜' },
  { value: 1, label: '月曜' },
];

export const SettingsView = () => {
  const { setTheme, theme: currentTheme } = useTheme();
  const uiTheme = useUiStore((s) => s.theme);
  const fontSize = useUiStore((s) => s.fontSize);
  const locale = useUiStore((s) => s.locale);
  const calendarWeekStart = useUiStore((s) => s.calendarWeekStart);
  const setUiTheme = useUiStore((s) => s.setTheme);
  const setFontSize = useUiStore((s) => s.setFontSize);
  const setLocale = useUiStore((s) => s.setLocale);
  const setCalendarWeekStart = useUiStore((s) => s.setCalendarWeekStart);

  const notes = useNoteStore((s) => s.notes);
  const todos = useTodoStore((s) => s.todos);
  const events = useCalendarStore((s) => s.events);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Load persisted settings from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('todome-settings');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        if (typeof parsed.notificationsEnabled === 'boolean') {
          setNotificationsEnabled(parsed.notificationsEnabled);
        }
        if (typeof parsed.soundEnabled === 'boolean') {
          setSoundEnabled(parsed.soundEnabled);
        }
        if (typeof parsed.lastSyncTime === 'string') {
          setLastSyncTime(parsed.lastSyncTime);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist notification/sound settings to localStorage
  const persistSettings = useCallback(
    (updates: Record<string, unknown>) => {
      if (typeof window === 'undefined') return;

      try {
        const stored = localStorage.getItem('todome-settings');
        const current = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
        const merged = { ...current, ...updates };
        localStorage.setItem('todome-settings', JSON.stringify(merged));
      } catch {
        // Ignore storage errors
      }
    },
    [],
  );

  // Persist UI store settings to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const uiSettings = { theme: uiTheme, fontSize, locale, calendarWeekStart };
      localStorage.setItem('todome-ui-settings', JSON.stringify(uiSettings));
    } catch {
      // Ignore storage errors
    }
  }, [uiTheme, fontSize, locale, calendarWeekStart]);

  // Load UI settings from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('todome-ui-settings');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        if (parsed.theme) setUiTheme(parsed.theme as Theme);
        if (parsed.fontSize) setFontSize(parsed.fontSize as FontSize);
        if (parsed.locale) setLocale(parsed.locale as Locale);
        if (typeof parsed.calendarWeekStart === 'number') {
          setCalendarWeekStart(parsed.calendarWeekStart as CalendarWeekStart);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    (enabled: boolean) => {
      setNotificationsEnabled(enabled);
      persistSettings({ notificationsEnabled: enabled });

      if (enabled && typeof Notification !== 'undefined') {
        Notification.requestPermission();
      }
    },
    [persistSettings],
  );

  const handleSoundToggle = useCallback(
    (enabled: boolean) => {
      setSoundEnabled(enabled);
      persistSettings({ soundEnabled: enabled });
    },
    [persistSettings],
  );

  const handleExportJSON = useCallback(() => {
    exportToJSON(notes, todos, events);
  }, [notes, todos, events]);

  const handleExportMarkdown = useCallback(() => {
    exportToMarkdown(notes);
  }, [notes]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const { syncEngine } = await import('@todome/db');
      await syncEngine.sync();
      const now = new Date().toISOString();
      setLastSyncTime(now);
      persistSettings({ lastSyncTime: now });
    } catch {
      // Sync failed
    } finally {
      setIsSyncing(false);
    }
  }, [persistSettings]);

  const handleLogout = useCallback(async () => {
    try {
      const { supabase } = await import('@todome/db');
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch {
      // Sign out failed
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold text-text-primary">設定</h1>

      <div className="space-y-8">
        {/* Appearance */}
        <SettingsSection title="外観" description="テーマやフォントサイズを変更します">
          <SettingsRow label="テーマ">
            <SegmentedControl<Theme>
              value={uiTheme}
              onChange={handleThemeChange}
              options={[
                { value: 'light', label: 'ライト', icon: <Sun className="h-3.5 w-3.5" /> },
                { value: 'dark', label: 'ダーク', icon: <Moon className="h-3.5 w-3.5" /> },
                { value: 'system', label: 'システム', icon: <Monitor className="h-3.5 w-3.5" /> },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="フォントサイズ">
            <SegmentedControl<FontSize>
              value={fontSize}
              onChange={setFontSize}
              options={FONT_SIZE_OPTIONS}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Language */}
        <SettingsSection title="言語" description="表示言語を選択します">
          <SettingsRow label="言語">
            <SegmentedControl<Locale>
              value={locale}
              onChange={setLocale}
              options={LOCALE_OPTIONS}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="通知" description="通知とサウンドの設定">
          <SettingsRow
            label="通知"
            description="リマインダーやイベントの通知を受け取ります"
          >
            <ToggleSwitch
              checked={notificationsEnabled}
              onChange={handleNotificationToggle}
              label="通知を有効にする"
            />
          </SettingsRow>
          <SettingsRow
            label="サウンド"
            description="通知音を鳴らします"
          >
            <ToggleSwitch
              checked={soundEnabled}
              onChange={handleSoundToggle}
              label="サウンドを有効にする"
            />
          </SettingsRow>
        </SettingsSection>

        {/* Calendar */}
        <SettingsSection title="カレンダー" description="カレンダーの表示設定">
          <SettingsRow label="週の開始日">
            <SegmentedControl<CalendarWeekStart>
              value={calendarWeekStart}
              onChange={setCalendarWeekStart}
              options={WEEK_START_OPTIONS}
            />
          </SettingsRow>
        </SettingsSection>

        {/* Data */}
        <SettingsSection title="データ" description="データのエクスポートと同期">
          <SettingsRow
            label="JSONエクスポート"
            description="すべてのデータをJSON形式でエクスポートします"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportJSON}
            >
              <FileJson className="h-4 w-4" />
              エクスポート
            </Button>
          </SettingsRow>
          <SettingsRow
            label="Markdownエクスポート"
            description="メモをMarkdown形式のZIPファイルでエクスポートします"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportMarkdown}
            >
              <FileText className="h-4 w-4" />
              エクスポート
            </Button>
          </SettingsRow>
          <SettingsRow
            label="同期"
            description={
              lastSyncTime
                ? `最終同期: ${new Date(lastSyncTime).toLocaleString('ja-JP')}`
                : '未同期'
            }
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSync}
              loading={isSyncing}
            >
              <RefreshCw className={clsx('h-4 w-4', isSyncing && 'animate-spin')} />
              同期する
            </Button>
          </SettingsRow>
        </SettingsSection>

        {/* Account */}
        <SettingsSection title="アカウント" description="アカウントの管理">
          <SettingsRow
            label="メールアドレス"
            description={userEmail ?? '未ログイン'}
          >
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </Button>
          </SettingsRow>
        </SettingsSection>
      </div>
    </div>
  );
};
