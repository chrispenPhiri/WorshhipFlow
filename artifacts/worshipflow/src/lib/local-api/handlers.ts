/**
 * Local request handlers — one per OpenAPI route.
 *
 * Each handler reads/writes IndexedDB via `./db`, returns the same JSON
 * shape the real Express server returns, and dispatches a BroadcastChannel
 * message for screen-state updates so other tabs (broadcast window, sidebar)
 * can refresh instantly without waiting for their poll interval.
 *
 * Adding a new endpoint:
 *   1. Add a `case` to `routeRequest` in ./index.ts that matches the path.
 *   2. Add the corresponding async handler here.
 *   3. Make sure the response shape matches the OpenAPI spec exactly.
 */

import { getAll, getById, put, del, nextId } from "./db";

// ── Types (mirror lib/db schema; intentionally `any`-shaped to avoid
// pulling drizzle/zod into the browser bundle just for typing) ─────────────
type Iso = string;
interface Song {
  id: number;
  title: string;
  author: string;
  category: string;
  lyrics: string;
  key?: string | null;
  tempo?: string | null;
  tags?: string[];
  createdAt: Iso;
  updatedAt: Iso;
}
interface Note {
  id: number;
  title: string;
  speaker: string;
  date: string;
  content: string;
  scriptures?: string[];
  createdAt: Iso;
  updatedAt: Iso;
}
interface Schedule {
  id: number;
  title: string;
  serviceType: string;
  date: string;
  items: unknown[];
  notes?: string | null;
  createdAt: Iso;
  updatedAt: Iso;
}
type Singleton<T> = { key: string; value: T };

