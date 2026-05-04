/**
 * Offline local API — fetch interceptor.
 *
 * Installs a `window.fetch` wrapper that diverts every `/api/*` request to
 * an IndexedDB-backed handler.  Side effects:
 *
 *   • All React Query hooks generated from the OpenAPI spec keep working
 *     unchanged — they still call `fetch("/api/songs")` etc.
 *   • The Express server is no longer required for songs / notes /
 *     schedule / screen state / settings; data persists on the user's
 *     device and survives browser restarts.
 *   • The operator window and broadcast window stay in sync: every screen
 *     update posts on a BroadcastChannel that other tabs invalidate React
 *     Query against.
 *
 * Pass-through (still hit the real network):
 *   • POST `/api/teachings/generate` — needs the OpenAI proxy.
 *   • All non-`/api/*` URLs — Bible API, fonts, assets, etc.
 *
 * Call `installLocalApi()` exactly once, before React mounts.
 */

import * as h from "./handlers";

type FetchFn = typeof fetch;

const PASSTHROUGH_PATHS = new Set<string>([
  "/api/teachings/generate",
]);

const PASSTHROUGH_PREFIXES = [
  "/api/ai/",
  "/api/bible/",
];

function isApiPath(path: string): boolean {
  return path.startsWith("/api/") || path === "/api";
}

function shouldPassThrough(path: string): boolean {
  if (PASSTHROUGH_PATHS.has(path)) return true;
  for (const prefix of PASSTHROUGH_PREFIXES) {
    if (path.startsWith(prefix)) return true;
  }
  return false;
}

function getUrlFromInput(input: RequestInfo | URL): URL | null {
  try {
    const raw = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;
    // Resolve against current origin so we get a URL object and can read
    // pathname + searchParams uniformly.
    return new URL(raw, typeof location !== "undefined" ? location.origin : "http://localhost");
  } catch {
    return null;
  }
}

function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input !== "string" && !(input instanceof URL)) return (input as Request).method.toUpperCase();
  return "GET";
}

/**
 * Match `path` against an OpenAPI route.  Supports `/api/songs/:id` style
 * placeholders and returns the matched param object, or `null` if no match.
 */
function match(path: string, pattern: string): Record<string, string> | null {
  const a = path.split("/").filter(Boolean);
  const b = pattern.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    const seg = b[i];
    if (seg.startsWith(":")) params[seg.slice(1)] = a[i];
    else if (seg !== a[i]) return null;
  }
  return params;
}

async function routeRequest(method: string, url: URL, init?: RequestInit): Promise<Response | null> {
  const path = url.pathname;
  let m: Record<string, string> | null;

  // Health
  if (method === "GET" && path === "/api/healthz") return h.healthCheck();

  // Songs
  if (method === "GET" && path === "/api/songs") return h.listSongs(url);
  if (method === "POST" && path === "/api/songs") return h.createSong(init);
  if (method === "GET" && path === "/api/songs/stats") return h.getSongStats();
  if ((m = match(path, "/api/songs/:id"))) {
    const id = Number(m["id"]);
    if (method === "GET") return h.getSong(id);
    if (method === "PUT") return h.updateSong(id, init);
    if (method === "DELETE") return h.deleteSong(id);
  }

  // Notes
  if (method === "GET" && path === "/api/notes") return h.listNotes();
  if (method === "POST" && path === "/api/notes") return h.createNote(init);
  if ((m = match(path, "/api/notes/:id"))) {
    const id = Number(m["id"]);
    if (method === "GET") return h.getNote(id);
    if (method === "PUT") return h.updateNote(id, init);
    if (method === "DELETE") return h.deleteNote(id);
  }

  // Schedules
  if (method === "GET" && path === "/api/schedules") return h.listSchedules();
  if (method === "POST" && path === "/api/schedules") return h.createSchedule(init);
  if ((m = match(path, "/api/schedules/:id"))) {
    const id = Number(m["id"]);
    if (method === "GET") return h.getSchedule(id);
    if (method === "PUT") return h.updateSchedule(id, init);
    if (method === "DELETE") return h.deleteSchedule(id);
  }

  // Settings
  if (path === "/api/settings") {
    if (method === "GET") return h.getSettings();
    if (method === "PUT") return h.updateSettings(init);
  }

  // Screen state
  if (path === "/api/screen") {
    if (method === "GET") return h.getScreenState();
    if (method === "PUT") return h.updateScreenState(init);
  }

  return null;
}

let installed = false;
let originalFetch: FetchFn | null = null;

export function installLocalApi(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = getUrlFromInput(input);
    if (!url) return originalFetch!(input, init);

    const sameOrigin = typeof location === "undefined" || url.origin === location.origin;
    if (!sameOrigin || !isApiPath(url.pathname) || shouldPassThrough(url.pathname)) {
      return originalFetch!(input, init);
    }

    const method = getMethod(input, init);
    try {
      const response = await routeRequest(method, url, init);
      if (response) return response;
      // Unmatched /api/* path — return 404 instead of hitting the real
      // server, so we never accidentally leak offline-only writes.
      return new Response(JSON.stringify({ error: `local-api: no handler for ${method} ${url.pathname}` }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  }) as FetchFn;
}

/**
 * Subscribe to cross-tab screen-state updates.  React components use this
 * to call `queryClient.invalidateQueries(...)` so the broadcast window
 * refreshes the moment the operator presses a button — no waiting for the
 * 500 ms poll.
 */
export function subscribeScreenChanges(handler: () => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel("wf-screen-state");
  const listener = (event: MessageEvent) => {
    if (event.data?.type === "screen-state-changed") handler();
  };
  channel.addEventListener("message", listener);
  return () => {
    channel.removeEventListener("message", listener);
    channel.close();
  };
}
