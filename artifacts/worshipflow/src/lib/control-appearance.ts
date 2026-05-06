/**
 * Control-screen appearance presets.
 *
 * These customise the OPERATOR-FACING app shell only (sidebar, buttons, accents, body font).
 * They do NOT affect the broadcast / presentation output — that has its own per-content theming
 * via the Themes page.
 *
 * Stored in localStorage so each operator's machine remembers their preferences.
 */

export interface ColorPreset {
  /** Stable id used as the localStorage value. */
  id: string;
  /** Human-readable name shown in the picker. */
  name: string;
  /** HSL triplet matching CSS var format ("H S% L%") — assigned to --primary, --ring, etc. */
  primaryHsl: string;
  /** Solid CSS color used to render the swatch in the picker. */
  swatch: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { id: "indigo",     name: "Indigo",      primaryHsl: "265 80% 60%", swatch: "hsl(265 80% 60%)" },
  { id: "royal-blue", name: "Royal Blue",  primaryHsl: "220 80% 58%", swatch: "hsl(220 80% 58%)" },
  { id: "emerald",    name: "Emerald",     primaryHsl: "158 64% 45%", swatch: "hsl(158 64% 45%)" },
  { id: "teal",       name: "Teal",        primaryHsl: "182 60% 45%", swatch: "hsl(182 60% 45%)" },
  { id: "crimson",    name: "Crimson",     primaryHsl: "350 75% 55%", swatch: "hsl(350 75% 55%)" },
  { id: "rose",       name: "Rose",        primaryHsl: "335 75% 60%", swatch: "hsl(335 75% 60%)" },
  { id: "amber",      name: "Amber",       primaryHsl: "38 90% 55%",  swatch: "hsl(38 90% 55%)"  },
  { id: "orange",     name: "Sunset",      primaryHsl: "20 85% 58%",  swatch: "hsl(20 85% 58%)"  },
  { id: "slate",      name: "Slate",       primaryHsl: "215 25% 55%", swatch: "hsl(215 25% 55%)" },
  { id: "graphite",   name: "Graphite",    primaryHsl: "240 8% 45%",  swatch: "hsl(240 8% 45%)"  },
];

export const DEFAULT_COLOR_ID = "indigo";

/** Fonts already preloaded by index.html — safe to use without further network requests. */
export const APP_FONTS: { id: string; name: string; stack: string }[] = [
  { id: "inter",      name: "Inter",            stack: "'Inter', system-ui, sans-serif" },
  { id: "poppins",    name: "Poppins",          stack: "'Poppins', system-ui, sans-serif" },
  { id: "nunito",     name: "Nunito",           stack: "'Nunito', system-ui, sans-serif" },
  { id: "montserrat", name: "Montserrat",       stack: "'Montserrat', system-ui, sans-serif" },
  { id: "raleway",    name: "Raleway",          stack: "'Raleway', system-ui, sans-serif" },
  { id: "opensans",   name: "Open Sans",        stack: "'Open Sans', system-ui, sans-serif" },
  { id: "playfair",   name: "Playfair Display", stack: "'Playfair Display', Georgia, serif" },
  { id: "lora",       name: "Lora",             stack: "'Lora', Georgia, serif" },
  { id: "garamond",   name: "EB Garamond",      stack: "'EB Garamond', Georgia, serif" },
];

export const DEFAULT_FONT_ID = "playfair";

export interface ControlAppearance {
  colorId: string;
  fontId: string;
}

/** localStorage key — kept in sync with the inline FOUC-prevention script in index.html. */
export const STORAGE_KEY = "wf-control-appearance";

export const DEFAULT_APPEARANCE: ControlAppearance = {
  colorId: DEFAULT_COLOR_ID,
  fontId: DEFAULT_FONT_ID,
};

export function loadAppearance(): ControlAppearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw);
    return {
      colorId: typeof parsed.colorId === "string" ? parsed.colorId : DEFAULT_COLOR_ID,
      fontId: typeof parsed.fontId === "string" ? parsed.fontId : DEFAULT_FONT_ID,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(a: ControlAppearance): void {
  try {
    // Store the resolved CSS values alongside the IDs so the inline FOUC-prevention script in
    // index.html can apply them without needing to know preset definitions.
    const color = findColor(a.colorId);
    const font = findFont(a.fontId);
    const payload = { colorId: a.colorId, fontId: a.fontId, primaryHsl: color.primaryHsl, fontStack: font.stack };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

export function findColor(id: string): ColorPreset {
  return COLOR_PRESETS.find(c => c.id === id) ?? COLOR_PRESETS[0];
}

export function findFont(id: string): { id: string; name: string; stack: string } {
  return APP_FONTS.find(f => f.id === id) ?? APP_FONTS[0];
}

/** True when the current document is rendering the broadcast/projection page. */
export function isBroadcastPath(pathname: string = window.location.pathname): boolean {
  return /\/broadcast(?:\/|$)/.test(pathname);
}

/**
 * The set of CSS custom properties the operator appearance overrides.
 * Centralised so apply / clear paths stay in sync with the inline FOUC-prevention script.
 */
const PRIMARY_PROPS = ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring"] as const;
const FONT_PROP = "--app-font-sans";

/**
 * Apply the appearance to the current document by writing CSS custom properties on :root.
 * No-op on the broadcast route — the projection screen must keep its own defaults so the operator's
 * UI font / accent never leaks onto what the congregation sees.
 */
export function applyAppearance(a: ControlAppearance): void {
  if (isBroadcastPath()) { clearAppearance(); return; }
  const color = findColor(a.colorId);
  const font = findFont(a.fontId);
  const root = document.documentElement;
  for (const p of PRIMARY_PROPS) root.style.setProperty(p, color.primaryHsl);
  root.style.setProperty(FONT_PROP, font.stack);
}

/** Remove any inline overrides so the page falls back to the defaults declared in index.css. */
export function clearAppearance(): void {
  const root = document.documentElement;
  for (const p of PRIMARY_PROPS) root.style.removeProperty(p);
  root.style.removeProperty(FONT_PROP);
}
