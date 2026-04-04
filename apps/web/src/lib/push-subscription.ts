// ---------------------------------------------------------------------------
// Web Push subscription management
//
// Subscribes the browser to push notifications via the Push API and persists
// the subscription in Supabase so the server can send pushes later.
// ---------------------------------------------------------------------------

import { supabase, upsertPushSubscription, deletePushSubscription } from '@todome/db';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/** Convert URL-safe base64 VAPID key to Uint8Array (applicationServerKey format). */
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

/** Check whether the Push API is available and VAPID key is configured. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

/** Get the current user ID from Supabase auth session. */
async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Subscribe to Web Push and persist the subscription in Supabase.
 * Returns true on success, false if permissions denied or unavailable.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const userId = await getUserId();
  if (!userId) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();

    // Already subscribed — make sure DB is in sync
    if (existing) {
      await persistSubscription(userId, existing);
      return true;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });

    await persistSubscription(userId, subscription);
    return true;
  } catch {
    return false;
  }
}

/**
 * Unsubscribe from Web Push and remove the subscription from Supabase.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  const userId = await getUserId();

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await subscription.unsubscribe();

    if (userId) {
      await deletePushSubscription(userId, subscription.endpoint);
    }
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Check whether the browser currently has an active push subscription.
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function persistSubscription(
  userId: string,
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) return;

  await upsertPushSubscription(userId, {
    endpoint: subscription.endpoint,
    p256dh,
    auth,
  });
}
