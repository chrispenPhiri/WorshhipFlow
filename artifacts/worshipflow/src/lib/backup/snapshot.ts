/**
 * Build and restore a single-file backup of the entire local library.
 *
 * The snapshot includes everything stored in the local IndexedDB: songs,
 * notes, schedules, singletons (screen / settings / sequence counters), and
 * the local user accounts (their PBKDF2 hashes — never plaintext passwords).
 * The backup-folder directory handle is intentionally excluded since handles
 * are bound to the device that granted them and are useless elsewhere.
 */

import { getAll, replaceAcrossStores } from "../local-api/db";

export const SNAPSHOT_KIND = "phiri-worshipflow-backup";
export const SNAPSHOT_VERSION = 1;
const BACKUP_HANDLE_KEY = "_backup:folder";

export interface Snapshot {
  app: typeof SNAPSHOT_KIND;
  version: number;
  exportedAt: string;
  counts: { songs: number; notes: number; schedules: number; users: number };
  data: {
    songs: unknown[];
    notes: unknown[];
    schedules: unknown[];
    /** singletons store — `_backup:folder` is filtered out before export */
    singletons: unknown[];
    users: unknown[];
  };
}

export async function buildSnapshot(): Promise<Snapshot> {
  const [songs, notes, schedules, singletons, users] = await Promise.all([
    getAll<unknown>("songs"),
    getAll<unknown>("notes"),
    getAll<unknown>("schedules"),
    getAll<unknown>("singletons"),
    getAll<unknown>("users"),
  ]);
  const filteredSingletons = (singletons as Array<{ key?: string }>).filter(
    row => row?.key !== BACKUP_HANDLE_KEY,
  );
  return {
    app: SNAPSHOT_KIND,
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      songs: songs.length,
      notes: notes.length,
      schedules: schedules.length,
      users: users.length,
    },
    data: {
      songs,
      notes,
      schedules,
      singletons: filteredSingletons,
      users,
    },
  };
}

/**
 * Validate that the parsed JSON looks like a snapshot we know how to restore.
 * Throws a descriptive error otherwise; callers surface this to the user.
 */
export function validateSnapshot(input: unknown): asserts input is Snapshot {
  if (!input || typeof input !== "object") {
    throw new Error("That file isn't a Phiri WorshipFlow backup.");
  }
  const obj = input as Record<string, unknown>;
  if (obj.app !== SNAPSHOT_KIND) {
    throw new Error("That file isn't a Phiri WorshipFlow backup.");
  }
  if (typeof obj.version !== "number" || obj.version > SNAPSHOT_VERSION) {
    throw new Error(
      `Backup was made by a newer version of the app (v${String(obj.version)}). Update first.`,
    );
  }
  const data = obj.data as Record<string, unknown> | undefined;
  if (
    !data ||
    !Array.isArray(data.songs) ||
    !Array.isArray(data.notes) ||
    !Array.isArray(data.schedules) ||
    !Array.isArray(data.singletons) ||
    !Array.isArray(data.users)
  ) {
    throw new Error("Backup file is missing required sections.");
  }
}

/**
 * Replace the entire local library with the contents of the snapshot in a
 * SINGLE multi-store IDB transaction so a failure in any one store aborts
 * the whole restore — no half-restored library. `_backup:folder` in the
 * current singletons store is preserved so the user doesn't have to
 * reconnect their backup folder after a restore.
 */
export async function restoreSnapshot(snapshot: Snapshot): Promise<void> {
  validateSnapshot(snapshot);
  const { data } = snapshot;
  await replaceAcrossStores([
    { store: "songs", rows: data.songs as object[] },
    { store: "notes", rows: data.notes as object[] },
    { store: "schedules", rows: data.schedules as object[] },
    { store: "users", rows: data.users as object[] },
    {
      store: "singletons",
      rows: data.singletons as object[],
      keep: row => (row as { key?: string })?.key === BACKUP_HANDLE_KEY,
    },
  ]);
}

/** Trigger a browser download of the current snapshot as a JSON file. */
export async function downloadSnapshot(): Promise<{ filename: string; bytes: number }> {
  const snap = await buildSnapshot();
  const json = JSON.stringify(snap, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const filename = defaultBackupFilename();

  // Prefer the modern File System Access save picker when available — it
  // gives the user a real "Save As" dialog and lets them pick the location.
  // Fallback to a plain anchor download for Safari / Firefox.
  const w = window as unknown as {
    showSaveFilePicker?: (opts: {
      suggestedName: string;
      types: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle>;
  };
  if (typeof w.showSaveFilePicker === "function") {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "WorshipFlow backup", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { filename, bytes: blob.size };
    } catch (err) {
      // User cancelled the dialog — bail without falling back to the
      // anchor download (which would silently save to Downloads).
      if ((err as DOMException)?.name === "AbortError") {
        throw new Error("Save cancelled.");
      }
      // Any other failure → fall through to the anchor fallback.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { filename, bytes: blob.size };
}

export function defaultBackupFilename(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `worshipflow-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
}

/** Open a file picker, parse the chosen file, and restore from it. */
export async function pickAndRestoreSnapshot(): Promise<{ counts: Snapshot["counts"] }> {
  const file = await pickJsonFile();
  if (!file) throw new Error("No file selected.");
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  validateSnapshot(parsed);
  await restoreSnapshot(parsed);
  return { counts: parsed.counts };
}

async function pickJsonFile(): Promise<File | null> {
  const w = window as unknown as {
    showOpenFilePicker?: (opts: {
      multiple: boolean;
      types: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle[]>;
  };
  if (typeof w.showOpenFilePicker === "function") {
    try {
      const [handle] = await w.showOpenFilePicker({
        multiple: false,
        types: [{ description: "WorshipFlow backup", accept: { "application/json": [".json"] } }],
      });
      return await handle.getFile();
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return null;
    }
  }
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
