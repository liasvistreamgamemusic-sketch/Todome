// ---------------------------------------------------------------------------
// Web Push subscription management
// ---------------------------------------------------------------------------

import { supabase, upsertPushSubscription, deletePushSubscription } from '@todome/db';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Promise that rejects after `ms` milliseconds. */
function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms),
    ),
  ]);
}

/**
 * Subscribe to Web Push and persist the subscription in Supabase.
 * Returns true on success, false on failure.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[push] not supported or VAPID key missing');
    return false;
  }

  const userId = await getUserId();
  if (!userId) {
    console.warn('[push] no authenticated user');
    return false;
  }

  try {
    const registration = await timeout(navigator.serviceWorker.ready, 5_000);
    const existing = await registration.pushManager.getSubscription();

    if (existing) {
      await persistSubscription(userId, existing);
      return true;
    }

    const subscription = await timeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      }),
      10_000,
    );

    await persistSubscription(userId, subscription);
    return true;
  } catch (err) {
    console.error('[push] subscribe failed:', err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  const userId = await getUserId();

  try {
    const registration = await timeout(navigator.serviceWorker.ready, 5_000);
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await subscription.unsubscribe();

    if (userId) {
      await deletePushSubscription(userId, subscription.endpoint);
    }
  } catch (err) {
    console.error('[push] unsubscribe failed:', err);
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await timeout(navigator.serviceWorker.ready, 5_000);
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

async function persistSubscription(
  userId: string,
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) {
    console.warn('[push] subscription missing keys');
    return;
  }

  await upsertPushSubscription(userId, {
    endpoint: subscription.endpoint,
    p256dh,
    auth,
  });
}
