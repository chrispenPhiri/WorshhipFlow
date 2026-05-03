/**
 * Tiny IndexedDB wrapper for the offline local API.
 *
 * One database, four object stores:
 *   - `songs`      keyPath `id` (auto-increment via meta), one row per song
 *   - `notes`      keyPath `id`, one row per sermon note
 *   - `schedules`  keyPath `id`, one row per service schedule
 *   - `singletons` keyPath `key`, holds the single rows for `screen` + `settings`
 *
 * Why IndexedDB and not localStorage?  Songs/notes can grow well past
 * localStorage's ~5 MB cap, and IDB lets us read by key without parsing the
 * whole library.  Same-origin tabs share the database, so the operator and
 * broadcast window read identical data automatically.
 */

const DB_NAME = "wf-local-api";
const DB_VERSION = 2;

export type StoreName = "songs" | "notes" | "schedules" | "singletons" | "users";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // v1 stores
      if (!db.objectStoreNames.contains("songs")) {
        db.createObjectStore("songs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("schedules")) {
        db.createObjectStore("schedules", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("singletons")) {
        db.createObjectStore("singletons", { keyPath: "key" });
      }
      // v2 — local user accounts (username/password stored as PBKDF2 hash)
      if (!db.objectStoreNames.contains("users")) {
        const users = db.createObjectStore("users", { keyPath: "id" });
        users.createIndex("usernameLower", "usernameLower", { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, store: StoreName, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
}

/** Look up a single record via a named index. */
export async function getByIndex<T>(
  store: StoreName,
  indexName: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  const db = await openDb();
  return wrap<T | undefined>(tx(db, store, "readonly").index(indexName).get(key));
}

/** Count rows in a store (used to detect first-run / empty user list). */
export async function count(store: StoreName): Promise<number> {
  const db = await openDb();
  return wrap<number>(tx(db, store, "readonly").count());
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  return wrap<T[]>(tx(db, store, "readonly").getAll());
}

export async function getById<T>(store: StoreName, id: number | string): Promise<T | undefined> {
  const db = await openDb();
  return wrap<T | undefined>(tx(db, store, "readonly").get(id));
}

export async function put<T>(store: StoreName, value: T): Promise<T> {
  const db = await openDb();
  await wrap(tx(db, store, "readwrite").put(value as unknown as object));
  return value;
}

export async function del(store: StoreName, id: number | string): Promise<void> {
  const db = await openDb();
  await wrap(tx(db, store, "readwrite").delete(id));
}

export interface StoreReplacement<T extends object = object> {
  store: StoreName;
  rows: T[];
  /** Predicate over EXISTING rows: returning true keeps that row instead of deleting it. */
  keep?: (row: unknown) => boolean;
}

/**
 * Replace one or more object stores in a single multi-store readwrite IDB
 * transaction. Either every store is fully replaced, or — on any failure
 * (validation, key constraints, quota) — the whole transaction aborts and
 * NOTHING is committed. This is the primary primitive for backup-restore so
 * a malformed `users` store can't leave `songs` already overwritten.
 *
 * Each entry's optional `keep(row)` predicate is evaluated against existing
 * rows in that store before any deletes are scheduled, so callers can preserve
 * specific rows (e.g. the `_backup:folder` handle in `singletons`).
 */
export async function replaceAcrossStores(plan: StoreReplacement[]): Promise<void> {
  if (plan.length === 0) return;
  const db = await openDb();
  const stores = plan.map(p => p.store);
  const t = db.transaction(stores, "readwrite");

  // Pre-fetch existing rows for every store so `keep` predicates run against
  // a stable snapshot before any delete/put is queued.
  const existingByStore = await Promise.all(
    plan.map(p => wrap<unknown[]>(t.objectStore(p.store).getAll())),
  );

  for (let i = 0; i < plan.length; i++) {
    const { store, rows, keep } = plan[i];
    const s = t.objectStore(store);
    const keyPath = (s.keyPath as string) || "id";
    for (const row of existingByStore[i]) {
      if (keep && keep(row)) continue;
      const key = (row as Record<string, IDBValidKey>)[keyPath];
      if (key !== undefined) s.delete(key);
    }
    for (const row of rows) s.put(row);
  }

  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error ?? new Error("Transaction failed"));
    t.onabort = () => reject(t.error ?? new Error("Transaction aborted"));
  });
}

/** Convenience wrapper for replacing a single store atomically. */
export async function replaceAll<T extends object>(
  store: StoreName,
  rows: T[],
  keep?: (row: unknown) => boolean,
): Promise<void> {
  return replaceAcrossStores([{ store, rows, keep }]);
}

/**
 * Auto-increment IDs are tracked inside the `singletons` store under
 * `key: "_seq:<storeName>"` so we don't need a second IDB store just for
 * counters.  Returns the next integer for the given store.
 */
export async function nextId(store: "songs" | "notes" | "schedules"): Promise<number> {
  const db = await openDb();
  const seqKey = `_seq:${store}`;
  const singletons = tx(db, "singletons", "readwrite");
  const existing = (await wrap(singletons.get(seqKey))) as { key: string; value: number } | undefined;
  const next = (existing?.value ?? 0) + 1;
  await wrap(singletons.put({ key: seqKey, value: next }));
  return next;
}
