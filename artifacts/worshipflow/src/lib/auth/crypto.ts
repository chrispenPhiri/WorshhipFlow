/**
 * Local password hashing via PBKDF2 (SubtleCrypto).
 *
 * Credentials never leave the browser — this is purely to avoid storing the
 * plaintext password in IndexedDB. Each user has their own random salt and
 * the iteration count is recorded with the hash so we can rotate later
 * without invalidating older accounts.
 */

const ALGO = "PBKDF2";
const HASH = "SHA-256";
const KEY_LEN_BYTES = 32;
export const DEFAULT_ITERATIONS = 200_000;
export const SALT_LEN_BYTES = 16;

export interface PasswordRecord {
  salt: string; // base64
  hash: string; // base64
  iterations: number;
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    ALGO,
    false,
    ["deriveBits"],
  );
  // Slice into a plain ArrayBuffer — TS's lib.dom typing for SubtleCrypto
  // rejects Uint8Array<ArrayBufferLike> (which may overlap a SharedArrayBuffer).
  const saltBuf = salt.slice().buffer;
  const bits = await crypto.subtle.deriveBits(
    { name: ALGO, salt: saltBuf, iterations, hash: HASH },
    baseKey,
    KEY_LEN_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<PasswordRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN_BYTES));
  const key = await deriveBits(password, salt, DEFAULT_ITERATIONS);
  return { salt: toB64(salt), hash: toB64(key), iterations: DEFAULT_ITERATIONS };
}

/** Constant-time compare of two equal-length byte buffers. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  record: PasswordRecord,
): Promise<boolean> {
  const salt = fromB64(record.salt);
  const expected = fromB64(record.hash);
  const key = await deriveBits(password, salt, record.iterations);
  return constantTimeEqual(key, expected);
}
