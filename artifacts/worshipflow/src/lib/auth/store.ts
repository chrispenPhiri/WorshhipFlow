/**
 * Local-account user store + session.
 *
 * Users live in the IndexedDB `users` store with an index on `usernameLower`
 * for case-insensitive uniqueness. Sessions live in localStorage and have no
 * expiry — this is a single-device PWA, so "log out" is the only way to end
 * a session.
 */

import { count, getById, getByIndex, put } from "@/lib/local-api/db";
import { hashPassword, verifyPassword, PasswordRecord } from "./crypto";

const SESSION_KEY = "wf-auth-session";
const SESSION_CHANNEL = "wf-auth-session";

export interface UserRecord {
  id: string;             // crypto.randomUUID()
  username: string;       // display casing
  usernameLower: string;  // normalised key for the index
  displayName: string;
  password: PasswordRecord;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
}

export interface Session {
  userId: string;
  username: string;
  displayName: string;
}

const USERNAME_RE = /^[a-zA-Z0-9_.\-]{3,32}$/;

export function validateUsername(username: string): string | null {
  if (!username) return "Username is required.";
  if (!USERNAME_RE.test(username)) {
    return "Username must be 3–32 characters: letters, numbers, '.', '_' or '-'.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password.length > 200) return "Password is too long.";
  return null;
}

function toPublic(u: UserRecord): PublicUser {
  return { id: u.id, username: u.username, displayName: u.displayName };
}

export async function userCount(): Promise<number> {
  return count("users");
}

export async function findUserByUsername(
  username: string,
): Promise<UserRecord | undefined> {
  return getByIndex<UserRecord>("users", "usernameLower", username.toLowerCase());
}

export async function signupUser(input: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<PublicUser> {
  const u = input.username.trim();
  const usernameErr = validateUsername(u);
  if (usernameErr) throw new Error(usernameErr);
  const pwErr = validatePassword(input.password);
  if (pwErr) throw new Error(pwErr);

  const existing = await findUserByUsername(u);
  if (existing) throw new Error("That username is already taken on this device.");

  // UUID id — local-only, but eliminates any millisecond-collision edge
  // case (and works in every modern browser; randomUUID is in the secure
  // context that PWAs always run in).
  const userId = crypto.randomUUID();
  const password = await hashPassword(input.password);
  const now = new Date().toISOString();
  const rec: UserRecord = {
    id: userId,
    username: u,
    usernameLower: u.toLowerCase(),
    displayName: (input.displayName ?? u).trim() || u,
    password,
    createdAt: now,
    lastLoginAt: now,
  };
  await put("users", rec);
  return toPublic(rec);
}

export async function loginUser(input: {
  username: string;
  password: string;
}): Promise<PublicUser> {
  const u = input.username.trim();
  if (!u || !input.password) throw new Error("Username and password are required.");
  const rec = await findUserByUsername(u);
  if (!rec) throw new Error("No account with that username on this device.");
  const ok = await verifyPassword(input.password, rec.password);
  if (!ok) throw new Error("Incorrect password.");
  const updated: UserRecord = { ...rec, lastLoginAt: new Date().toISOString() };
  await put("users", updated);
  return toPublic(updated);
}

// ── Session (localStorage) ────────────────────────────────────────────────

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(SESSION_CHANNEL);
  return channel;
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (typeof parsed.userId !== "string" || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(s: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  getChannel()?.postMessage({ type: "login", session: s });
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  getChannel()?.postMessage({ type: "logout" });
}

export function subscribeSession(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  const ch = getChannel();
  const onMsg = () => cb();
  ch?.addEventListener("message", onMsg);
  return () => {
    window.removeEventListener("storage", onStorage);
    ch?.removeEventListener("message", onMsg);
  };
}

/** Confirm the session still matches a real local user (account may have been deleted in another tab). */
export async function rehydrateSession(s: Session): Promise<PublicUser | null> {
  const rec = await getById<UserRecord>("users", s.userId);
  if (!rec) return null;
  return toPublic(rec);
}
