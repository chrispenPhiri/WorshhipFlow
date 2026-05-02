# Phiri WorshipFlow

## Overview

Full-stack church worship presentation software (branded "Phiri WorshipFlow"). pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Tailwind v4, shadcn/ui, wouter, TanStack Query
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Features

### Pages

- **Bible** — Look up passages from bible-api.com with translation selector (17 translations, all public-domain; NKJV intentionally not included as it requires a paid copyright license), all 66 books. Verse-by-verse navigation with numbered cards. Toggle verse numbers on/off. Send mode: "One at a time" (navigate per verse) or "All together". Send individual verse or all to screen with reference label. **Word highlighting** (B3.3): comma-separated terms get amber-glow wrapped on broadcast. **Phrase search** (B3.4): filter/dim verses within fetched passage with live match counter. **Side-by-side comparison** (B3.5): toggle a secondary translation; broadcast renders 2-column layout with translation labels. **Recently presented** widget (B3.6): top-of-page card listing last 12 sent items (verses/songs/notes) with restore/remove/clear; backed by localStorage `wf-recent-items` via the `useRecentlyPresented` hook.
- **Songs** — Library with search + 9 category tabs (shows counts). Full Add Song dialog (title, author, category, key, tempo, lyrics). Lyrics split by blank lines into slides. Slide-by-slide navigation panel. **Color-coded section chips** (B3.2): verse=blue, chorus=amber, bridge=purple, pre-chorus=cyan; active section type shown as a colored badge. Send individual slide or all lyrics to screen. Delete songs. Key/tempo badges. Always sends `comparisonMode:false` to clear any stale bible side-by-side layout.
- **Custom Text** — Free-form text with font/size/alignment controls.
- **Themes** — 12 presets + 8 live animated wallpapers (particle, aurora, matrix, starfield, flame, ocean, geometric, neon). Apply with toast feedback.
- **Media & Broadcast** — Upload tab (drag-drop or file browser for images/videos from local PC, blob URLs, session-scoped), Camera tab (webcam live feed), URL tab (image/video by URL), Broadcast tab (screen detection, auto-fullscreen, cursor hide, video loop toggles).
- **Schedule** — Drag-and-drop service order builder.
- **Sermon Notes & Inspiration** — Two tabs (persisted via `wf-notes-tab`):
  - *Sermon Notes*: Rich CRUD notes editor with search and present-to-screen.
  - *Daily Inspiration*: Verse of the Day (60 KJV verses), "Did you know?" Bible/Jesus/God facts (36 items), Christian liturgical calendar with computed Easter (Meeus algorithm) and derived movable feasts (Ash Wed, Palm Sun, Maundy Thu, Good Fri, Easter, Ascension, Pentecost, Trinity Sun, Advent), plus fixed feasts (New Year, Epiphany, Reformation, All Saints, Christmas Eve/Day, Watch Night). Each item has Send-to-screen + Next rotation. Content lives in `lib/inspiration.ts` (pure local, offline-friendly).
- **Settings** — App settings (church name, default font, etc.).

### Live Preview Sidebar (always visible)

- 16:9 mini-preview of the current screen state, updates every 2s
- Black Screen / Clear buttons
- Broadcast button with multi-display picker (Window Management API)
- **Stage Controls** (collapsible panel):
  - **Zoom** slider (40–200%)
  - **Text Width** slider (30–100%)
  - **Vertical Position**: top / center / bottom buttons
  - **Horizontal Position**: left / center / right buttons
  - **H/V Padding** sliders (0–30%)
  - Reset to defaults

### Broadcast Window (`/broadcast`)

- Full-screen output window polled every 500ms
- Renders background (color, gradient, image, video, camera, live wallpaper)
- Applies `layout` from screen state: textScale, verticalAlign, horizontalAlign, paddingX/Y, textWidthPct
- Hover-reveal control bar: hide cursor, PiP (Document PiP + video fallback), settings info overlay, fullscreen toggle
- Ticker bar support
- Animation support: fade_in, glow, float
- PWA manifest for desktop install

## Architecture

### Data Flow

1. Operator sets content in any page (Bible/Songs/Custom/etc.)
2. Page calls `PUT /api/screen` with full `ScreenState`
3. Broadcast window polls `GET /api/screen` every 500ms and re-renders

### ScreenState Schema

