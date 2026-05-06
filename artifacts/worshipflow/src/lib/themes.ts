export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  previewGradient: string;
  background: { type: string; value: string; overlay?: number };
  textStyle: {
    fontFamily: string;
    fontSize: number;
    textColor: string;
    accentColor?: string;
    bold: boolean;
    italic: boolean;
    alignment: "left" | "center" | "right";
    animation: "none" | "fade_in" | "glow" | "float";
  };
}

export interface LiveWallpaper {
  id: string;
  name: string;
  description: string;
  previewClass: string;
}

export const LIVE_WALLPAPERS: LiveWallpaper[] = [
  {
    id: "aurora",
    name: "Aurora",
    description: "Flowing northern lights in purple and teal",
    previewClass: "wf-wallpaper-aurora",
  },
  {
    id: "starfield",
    name: "Starfield",
    description: "Drifting stars on a deep space background",
    previewClass: "wf-wallpaper-starfield",
  },
  {
    id: "fire",
    name: "Holy Fire",
    description: "Warm flickering fire and ember tones",
    previewClass: "wf-wallpaper-fire",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Gentle rolling deep-ocean waves",
    previewClass: "wf-wallpaper-ocean",
  },
  {
    id: "bokeh",
    name: "Bokeh",
    description: "Soft glowing orbs drifting upward",
    previewClass: "wf-wallpaper-bokeh",
  },
  {
    id: "matrix",
    name: "Matrix",
    description: "Classic cascading green digital rain",
    previewClass: "wf-wallpaper-matrix",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm sunset gradient pulse",
    previewClass: "wf-wallpaper-sunset",
  },
  {
    id: "storm",
    name: "Storm",
    description: "Dark dramatic shifting clouds",
    previewClass: "wf-wallpaper-storm",
  },
];

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "classic-church",
    name: "Classic Church",
    description: "Traditional black with elegant serif text",
    previewGradient: "from-neutral-900 to-neutral-800",
    background: { type: "color", value: "#000000" },
    textStyle: { fontFamily: "Georgia", fontSize: 64, textColor: "#ffffff", bold: false, italic: false, alignment: "center", animation: "fade_in" },
  },
  {
    id: "holy-fire",
    name: "Holy Fire",
    description: "Deep red with golden glowing text",
    previewGradient: "from-red-950 to-orange-900",
    background: { type: "gradient", value: "linear-gradient(160deg, #450a0a 0%, #7c2d12 50%, #1c0a00 100%)" },
    textStyle: { fontFamily: "Cinzel", fontSize: 64, textColor: "#fbbf24", bold: true, italic: false, alignment: "center", animation: "glow" },
  },
  {
    id: "ocean-deep",
    name: "Ocean Deep",
    description: "Deep blue gradient with floating white text",
    previewGradient: "from-blue-950 to-cyan-900",
    background: { type: "gradient", value: "linear-gradient(180deg, #0c1445 0%, #0a3d62 60%, #051428 100%)" },
    textStyle: { fontFamily: "Raleway", fontSize: 60, textColor: "#e0f2fe", bold: false, italic: false, alignment: "center", animation: "float" },
  },
  {
    id: "royal-purple",
    name: "Royal Purple",
    description: "Deep violet with bright white text",
    previewGradient: "from-violet-950 to-purple-900",
    background: { type: "gradient", value: "linear-gradient(135deg, #1e1b4b 0%, #2d1b69 50%, #0f0a2e 100%)" },
    textStyle: { fontFamily: "Montserrat", fontSize: 62, textColor: "#f3e8ff", bold: false, italic: false, alignment: "center", animation: "fade_in" },
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    description: "Warm amber sunset tones with gold text",
    previewGradient: "from-amber-950 to-orange-950",
    background: { type: "gradient", value: "linear-gradient(160deg, #1c0a00 0%, #451a03 40%, #2c1102 100%)" },
    textStyle: { fontFamily: "Playfair Display", fontSize: 64, textColor: "#fde68a", bold: false, italic: false, alignment: "center", animation: "glow" },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep emerald green with soft light text",
    previewGradient: "from-green-950 to-emerald-900",
    background: { type: "gradient", value: "linear-gradient(160deg, #052e16 0%, #064e3b 50%, #022c22 100%)" },
    textStyle: { fontFamily: "Lora", fontSize: 60, textColor: "#d1fae5", bold: false, italic: false, alignment: "center", animation: "fade_in" },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Pure black with bold stark white text",
    previewGradient: "from-black to-zinc-950",
    background: { type: "color", value: "#000000" },
    textStyle: { fontFamily: "Oswald", fontSize: 72, textColor: "#ffffff", bold: true, italic: false, alignment: "center", animation: "none" },
  },
  {
    id: "aurora-theme",
    name: "Aurora",
    description: "Live aurora wallpaper with clean text",
    previewGradient: "from-indigo-950 to-teal-900",
    background: { type: "live_wallpaper", value: "aurora" },
    textStyle: { fontFamily: "Raleway", fontSize: 62, textColor: "#ffffff", bold: false, italic: false, alignment: "center", animation: "float" },
  },
  {
    id: "starfield-theme",
    name: "Starfield",
    description: "Live starfield with glowing text",
    previewGradient: "from-slate-950 to-blue-950",
    background: { type: "live_wallpaper", value: "starfield" },
    textStyle: { fontFamily: "Montserrat", fontSize: 60, textColor: "#e2e8f0", bold: false, italic: false, alignment: "center", animation: "glow" },
  },
  {
    id: "fire-theme",
    name: "Holy Fire Live",
    description: "Live fire wallpaper with golden text",
    previewGradient: "from-orange-950 to-red-950",
    background: { type: "live_wallpaper", value: "fire" },
    textStyle: { fontFamily: "Cinzel", fontSize: 64, textColor: "#fef3c7", bold: true, italic: false, alignment: "center", animation: "glow" },
  },
  {
    id: "ocean-theme",
    name: "Ocean Live",
    description: "Live ocean waves with floating text",
    previewGradient: "from-blue-950 to-cyan-950",
    background: { type: "live_wallpaper", value: "ocean" },
    textStyle: { fontFamily: "Lora", fontSize: 60, textColor: "#cffafe", bold: false, italic: false, alignment: "center", animation: "float" },
  },
  {
    id: "bokeh-theme",
    name: "Bokeh",
    description: "Soft glowing orbs with elegant Playfair Display text",
    previewGradient: "from-indigo-950 to-purple-950",
    background: { type: "live_wallpaper", value: "bokeh" },
    textStyle: { fontFamily: "Playfair Display", fontSize: 64, textColor: "#ffffff", bold: false, italic: false, alignment: "center", animation: "fade_in" },
  },
  {
    id: "dark-minimal",
    name: "Dark Minimal",
    description: "Charcoal with Inter and clean fade-in",
    previewGradient: "from-zinc-900 to-zinc-950",
    background: { type: "color", value: "#18181b" },
    textStyle: { fontFamily: "Inter", fontSize: 58, textColor: "#f4f4f5", bold: false, italic: false, alignment: "center", animation: "fade_in" },
  },
];

