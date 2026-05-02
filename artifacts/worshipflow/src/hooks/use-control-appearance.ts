import { useCallback, useEffect, useState } from "react";
import {
  applyAppearance, loadAppearance, saveAppearance,
  type ControlAppearance,
} from "@/lib/control-appearance";

const STORAGE_EVENT_KEY = "wf-control-appearance";

/**
 * Reads the operator's saved control-screen appearance, applies it to the document on mount,
 * and exposes setters that update both state and CSS custom properties live.
 *
 * Cross-tab/window sync via the `storage` event so changes in one window propagate to others.
 */
export function useControlAppearance() {
  const [appearance, setAppearanceState] = useState<ControlAppearance>(loadAppearance);

  // Apply on mount and whenever the appearance object changes
  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  // Sync from other tabs/windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_EVENT_KEY) return;
      setAppearanceState(loadAppearance());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setAppearance = useCallback((patch: Partial<ControlAppearance>) => {
    setAppearanceState(prev => {
      const next = { ...prev, ...patch };
      saveAppearance(next);
      return next;
    });
  }, []);

  return { appearance, setAppearance };
}

/**
 * Lightweight version that ONLY applies the saved appearance — no setters, no state.
 * Mount this once at the App root so the theme is applied before pages render.
 * Consumers that need to read or change the appearance should use `useControlAppearance` instead.
 */
export function useApplyControlAppearance() {
  useEffect(() => {
    applyAppearance(loadAppearance());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_EVENT_KEY) return;
      applyAppearance(loadAppearance());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
