/**
 * Custom Teachings — user-created lessons stored in localStorage.
 *
 * The teachings page renders the built-in lessons from `lib/teachings.ts` AND
 * any custom lessons the user has added (manually or via AI generation).
 * Custom lessons can be edited and deleted; built-in ones cannot.
 */

import type { Teaching, TeachingCategory } from "./teachings";

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

/** Defensive guard against malformed localStorage entries. */
function isValidCustomTeaching(x: unknown): x is CustomTeaching {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return (
    typeof obj["id"] === "string" &&
    typeof obj["title"] === "string" &&
    typeof obj["category"] === "string" &&
    typeof obj["theme"] === "string" &&
    obj["keyVerse"] != null && typeof obj["keyVerse"] === "object" &&
    Array.isArray(obj["points"]) &&
    Array.isArray(obj["discussionQuestions"]) &&
    typeof obj["activity"] === "string" &&
    typeof obj["prayer"] === "string"
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
