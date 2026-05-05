import { useState, useEffect } from "react";

const UPDATE_EVENT = "wf:session-storage-update";

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // sessionStorage can throw in Safari private mode / iframes with
    // restricted storage access — fall back to the in-memory state.
    return fallback;
  }
}

/**
 * Drop-in replacement for useState that persists to sessionStorage.
 * Survives navigation between routes within the same browser tab, but is
 * cleared when the tab is closed.  Use for "still here when I come back"
 * state like the currently-fetched verse, the AI tab the operator was on,
 * or the lyric verse they were viewing.
 *
 * Cross-instance sync mirrors useLocalStorage: a custom DOM event keeps any
 * other instance for the same key in step within the same tab.
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() =>
    readStorage(key, initialValue),
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (detail?.key === key) {
        setStoredValue((prev) => readStorage(key, prev));
      }
    };
    window.addEventListener(UPDATE_EVENT, handler);
    return () => window.removeEventListener(UPDATE_EVENT, handler);
  }, [key]);

  const setValue = (value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(key, JSON.stringify(next));
          window.dispatchEvent(
            new CustomEvent(UPDATE_EVENT, { detail: { key } }),
          );
        } catch {}
      }
      return next;
    });
  };

  return [storedValue, setValue];
}
