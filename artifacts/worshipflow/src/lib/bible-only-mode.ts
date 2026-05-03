import { useEffect, useState } from "react";

const STORAGE_KEY = "wf-bible-only-mode";
const CHANGE_EVENT = "wf-bible-only-mode-change";

export const BIBLE_ONLY_ALLOWED_PATHS: readonly string[] = ["/", "/settings"];

function read(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw !== null ? Boolean(JSON.parse(raw)) : false;
  } catch {
    return false;
  }
}

/**
 * Reactive Bible-only-mode hook.  Two components reading this hook stay
 * in sync within the same tab via a tiny CustomEvent broadcast on every
 * write — the global `useLocalStorage` hook only re-renders the writer,
 * so we use this dedicated channel for app-wide state instead.
 *
 * Cross-tab updates also work via the native `storage` event.
 */
export function useBibleOnlyMode() {
  const [enabled, setEnabledState] = useState<boolean>(() =>
    typeof window === "undefined" ? false : read(),
  );

  useEffect(() => {
    const onChange = () => setEnabledState(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabledState(read());
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setEnabled = (next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setEnabledState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { enabled, setEnabled };
}

export function isPathAllowedInBibleOnly(path: string): boolean {
  return BIBLE_ONLY_ALLOWED_PATHS.includes(path);
}
