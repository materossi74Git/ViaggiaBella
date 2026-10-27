/**
 * Servizio di sicurezza crittografica per PIN personale e sblocco rapido.
 * Utilizza Web Crypto API con algoritmo PBKDF2 (SHA-256) e salt crittografico casuale.
 * Nessun PIN viene mai memorizzato in chiaro.
 */

export async function generateSalt(length = 16): Promise<string> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBytes = new Uint8Array(
    salt.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign']
  );

  const exported = await crypto.subtle.exportKey('raw', derivedKey);
  const hashArray = Array.from(new Uint8Array(exported));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(
  enteredPin: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const computedHash = await hashPin(enteredPin, storedSalt);
    return computedHash === storedHash;
  } catch (error) {
    console.error('Errore durante la verifica del PIN:', error);
    return false;
  }
}

/**
 * Verifica se l'autenticazione biometrica (Touch ID, Face ID, Windows Hello) è disponibile sul dispositivo.
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }
  return false;
}
