const PBKDF2_ITERATIONS = 100_000;
const HASH_LENGTH = 256; // bits

export async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...salt));
}

export async function hashPassword(password: string, saltBase64: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_LENGTH,
  );
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function verifyPassword(
  password: string,
  saltBase64: string,
  storedHashBase64: string,
): Promise<boolean> {
  const computedHash = await hashPassword(password, saltBase64);
  return computedHash === storedHashBase64;
}
