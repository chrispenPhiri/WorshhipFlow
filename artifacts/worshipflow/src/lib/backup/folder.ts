/**
 * Backup-folder integration via the File System Access API.
 *
 * The user picks a folder once; the granted `FileSystemDirectoryHandle` is
 * structured-clone-stored in the IndexedDB `singletons` store under
 * `_backup:folder`. On reload we try to re-acquire permission silently;
 * if the browser requires a user gesture we surface a "Reconnect" button.
 *
 * On every Save the app writes a single rolling file `worshipflow-backup.json`
 * inside the chosen folder, plus a timestamped copy under `history/` so the
 * user has a few days of point-in-time backups they can restore from.
 */

import { getById, put, del } from "../local-api/db";
import {
  buildSnapshot,
  Snapshot,
  validateSnapshot,
  restoreSnapshot,
} from "./snapshot";

const HANDLE_KEY = "_backup:folder";
const ROLLING_FILE = "worshipflow-backup.json";
const HISTORY_DIR = "history";
const HISTORY_KEEP = 10;

interface StoredHandle {
  key: typeof HANDLE_KEY;
  handle: FileSystemDirectoryHandle;
  name: string;
  connectedAt: string;
  lastSavedAt: string | null;
}

export interface BackupFolderStatus {
  supported: boolean;
  connected: boolean;
  name: string | null;
  permission: "granted" | "denied" | "prompt" | null;
  lastSavedAt: string | null;
}

export function isFolderApiSupported(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as {
    showDirectoryPicker?: unknown;
  }).showDirectoryPicker === "function";
}

async function loadStored(): Promise<StoredHandle | null> {
  const row = await getById<StoredHandle>("singletons", HANDLE_KEY);
  return row ?? null;
}

async function queryPerm(handle: FileSystemDirectoryHandle): Promise<"granted" | "denied" | "prompt"> {
  const h = handle as unknown as {
    queryPermission?: (opts: { mode: "readwrite" }) => Promise<PermissionState>;
  };
  if (!h.queryPermission) return "granted"; // older browsers — assume ok
  try {
    return (await h.queryPermission({ mode: "readwrite" })) as "granted" | "denied" | "prompt";
  } catch {
    return "prompt";
  }
}

async function requestPerm(handle: FileSystemDirectoryHandle): Promise<"granted" | "denied" | "prompt"> {
  const h = handle as unknown as {
    requestPermission?: (opts: { mode: "readwrite" }) => Promise<PermissionState>;
  };
  if (!h.requestPermission) return "granted";
  try {
    return (await h.requestPermission({ mode: "readwrite" })) as "granted" | "denied" | "prompt";
  } catch {
    return "denied";
  }
}

export async function getBackupFolderStatus(): Promise<BackupFolderStatus> {
  const supported = isFolderApiSupported();
  if (!supported) {
    return { supported: false, connected: false, name: null, permission: null, lastSavedAt: null };
  }
  const stored = await loadStored();
  if (!stored) {
    return { supported: true, connected: false, name: null, permission: null, lastSavedAt: null };
  }
  const permission = await queryPerm(stored.handle);
  return {
    supported: true,
    connected: true,
    name: stored.name,
    permission,
    lastSavedAt: stored.lastSavedAt,
  };
}

/** User-gesture handler: prompt for a folder and persist the handle. */
export async function connectBackupFolder(): Promise<BackupFolderStatus> {
  if (!isFolderApiSupported()) {
    throw new Error("Your browser doesn't support folder backups. Use Chrome or Edge.");
  }
  const w = window as unknown as {
    showDirectoryPicker: (opts: { mode: "readwrite" }) => Promise<FileSystemDirectoryHandle>;
  };
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await w.showDirectoryPicker({ mode: "readwrite" });
  } catch (err) {
    if ((err as DOMException)?.name === "AbortError") {
      throw new Error("Folder pick cancelled.");
    }
    throw err;
  }
  // Make sure we actually have readwrite permission before persisting.
  const perm = (await queryPerm(handle)) === "granted"
    ? "granted"
    : await requestPerm(handle);
  if (perm !== "granted") {
    throw new Error("Permission to write to that folder was denied.");
  }
  const stored: StoredHandle = {
    key: HANDLE_KEY,
    handle,
    name: handle.name,
    connectedAt: new Date().toISOString(),
    lastSavedAt: null,
  };
  await put("singletons", stored);
  return getBackupFolderStatus();
}

