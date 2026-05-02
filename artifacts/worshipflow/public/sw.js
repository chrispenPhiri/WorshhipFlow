/* Phiri WorshipFlow — service worker.
 *
 * Strategy:
 *   • App shell (the index.html and its hashed JS/CSS bundles) → cache-first
 *     so the UI loads instantly even without a network connection. This is
 *     what makes the app installable as a PWA and usable offline.
 *   • Bible API and fonts.googleapis fetches → stale-while-revalidate so
 *     verses you've looked at before stay readable offline.
 *   • Anything that looks like /api/* is bypassed — those requests are
 *     intercepted in JS land by `src/lib/local-api` (IndexedDB) and never
 *     reach the network.
 *   • POSTs / PUTs / DELETEs are always passed straight through.
 *
 * The cache version is bumped per release; old caches are wiped on activate.
 */

const VERSION = "wf-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const NAV_CACHE = `${VERSION}-nav`;

// Resolve the BASE_URL from the worker's own scope.  When the artifact is
// hosted at, e.g. `/worshipflow/`, the SW is registered with that scope and
// `self.registration.scope` ends with the same trailing slash.  We need this
// to know which URL to fall back to for offline navigations.
function getBasePath() {
  try {
    return new URL(self.registration.scope).pathname;
  } catch {
    return "/";
  }
}

self.addEventListener("install", (event) => {
  // Pre-cache nothing eagerly — let the runtime cache fill on first visit.
  // Skip waiting so a fresh worker takes over without a manual reload.
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isShellAsset(url) {
  // Same-origin GETs for assets / icons / manifest.  HTML/navigation requests
  // are handled separately so we can cache the rendered document.
  return (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".json")
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return new Response("Offline and asset not cached.", { status: 503, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

/**
 * Navigation handler — network-first, cache-fallback.
 *
 * Why we cache the response (not just match a static index): the React app is
 * an SPA so any route (e.g. /worshipflow/songs) must serve the SAME index
 * document.  We cache every successful navigation under the BASE_URL key so
 * the next offline navigation — to ANY route — returns it.
 *
 * Falls back to BASE_URL or BASE_URL+"index.html" if the live response failed
 * before we ever cached anything.
 */
async function handleNavigation(request) {
  const cache = await caches.open(NAV_CACHE);
  const base = getBasePath();
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Store under the BASE_URL key so future deep-link reloads find it.
      cache.put(base, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const fallback =
      (await cache.match(base)) ||
      (await cache.match(base + "index.html")) ||
      (await cache.match("/")) ||
      (await cache.match("/index.html"));
    return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return; // never cache writes

  let url;
  try { url = new URL(request.url); } catch { return; }

  // Bypass /api/* — handled by the JS-side local API.
  if (url.origin === self.location.origin && isApiRequest(url)) return;

  // Navigation requests (HTML page loads) — network-first, cache-fallback.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  // App shell assets — cache-first.
  if (url.origin === self.location.origin && isShellAsset(url)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Bible API + Google Fonts — stale-while-revalidate so previously-seen
  // verses keep working offline.
  if (
    url.hostname === "bible-api.com" ||
    url.hostname.endsWith("googleapis.com") ||
    url.hostname.endsWith("gstatic.com")
  ) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});
