/**
 * Persistent storage helpers.
 *
 * By default browsers may evict an origin's IndexedDB data under storage
 * pressure. Calling `navigator.storage.persist()` asks the browser to mark
 * this origin as persistent so it won't be auto-evicted. Installed PWAs are
 * usually granted automatically; in regular tabs the browser may still grant
 * silently based on engagement.
 */

export type PersistState = "persisted" | "transient" | "unsupported";

export async function getPersistState(): Promise<PersistState> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) {
    return "unsupported";
  }
  try {
    return (await navigator.storage.persisted()) ? "persisted" : "transient";
  } catch {
    return "unsupported";
  }
}

export async function requestPersistent(): Promise<PersistState> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return "unsupported";
  }
  try {
    const granted = await navigator.storage.persist();
    return granted ? "persisted" : "transient";
  } catch {
    return "unsupported";
  }
}

/**
 * Fire-and-forget request. We call this once on app boot when the user has
 * installed the PWA — installed apps essentially always get granted, and
 * silently calling it costs nothing if it's already persistent.
 */
export function requestPersistentSilently(): void {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
  navigator.storage.persisted().then(already => {
    if (!already) navigator.storage.persist().catch(() => {});
  }).catch(() => {});
}
