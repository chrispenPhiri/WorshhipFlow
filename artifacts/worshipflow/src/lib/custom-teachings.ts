/**
 * Custom Teachings — user-created lessons stored in localStorage.
 *
 * The teachings page renders the built-in lessons from `lib/teachings.ts` AND
 * any custom lessons the user has added (manually or via AI generation).
 * Custom lessons can be edited and deleted; built-in ones cannot.
 */

import { TEACHING_CATEGORIES, type Teaching, type TeachingCategory } from "./teachings";

const STORAGE_KEY = "wf-custom-teachings";

/** Custom teachings are full Teaching objects plus a timestamp + isCustom flag. */
export interface CustomTeaching extends Teaching {
  isCustom: true;
  createdAt: string;
}

/** Read all custom teachings from localStorage. Returns [] on parse failure. */
export function loadCustomTeachings(): CustomTeaching[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCustomTeaching);
  } catch {
    return [];
  }
}

/** Persist all custom teachings (overwriting). */
export function saveCustomTeachings(items: CustomTeaching[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Notify other components on the same page (storage event only fires cross-tab).
    window.dispatchEvent(new CustomEvent("wf-custom-teachings-changed"));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/** Insert a new custom teaching. Returns the saved object (with id + createdAt set). */
export function addCustomTeaching(input: Omit<Teaching, "id">): CustomTeaching {
  const all = loadCustomTeachings();
  const teaching: CustomTeaching = {
    ...input,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
  saveCustomTeachings([teaching, ...all]);
  return teaching;
}

/** Update an existing custom teaching by id. No-op if not found. */
export function updateCustomTeaching(id: string, patch: Partial<Teaching>): void {
  const all = loadCustomTeachings();
  const next = all.map(t => (t.id === id ? { ...t, ...patch, id: t.id, isCustom: true as const } : t));
  saveCustomTeachings(next);
}

/** Remove a custom teaching by id. */
export function deleteCustomTeaching(id: string): void {
  const all = loadCustomTeachings();
  saveCustomTeachings(all.filter(t => t.id !== id));
}

/**
 * Strict guard against malformed localStorage entries.
 *
 * Why this matters: the Teachings page indexes UI maps with the category
 * (`CAT_ICONS[l.category]`) and renders deep fields (`keyVerse.reference`,
 * `points[i].heading`, etc.). A corrupt entry would crash the whole list.
 * Anything that doesn't match exactly is filtered out instead of rendered.
 */
const VALID_CATEGORIES = new Set<string>(TEACHING_CATEGORIES);

function isStr(x: unknown): x is string {
  return typeof x === "string";
}

function isPoint(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return isStr(o["heading"]) && isStr(o["body"]);
}

function isKeyVerse(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return isStr(o["reference"]) && isStr(o["text"]);
}

function isValidCustomTeaching(x: unknown): x is CustomTeaching {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return (
    isStr(obj["id"]) &&
    isStr(obj["title"]) &&
    isStr(obj["category"]) && VALID_CATEGORIES.has(obj["category"]) &&
    isStr(obj["theme"]) &&
    isKeyVerse(obj["keyVerse"]) &&
    isStr(obj["summary"]) &&
    Array.isArray(obj["points"]) && obj["points"].length > 0 && obj["points"].every(isPoint) &&
    Array.isArray(obj["discussionQuestions"]) && obj["discussionQuestions"].every(isStr) &&
    isStr(obj["activity"]) &&
    isStr(obj["prayer"]) &&
    (obj["memoryVerse"] === undefined || obj["memoryVerse"] === null || isStr(obj["memoryVerse"]))
  );
}

/** Build an empty draft teaching for the form dialog. */
export function emptyTeachingDraft(category: TeachingCategory = "Adults"): Omit<Teaching, "id"> {
  return {
    title: "",
    category,
    theme: "",
    keyVerse: { reference: "", text: "" },
    summary: "",
    points: [
      { heading: "", body: "" },
      { heading: "", body: "" },
      { heading: "", body: "" },
    ],
    discussionQuestions: ["", "", ""],
    activity: "",
    prayer: "",
  };
}
