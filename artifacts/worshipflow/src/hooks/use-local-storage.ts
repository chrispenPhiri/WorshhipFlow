import { useState, useEffect } from "react";

const UPDATE_EVENT = "wf:storage-update";

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Drop-in replacement for useState that persists to localStorage.
 * Value is serialized as JSON. Falls back to `initialValue` on first use.
 * Cross-instance sync: when any instance in the same tab updates the value,
 * all other instances for the same key are notified via a custom DOM event.
 */
export function useLocalStorage<T>(
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
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent(UPDATE_EVENT, { detail: { key } }),
        );
      } catch {}
      return next;
    });
  };

  return [storedValue, setValue];
}