// ── Defaults ──────────────────────────────────────────────────────────────
// These mirror the column defaults in lib/db/src/schema/screen.ts and
// settings.ts.  Kept in sync by hand because we don't want to import the
// drizzle schema into the browser bundle.
const DEFAULT_SCREEN_STATE: Record<string, unknown> = {
  id: 1,
  isBlack: false,
  isClear: true,
  contentType: "none",
  title: null,
  content: null,
  textStyle: {
    fontFamily: "Playfair Display",
    fontSize: 64,
    textColor: "#ffffff",
    accentColor: "#f59e0b",
    bold: false,
    italic: false,
    alignment: "center",
    animation: "none",
  },
  background: { type: "live_wallpaper", value: "bokeh", overlay: 0 },
  layout: { textScale: 1, verticalAlign: "center", horizontalAlign: "center", paddingX: 8, paddingY: 8, textWidthPct: 100 },
  tickerEnabled: false,
  tickerText: null,
  tickerSpeed: 20,
  tickerDivider: "✦",
  tickerColor: "#ffffff",
  tickerBgColor: "rgba(0,0,0,0.75)",
  tickerFontSize: 18,
  idleWatermark: null,
  lowerThirdEnabled: false,
  lowerThirdName: null,
  lowerThirdTitle: null,
  lowerThirdPosition: "bottom-left",
  lowerThirdStyle: "modern",
  lowerThirdNameColor: "#ffffff",
  lowerThirdTitleColor: "rgba(255,255,255,0.65)",
  lowerThirdBgColor: "rgba(0,0,0,0.72)",
  lowerThirdAccentColor: "rgba(255,255,255,0.75)",
  lowerThirdNameSize: 22,
  lowerThirdTitleSize: 13,
  lowerThirdAutoDismissSec: 0,
  clockOverlayEnabled: false,
  clockPosition: "top-right",
  clockStyle: "digital",
  clockShowDate: false,
  clockShowSeconds: true,
  clockDateFormat: "long",
  clockFontSize: 16,
  clockColor: "rgba(255,255,255,0.92)",
  clockBgColor: "rgba(0,0,0,0.52)",
  clockBgOpacity: 100,
  clockBgRadius: 6,
  clockBgPadding: 13,
  logoOverlayEnabled: false,
  logoUrl: null,
  logoPosition: "top-right",
  logoSize: 20,
  logoOpacity: 100,
  logoShape: "rect",
  logoText: null,
  logoTextColor: "#ffffff",
  logoTextSize: 14,
  logoTextPosition: "right",
  logoTextWeight: "600",
  textOverlayEnabled: false,
  textOverlayContent: null,
  textOverlayPosition: "top-left",
  textOverlayFontSize: 36,
  textOverlayColor: "#ffffff",
  textOverlayBg: "rgba(0,0,0,0.55)",
  textOverlayBold: false,
  textOverlayItalic: false,
  textOverlayAlign: "left",
  textOverlayFontFamily: "inherit",
  textOverlayShadow: false,
  textOverlayOpacity: 100,
  textOverlayPadding: 8,
  textOverlayRadius: 4,
  textOverlayLetterSpacing: 0,
  textOverlayAnimation: "none",
  textOverlayMaxWidth: 80,
  textOverlayBorderColor: "transparent",
  textOverlayBorderWidth: 0,
  textOverlayAutoDismissSec: 0,
  comparisonMode: false,
  secondaryTitle: null,
  secondaryContent: null,
  timerEnabled: false,
  timerMode: "stopwatch",
  timerStartedAt: null,
  timerAccumulatedMs: 0,
  timerDurationSec: 300,
  timerPosition: "top-center",
  timerFontSize: 48,
  timerColor: "#ffffff",
  timerBgColor: "rgba(0,0,0,0.6)",
  timerLabel: null,
  timerWarningSec: 60,
  timerWarningColor: "#fbbf24",
  timerCriticalColor: "#ef4444",
  bibleRefFontSize: 28,
  bibleRefColor: "#ffffff",
  bibleRefBgColor: "rgba(0,0,0,0.55)",
  bibleRefBold: true,
  bibleRefShowTranslation: true,
  bibleRefPadding: 10,
  bibleRefRadius: 6,
  bibleRefLetterSpacing: 4,
  bibleRefUppercase: false,
  bibleRefShow: true,
  bibleBookShow: true,
  bibleBookFontSize: 28,
  bibleBookColor: "#ffffff",
  bibleBookBgColor: "rgba(0,0,0,0.52)",
  bibleBookBold: true,
  bibleBookPadding: 10,
  bibleBookRadius: 6,
  bibleBookLetterSpacing: 18,
  bibleBookUppercase: true,
  updatedAt: new Date().toISOString(),
};

const DEFAULT_SETTINGS: Record<string, unknown> = {
  defaultBibleVersion: "kjv",
  defaultFont: "Inter",
  defaultFontSize: 64,
  defaultTextColor: "#ffffff",
  defaultAccentColor: "#f59e0b",
  theme: "dark",
  tickerEnabled: false,
  tickerText: "Welcome to worship!",
  tickerSpeed: 25,
  churchName: "WorshipFlow Church",
  logoUrl: null,
  // AI feature toggles & limits
  aiEnabled: true,
  aiChatEnabled: true,
  aiSongEnabled: true,
  aiImageEnabled: true,
  aiDailyImageLimit: 20,
  updatedAt: new Date().toISOString(),
};

