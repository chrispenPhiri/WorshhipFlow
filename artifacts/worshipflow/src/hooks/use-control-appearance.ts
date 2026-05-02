import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  applyAppearance, clearAppearance, isBroadcastPath, loadAppearance, saveAppearance,
  STORAGE_KEY, type ControlAppearance,
} from "@/lib/control-appearance";

/**
 * Reads the operator's saved control-screen appearance, applies it to the document on mount,
 * and exposes setters that update both state and CSS custom properties live.
 *
 * Cross-tab/window sync via the `storage` event so changes in one window propagate to others.
 * No-op on the /broadcast route so the projection screen never inherits operator preferences.
 *
 * Uses useLayoutEffect for route/appearance changes so the new vars are applied (or cleared)
 * BEFORE the browser paints — eliminates the one-frame flicker that would otherwise occur on
 * same-window SPA transitions between control routes and /broadcast.
 */
export function useControlAppearance() {
  const [appearance, setAppearanceState] = useState<ControlAppearance>(loadAppearance);
  const [location] = useLocation();

  useLayoutEffect(() => {
    if (isBroadcastPath(location)) clearAppearance();
    else applyAppearance(appearance);
  }, [appearance, location]);

  // Sync from other tabs/windows (storage event is async by nature, useEffect is fine here)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
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
 * Mount this once at the App root so the theme stays in sync on cross-tab updates and on
 * SPA navigation between control screen and /broadcast in the same window.
 *
 * NOTE: First-paint application is handled by an inline script in index.html, which prevents FOUC.
 * This hook is the React-side runtime sync. Route-based clear/apply runs synchronously before paint
 * via useLayoutEffect so transitioning into /broadcast never shows a stale themed frame.
 */
export function useApplyControlAppearance() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    if (isBroadcastPath(location)) clearAppearance();
    else applyAppearance(loadAppearance());
  }, [location]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (isBroadcastPath()) clearAppearance();
      else applyAppearance(loadAppearance());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
