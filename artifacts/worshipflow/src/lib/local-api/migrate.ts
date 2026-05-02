/**
 * One-time migration: hydrate IndexedDB from the live server on first run.
 *
 * Why: existing users had songs / sermon notes / schedules / settings /
 * screen state stored in PostgreSQL.  After this release the React app no
 * longer talks to that database — it reads/writes IndexedDB.  Without this
 * migration, those users would open the app and see empty libraries.
 *
 * The migration runs *before* `installLocalApi()` so the fetch calls below
 * still hit the real Express server.  After it finishes (or is skipped) we
 * record a flag in localStorage so it never runs twice.
 *
 * Safe to fail: if the server is unreachable, returns the user a fresh empty
 * library.  Migration is best-effort, never blocking — total budget ~3s.
 */

import { put, getAll } from "./db";

const MIGRATION_KEY = "wf-local-api-migrated-v1";
const PER_REQUEST_TIMEOUT_MS = 3000;

// IMPORTANT: capture the *original* fetch at module load, before
// `installLocalApi()` has a chance to monkey-patch `window.fetch`.  The
// migration must hit the real server — if it went through the local API
// it would always read empty IndexedDB and conclude there's nothing to
// import.  Module load order in main.tsx guarantees this snapshot happens
// before installation.
const originalFetch: typeof fetch | null =
  typeof window !== "undefined" && typeof window.fetch === "function"
    ? window.fetch.bind(window)
    : null;

async function fetchWithTimeout(url: string, ms: number): Promise<unknown | null> {
  if (!originalFetch) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await originalFetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function isStoreEmpty(store: "songs" | "notes" | "schedules"): Promise<boolean> {
  try {
    const rows = await getAll(store);
    return rows.length === 0;
  } catch {
    return true;
  }
}

/**
 * Runs once per device.  Idempotent.  Never throws.  Must be called BEFORE
 * `installLocalApi()` so the fetch calls reach the actual server.
 */
export async function runOneTimeMigration(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_KEY) === "1") return;

  // Only attempt migration when we have network and the local stores are
  // empty (first install) — never overwrite local edits.
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  if (!online) return; // Will retry on next launch.

  try {
    const [songsEmpty, notesEmpty, schedulesEmpty] = await Promise.all([
      isStoreEmpty("songs"),
      isStoreEmpty("notes"),
      isStoreEmpty("schedules"),
    ]);

    const tasks: Promise<void>[] = [];

    if (songsEmpty) {
      tasks.push((async () => {
        const rows = (await fetchWithTimeout("/api/songs", PER_REQUEST_TIMEOUT_MS)) as
          | Array<{ id: number }> | null;
        if (Array.isArray(rows)) {
          for (const row of rows) await put("songs", row);
          // Bump the auto-increment counter past the largest imported id.
          const maxId = rows.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
          if (maxId > 0) await put("singletons", { key: "_seq:songs", value: maxId });
        }
      })());
    }
    if (notesEmpty) {
      tasks.push((async () => {
        const rows = (await fetchWithTimeout("/api/notes", PER_REQUEST_TIMEOUT_MS)) as
          | Array<{ id: number }> | null;
        if (Array.isArray(rows)) {
          for (const row of rows) await put("notes", row);
          const maxId = rows.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
          if (maxId > 0) await put("singletons", { key: "_seq:notes", value: maxId });
        }
      })());
    }
    if (schedulesEmpty) {
      tasks.push((async () => {
        const rows = (await fetchWithTimeout("/api/schedules", PER_REQUEST_TIMEOUT_MS)) as
          | Array<{ id: number }> | null;
        if (Array.isArray(rows)) {
          for (const row of rows) await put("schedules", row);
          const maxId = rows.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
          if (maxId > 0) await put("singletons", { key: "_seq:schedules", value: maxId });
        }
      })());
    }

    // Settings + screen — only seed if absent.  We let the read-side handlers
    // merge defaults, so partial server rows are still acceptable.
    tasks.push((async () => {
      const settings = await fetchWithTimeout("/api/settings", PER_REQUEST_TIMEOUT_MS);
      if (settings && typeof settings === "object") {
        await put("singletons", { key: "settings", value: settings });
      }
    })());
    tasks.push((async () => {
      const screen = await fetchWithTimeout("/api/screen", PER_REQUEST_TIMEOUT_MS);
      if (screen && typeof screen === "object") {
        await put("singletons", { key: "screen", value: screen });
      }
    })());

    await Promise.all(tasks);
  } catch {
    // Swallow — migration failure must never block app boot.
  } finally {
    // Mark complete even on partial failure: we've made our best attempt and
    // don't want to keep hammering the server every time the app starts.
    try { localStorage.setItem(MIGRATION_KEY, "1"); } catch { /* ignore */ }
  }
}