export const COLOR_PALETTES = [
  {
    name: "Pure",
    colors: ["#ffffff", "#f8f8f8", "#000000", "#111111", "#222222"],
  },
  {
    name: "Gold",
    colors: ["#fbbf24", "#f59e0b", "#d97706", "#fde68a", "#92400e"],
  },
  {
    name: "Heavenly",
    colors: ["#bfdbfe", "#93c5fd", "#60a5fa", "#dbeafe", "#1e40af"],
  },
  {
    name: "Ember",
    colors: ["#fca5a5", "#f87171", "#ef4444", "#fee2e2", "#991b1b"],
  },
  {
    name: "Sacred",
    colors: ["#c4b5fd", "#a78bfa", "#8b5cf6", "#ede9fe", "#4c1d95"],
  },
  {
    name: "Nature",
    colors: ["#86efac", "#4ade80", "#22c55e", "#dcfce7", "#14532d"],
  },
];

export const FONT_COLLECTION = [
  { name: "Georgia", style: "serif", label: "Georgia" },
  { name: "Cinzel", style: "serif", label: "Cinzel" },
  { name: "Playfair Display", style: "serif", label: "Playfair Display" },
  { name: "Lora", style: "serif", label: "Lora" },
  { name: "EB Garamond", style: "serif", label: "EB Garamond" },
  { name: "Inter", style: "sans-serif", label: "Inter" },
  { name: "Montserrat", style: "sans-serif", label: "Montserrat" },
  { name: "Raleway", style: "sans-serif", label: "Raleway" },
  { name: "Oswald", style: "sans-serif", label: "Oswald" },
  { name: "Open Sans", style: "sans-serif", label: "Open Sans" },
  { name: "Nunito", style: "sans-serif", label: "Nunito" },
  { name: "Poppins", style: "sans-serif", label: "Poppins" },
];
