/**
 * Captures the browser's `beforeinstallprompt` event so we can show our own
 * "Install App" button anywhere in the app, then triggers the native install
 * dialog when the user clicks it.
 *
 * The prompt is only fired by the browser when the page meets PWA criteria
 * (manifest + service worker + same-origin) — on iOS Safari it never fires,
 * which is fine; users add the app via Share → Add to Home Screen.
 */

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    listeners.forEach(l => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach(l => l());
  });
}

export function useInstallPrompt(): { canInstall: boolean; promptInstall: () => Promise<boolean> } {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force(n => n + 1);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const canInstall = deferred !== null;
  async function promptInstall(): Promise<boolean> {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    listeners.forEach(l => l());
    return outcome === "accepted";
  }
  return { canInstall, promptInstall };
}

/** True once the page is running in standalone (installed) mode. */
export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    // iOS Safari standalone flag
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
