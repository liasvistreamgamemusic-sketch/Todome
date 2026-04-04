import { playNotificationSound } from './sound';

export function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function isNotificationSupported(): boolean {
  if (isTauriEnv()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isTauriEnv()) {
    try {
      // Dynamic import with variable to avoid TS module resolution in web builds
      const modulePath = '@tauri-apps/plugin-notification';
      const mod = await (import(/* webpackIgnore: true */ modulePath) as Promise<{
        isPermissionGranted: () => Promise<boolean>;
        requestPermission: () => Promise<string>;
      }>);
      let granted = await mod.isPermissionGranted();
      if (!granted) {
        const permission = await mod.requestPermission();
        granted = permission === 'granted';
      }
      return granted;
    } catch {
      // Plugin not available — still allow toggling the setting
      // so the client-side scheduler can run
      return true;
    }
  }

  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function sendNotification(
  title: string,
  body: string,
  options?: { sound?: boolean },
): Promise<void> {
  if (options?.sound) {
    playNotificationSound();
  }

  if (isTauriEnv()) {
    try {
      const modulePath = '@tauri-apps/plugin-notification';
      const mod = await (import(/* webpackIgnore: true */ modulePath) as Promise<{
        sendNotification: (opts: { title: string; body: string }) => void;
      }>);
      mod.sendNotification({ title, body });
    } catch {
      // Tauri notification plugin not available
    }
    return;
  }

  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, { body, icon: '/icons/icon-180.png' });
}
