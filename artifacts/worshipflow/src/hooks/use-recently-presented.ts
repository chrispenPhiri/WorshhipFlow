import { useCallback, useEffect, useState } from "react";

export type RecentItemType = "verse" | "song" | "note" | "text";

export interface RecentItem {
  id: string;
  type: RecentItemType;
  title: string;
  subtitle?: string;
  presentedAt: number;
  payload?: Record<string, unknown>;
}

const STORAGE_KEY = "wf-recent-items";
const MAX_ITEMS = 12;

function readStorage(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((it) => it && typeof it.id === "string" && typeof it.title === "string");
  } catch {
    return [];
  }
}

function writeStorage(items: RecentItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function useRecentlyPresented() {
  const [items, setItems] = useState<RecentItem[]>(() => readStorage());

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStorage());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const add = useCallback((entry: Omit<RecentItem, "presentedAt">) => {
    setItems((prev) => {
      const next = [
        { ...entry, presentedAt: Date.now() },
        ...prev.filter((it) => it.id !== entry.id),
      ].slice(0, MAX_ITEMS);
      writeStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    writeStorage([]);
  }, []);

  return { items, add, remove, clear };
}
