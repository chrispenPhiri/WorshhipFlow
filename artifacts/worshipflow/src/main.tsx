import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installLocalApi } from "./lib/local-api";
import { runOneTimeMigration } from "./lib/local-api/migrate";

// One-time migration — best-effort hydration of IndexedDB from the live
// server for users who already had data when this release shipped.  Must
// run BEFORE `installLocalApi()` so its fetches still reach the real
// Express server, not the local handlers.  Async, but doesn't block React
// mount — the worst case is the user sees an empty library for a moment
// and then it populates on the next refetch.
runOneTimeMigration();

// Install the offline local API BEFORE React mounts so the very first
// React Query fetches go to IndexedDB instead of the (possibly absent)
// Express server.  Idempotent.
installLocalApi();

// Register the service worker for PWA install + asset caching.  Skip on
// the broadcast route — it shouldn't trigger an install prompt of its own.
// Skip in dev because Vite HMR + service workers conflict.
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  !/\/broadcast(?:\/|$)/.test(location.pathname)
) {
  // Resolve the SW URL against Vite's base path so the worker registers
  // under whichever subpath the artifact is mounted on.
  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL }).catch(() => {
      // No-op: a failed SW registration just means no offline asset cache.
      // The app still works because the local API runs in JS land.
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