// ── BroadcastChannel for cross-tab live sync ─────────────────────────────
// `postMessage` is a no-op in browsers without BroadcastChannel; the 500 ms
// poll on the broadcast window still keeps things consistent in that case.
const BC_NAME = "wf-screen-state";
let bc: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!bc) bc = new BroadcastChannel(BC_NAME);
  return bc;
}
function notifyScreenChanged(): void {
  try { getChannel()?.postMessage({ type: "screen-state-changed", at: Date.now() }); } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function noContent(): Response {
  return new Response(null, { status: 204 });
}
function notFound(): Response {
  return json({ error: "Not found" }, 404);
}
function nowIso(): string {
  return new Date().toISOString();
}
async function readBody<T>(init: RequestInit | undefined): Promise<T> {
  const raw = init?.body;
  if (raw == null) return {} as T;
  if (typeof raw === "string") return JSON.parse(raw) as T;
  // Some hooks pass FormData/Blob; we don't use those, so plain JSON only.
  throw new Error("local-api: unsupported request body type");
}

// ── Songs ─────────────────────────────────────────────────────────────────
export async function listSongs(url: URL): Promise<Response> {
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search")?.toLowerCase();
  let rows = await getAll<Song>("songs");
  rows.sort((a, b) => a.title.localeCompare(b.title));
  if (category) rows = rows.filter(s => s.category === category);
  if (search) rows = rows.filter(s => s.title.toLowerCase().includes(search) || s.author.toLowerCase().includes(search));
  return json(rows);
}

export async function getSongStats(): Promise<Response> {
  const rows = await getAll<Song>("songs");
  const byCategory: Record<string, number> = {};
  for (const r of rows) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  return json({ total: rows.length, byCategory });
}

export async function getSong(id: number): Promise<Response> {
  const row = await getById<Song>("songs", id);
  return row ? json(row) : notFound();
}

export async function createSong(init: RequestInit | undefined): Promise<Response> {
  const body = await readBody<Partial<Song>>(init);
  const id = await nextId("songs");
  const now = nowIso();
  const song: Song = {
    id,
    title: String(body.title ?? ""),
    author: String(body.author ?? ""),
    category: String(body.category ?? "other"),
    lyrics: String(body.lyrics ?? ""),
    key: body.key ?? null,
    tempo: body.tempo ?? null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    createdAt: now,
    updatedAt: now,
  };
  await put("songs", song);
  return json(song, 201);
}

export async function updateSong(id: number, init: RequestInit | undefined): Promise<Response> {
  const existing = await getById<Song>("songs", id);
  if (!existing) return notFound();
  const body = await readBody<Partial<Song>>(init);
  const updated: Song = { ...existing, ...body, id, updatedAt: nowIso() };
  await put("songs", updated);
  return json(updated);
}

export async function deleteSong(id: number): Promise<Response> {
  await del("songs", id);
  return noContent();
}

// ── Notes ─────────────────────────────────────────────────────────────────
export async function listNotes(): Promise<Response> {
  const rows = await getAll<Note>("notes");
  rows.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return json(rows);
}
export async function getNote(id: number): Promise<Response> {
  const row = await getById<Note>("notes", id);
  return row ? json(row) : notFound();
}
export async function createNote(init: RequestInit | undefined): Promise<Response> {
  const body = await readBody<Partial<Note>>(init);
  const id = await nextId("notes");
  const now = nowIso();
  const note: Note = {
    id,
    title: String(body.title ?? ""),
    speaker: String(body.speaker ?? ""),
    date: String(body.date ?? new Date().toISOString().slice(0, 10)),
    content: String(body.content ?? ""),
    scriptures: Array.isArray(body.scriptures) ? body.scriptures : [],
    createdAt: now,
    updatedAt: now,
  };
  await put("notes", note);
  return json(note, 201);
}
export async function updateNote(id: number, init: RequestInit | undefined): Promise<Response> {
  const existing = await getById<Note>("notes", id);
  if (!existing) return notFound();
  const body = await readBody<Partial<Note>>(init);
  const updated: Note = { ...existing, ...body, id, updatedAt: nowIso() };
  await put("notes", updated);
  return json(updated);
}
export async function deleteNote(id: number): Promise<Response> {
  await del("notes", id);
  return noContent();
}

// ── Schedules ────────────────────────────────────────────────────────────
export async function listSchedules(): Promise<Response> {
  const rows = await getAll<Schedule>("schedules");
  rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return json(rows);
}
export async function getSchedule(id: number): Promise<Response> {
  const row = await getById<Schedule>("schedules", id);
  return row ? json(row) : notFound();
}
export async function createSchedule(init: RequestInit | undefined): Promise<Response> {
  const body = await readBody<Partial<Schedule>>(init);
  const id = await nextId("schedules");
  const now = nowIso();
  const schedule: Schedule = {
    id,
    title: String(body.title ?? ""),
    serviceType: String(body.serviceType ?? "sunday_morning"),
    date: String(body.date ?? new Date().toISOString().slice(0, 10)),
    items: Array.isArray(body.items) ? body.items : [],
    notes: body.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await put("schedules", schedule);
  return json(schedule, 201);
}
export async function updateSchedule(id: number, init: RequestInit | undefined): Promise<Response> {
  const existing = await getById<Schedule>("schedules", id);
  if (!existing) return notFound();
  const body = await readBody<Partial<Schedule>>(init);
  const updated: Schedule = { ...existing, ...body, id, updatedAt: nowIso() };
  await put("schedules", updated);
  return json(updated);
}
export async function deleteSchedule(id: number): Promise<Response> {
  await del("schedules", id);
  return noContent();
}

// ── Settings (singleton) ─────────────────────────────────────────────────
async function readSingleton(key: "settings" | "screen", defaults: Record<string, unknown>): Promise<Record<string, unknown>> {
  const row = await getById<Singleton<Record<string, unknown>>>("singletons", key);
  if (!row) {
    const seeded = { ...defaults };
    await put("singletons", { key, value: seeded });
    return seeded;
  }
  // Merge defaults so newly-added fields after an upgrade get sensible values.
  return { ...defaults, ...row.value };
}
async function writeSingleton(key: "settings" | "screen", value: Record<string, unknown>): Promise<Record<string, unknown>> {
  await put("singletons", { key, value });
  return value;
}

export async function getSettings(): Promise<Response> {
  return json(await readSingleton("settings", DEFAULT_SETTINGS));
}
export async function updateSettings(init: RequestInit | undefined): Promise<Response> {
  const current = await readSingleton("settings", DEFAULT_SETTINGS);
  const body = await readBody<Record<string, unknown>>(init);
  const next = { ...current, ...body, updatedAt: nowIso() };
  await writeSingleton("settings", next);
  return json(next);
}

// ── Screen state (singleton) ─────────────────────────────────────────────
const SCREEN_DEFAULTS_VERSION = 2; // bump when DEFAULT_SCREEN_STATE changes meaningfully

async function migrateScreenState(state: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (((state._defaultsVersion as number | undefined) ?? 0) >= SCREEN_DEFAULTS_VERSION) return state;
  const patched: Record<string, unknown> = { ...state, _defaultsVersion: SCREEN_DEFAULTS_VERSION };
  // Migrate v1→v2: switch from old black-color default background to Bokeh live wallpaper
  const bg = state.background as Record<string, unknown> | undefined;
  if (!bg || (bg.type === "color" && bg.value === "#000000")) {
    patched.background = { type: "live_wallpaper", value: "bokeh", overlay: 0 };
  }
  // Migrate v1→v2: switch from old Inter default font to Playfair Display
  const ts = state.textStyle as Record<string, unknown> | undefined;
  if (!ts || ts.fontFamily === "Inter") {
    patched.textStyle = { ...(ts ?? {}), fontFamily: "Playfair Display" };
  }
  await writeSingleton("screen", patched);
  return patched;
}

export async function getScreenState(): Promise<Response> {
  const state = await readSingleton("screen", DEFAULT_SCREEN_STATE);
  return json(await migrateScreenState(state));
}
export async function updateScreenState(init: RequestInit | undefined): Promise<Response> {
  const current = await readSingleton("screen", DEFAULT_SCREEN_STATE);
  const body = await readBody<Record<string, unknown>>(init);
  const next = { ...current, ...body, id: 1, updatedAt: nowIso() };
  await writeSingleton("screen", next);
  notifyScreenChanged();
  return json(next);
}

// ── Health ────────────────────────────────────────────────────────────────
export function healthCheck(): Response {
  return json({ status: "ok" });
}
