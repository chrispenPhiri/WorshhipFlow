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
const DB_VERSION = 1;

export type StoreName = "songs" | "notes" | "schedules" | "singletons";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
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
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, store: StoreName, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
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