export async function disconnectBackupFolder(): Promise<void> {
  await del("singletons", HANDLE_KEY);
}

/**
 * Re-prompt for permission if the browser dropped it across reloads.
 * Must be called from a user gesture (button click) since `requestPermission`
 * requires one.
 */
export async function reconnectBackupFolder(): Promise<BackupFolderStatus> {
  const stored = await loadStored();
  if (!stored) throw new Error("No backup folder is set.");
  const perm = await requestPerm(stored.handle);
  if (perm !== "granted") {
    throw new Error("Folder access was denied. Pick a different folder or reconnect.");
  }
  return getBackupFolderStatus();
}

/** Write a fresh snapshot to the configured folder. Returns the filename written. */
export async function saveBackupToFolder(): Promise<{ rolling: string; archived: string }> {
  const stored = await loadStored();
  if (!stored) throw new Error("No backup folder is connected.");
  const perm = await queryPerm(stored.handle);
  if (perm !== "granted") {
    // One last attempt — the caller is expected to be a user gesture.
    const upgraded = await requestPerm(stored.handle);
    if (upgraded !== "granted") {
      throw new Error("Folder access was lost. Click Reconnect.");
    }
  }
  const snap = await buildSnapshot();
  const json = JSON.stringify(snap, null, 2);

  // Rolling file at the top level for easy "open the latest backup".
  await writeJson(stored.handle, ROLLING_FILE, json);

  // Archive copy in history/, then prune oldest beyond HISTORY_KEEP.
  const histDir = await stored.handle.getDirectoryHandle(HISTORY_DIR, { create: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archived = `worshipflow-${stamp}.json`;
  await writeJson(histDir, archived, json);
  await pruneHistory(histDir);

  const updated: StoredHandle = { ...stored, lastSavedAt: new Date().toISOString() };
  await put("singletons", updated);
  return { rolling: ROLLING_FILE, archived: `${HISTORY_DIR}/${archived}` };
}

async function writeJson(dir: FileSystemDirectoryHandle, name: string, body: string): Promise<void> {
  const file = await dir.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(body);
  await writable.close();
}

async function pruneHistory(dir: FileSystemDirectoryHandle): Promise<void> {
  const names: string[] = [];
  // `entries()` is on FileSystemDirectoryHandle but not in lib.dom yet.
  const iter = (dir as unknown as {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  }).entries();
  for await (const [name, handle] of iter) {
    if (handle.kind === "file" && name.startsWith("worshipflow-") && name.endsWith(".json")) {
      names.push(name);
    }
  }
  if (names.length <= HISTORY_KEEP) return;
  names.sort(); // ISO-stamped names sort chronologically
  const toDelete = names.slice(0, names.length - HISTORY_KEEP);
  for (const name of toDelete) {
    try {
      await dir.removeEntry(name);
    } catch {
      // best-effort prune
    }
  }
}

/** Read the rolling backup file from the connected folder and restore it. */
export async function restoreFromFolder(): Promise<{ counts: Snapshot["counts"] }> {
  const stored = await loadStored();
  if (!stored) throw new Error("No backup folder is connected.");
  const perm = await queryPerm(stored.handle);
  if (perm !== "granted") {
    const upgraded = await requestPerm(stored.handle);
    if (upgraded !== "granted") throw new Error("Folder access was lost. Click Reconnect.");
  }
  let fileHandle: FileSystemFileHandle;
  try {
    fileHandle = await stored.handle.getFileHandle(ROLLING_FILE);
  } catch {
    throw new Error(`No "${ROLLING_FILE}" found in the connected folder.`);
  }
  const file = await fileHandle.getFile();
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Backup file in folder is not valid JSON.");
  }
  validateSnapshot(parsed);
  await restoreSnapshot(parsed);
  return { counts: parsed.counts };
}
