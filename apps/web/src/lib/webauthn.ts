/**
 * WebAuthn passkey utilities for note lock/unlock.
 * Uses platform authenticators (Face ID, Touch ID, Windows Hello).
 * Client-side only — biometric success/failure is sufficient for note unlock.
 */

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function isWebAuthnSupported(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    !navigator.credentials
  ) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerPasskey(
  userId: string,
  userName: string,
): Promise<string> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(userId);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Todome',
        id: location.hostname,
      },
      user: {
        id: userIdBytes,
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      attestation: 'none',
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Passkey registration was cancelled');
  }

  return bufferToBase64(credential.rawId);
}

export async function authenticatePasskey(
  credentialIdBase64: string,
): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: base64ToBuffer(credentialIdBase64),
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return assertion !== null;
  } catch {
    return false;
  }
}