```
{
  isBlack, isClear, contentType, title, content,
  textStyle: { fontFamily, fontSize, textColor, accentColor, bold, italic, alignment, animation },
  background: { type (color|gradient|image|video|camera|live_wallpaper), value, overlay, fit, loop, cameraLayout, cameraShape, cameraPipSize },
  layout: { textScale, verticalAlign, horizontalAlign, paddingX, paddingY, textWidthPct },
  tickerEnabled, tickerText, tickerSpeed, tickerDivider, tickerColor, tickerBgColor, tickerFontSize,
  lowerThird*: enabled, name, title, position, style, nameColor, titleColor, bgColor, accentColor, nameSize, titleSize, autoDismissSec (0=manual; B2.3),
  clock*: overlayEnabled, position, style, showDate, showSeconds, dateFormat, fontSize, color, bgColor, bgOpacity, bgRadius, bgPadding,
  logo*: overlayEnabled, url, position, size, opacity, shape (rect|circle|rounded|hex|shield), text, textColor, textSize, textPosition, textWeight,
  textOverlay*: enabled, content, position, fontSize, color, bg, bold, italic, align, fontFamily, shadow, opacity, padding, radius, letterSpacing, animation (none|fade_in|slide_up|glow|pulse), maxWidth, borderColor, borderWidth, autoDismissSec (0=manual; B2.3 — broadcast schedules setTimeout keyed by enabled+dismissSec to fire on wall-clock time),
  comparisonMode (B3.5; bool; when true broadcast renders content + secondaryContent side-by-side),
  secondaryTitle, secondaryContent (B3.5; secondary translation for side-by-side bible compare),
  timer*: enabled, mode (stopwatch|countdown), startedAt (ISO; "" = paused/cleared), accumulatedMs, durationSec, position, fontSize, color, bgColor, label, warningSec, warningColor, criticalColor,
  idleWatermark
}
```

### Timer convention

- `timerStartedAt = ""` → paused or never started. Detected via `isNaN(Date.parse(s))`.
- `timerStartedAt = ISO string` → currently running; elapsed = accumulated + (now - parse(startedAt)).
- Toggling the enable Switch ALWAYS clears `timerStartedAt` and `timerAccumulatedMs` so the badges (RUNNING / PAUSED) stay coherent.
- Start handler resets `timerAccumulatedMs` to 0 when mode mismatches the draft or when timer was previously disabled (`isFreshStart`); otherwise keeps accumulated for Resume.
- Live preview readout in `media.tsx` uses `showLive = serverEnabled && serverMode === timerModeDraft`. When false, the readout shows the clean draft duration (so switching modes resets the visible value).

### Key Files

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all types)
- `lib/db/src/schema/screen.ts` — DB schema including Layout interface
- `artifacts/worshipflow/src/hooks/use-broadcast.ts` — Window Management API hook
- `artifacts/worshipflow/src/components/live-preview.tsx` — Sidebar with Stage Controls
- `artifacts/worshipflow/src/pages/broadcast.tsx` — Broadcast output window (no overlays / REC indicator: kept lean for perf)
- `artifacts/worshipflow/src/lib/recording.ts` — module-level recording manager with `useSyncExternalStore`. State (recording, duration, downloadUrl, includeMic) survives navigation. Mixes display audio + microphone via AudioContext.
- `artifacts/worshipflow/src/lib/control-appearance.ts` + `src/hooks/use-control-appearance.ts` — operator-facing customization (theme color + app font) for the CONTROL screen only. Stored in localStorage (key `wf-control-appearance`) with resolved CSS values (primaryHsl, fontStack) alongside IDs. Inline FOUC-prevention script in `index.html` reads localStorage and applies CSS vars before React mounts. Both runtime hooks use `useLayoutEffect` + wouter `useLocation()` to clear overrides on `/broadcast` before paint, so the projection screen never inherits the operator's font/accent. UI lives in `pages/settings.tsx` as `ControlAppearanceCard` (10 color swatches, 9-font Select, live preview, Reset button).

### Important Patterns

- `safeBase` / `safeFullState` pattern: always build explicit objects with sensible defaults before calling `updateScreen` — never spread raw DB rows (null fields fail Zod boolean validation, missing fields silently revert on PUT)
- When PATCHing partial fields, send `{ ...safeFullState(), ...patch }`; an explicit empty string is required to clear text fields (sending `undefined` is dropped by JSON.stringify and the server keeps the prior value)
- Codegen must be rerun after any OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
- DB schema changes need: `pnpm --filter @workspace/db run push`
- Broadcast window is rendered OUTSIDE the Layout in App.tsx (no sidebar/nav)
- Local media files use `URL.createObjectURL()` — blob URLs are session-scoped (valid within same browser session, accessible from broadcast window since same origin)
- Long-lived UI state that must survive route changes (e.g. recording, active media tab) lives in module-level stores (`src/lib/recording.ts`) or `sessionStorage`, not React component state
- Broadcast window must stay free of heavy DOM updates (no animated REC indicator, no recording HUD) — it often runs on a secondary monitor where any extra repaint causes input lag in the operator window
- Compose alpha into background colors via the `applyAlpha(color, percent)` helper in `broadcast.tsx` rather than wrapping foreground+background in a single `opacity:` style — opacity-on-container fades the foreground text too
- Always reset the api-server-tracked timer state via the enable Switch (which clears startedAt + accumulated) rather than relying on the user to also click Reset; this prevents stale `timerStartedAt` from a previous session being treated as "running" on the next page load
