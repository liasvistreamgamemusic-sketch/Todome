#!/usr/bin/env node
/**
 * Generate VAPID keys for Web Push notifications.
 *
 * Usage:
 *   node scripts/generate-vapid-keys.mjs
 */

import { createECDH } from 'node:crypto';

const ecdh = createECDH('prime256v1');
ecdh.generateKeys();

const publicKey = ecdh.getPublicKey('base64url');
const privateKey = ecdh.getPrivateKey('base64url');

console.log('\n=== VAPID Keys for Web Push ===\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('\nAdd these to:');
console.log('  - apps/web/.env.local (NEXT_PUBLIC_VAPID_PUBLIC_KEY)');
console.log('  - Supabase Dashboard > Edge Functions > Secrets (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)');
console.log('');
