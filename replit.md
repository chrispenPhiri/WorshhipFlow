# Phiri WorshipFlow

## Overview

Phiri WorshipFlow is a full-stack church worship presentation software. This pnpm workspace monorepo project, built with TypeScript, aims to provide comprehensive tools for managing and displaying worship content, including Bible passages, songs, custom text, and multimedia. The project focuses on a seamless operator experience and a clear, engaging display for the audience, with features like live previews, multi-display broadcasting, and rich content management.

## User Preferences

I want iterative development. I prefer detailed explanations for complex features. I want to be asked before making major architectural changes or introducing new external dependencies.

## System Architecture

The application is built as a pnpm monorepo using Node.js 24 and TypeScript 5.9.

**Frontend:**
-   **Framework:** React with Vite
-   **Styling:** Tailwind v4, shadcn/ui
-   **Routing:** Wouter
-   **Data Fetching:** TanStack Query
-   **UI/UX:** Features a live preview sidebar (16:9 aspect ratio, updates every 2s) with stage controls (zoom, text width, vertical/horizontal position, padding). Operator-facing control appearance (theme color, app font) is customizable and stored in `localStorage`, with an inline script preventing FOUC.

**Backend:**
-   **API Framework:** Express 5
-   **Database:** PostgreSQL with Drizzle ORM
-   **Validation:** Zod (`zod/v4`), `drizzle-zod`
-   **API Codegen:** Orval (from OpenAPI spec)
-   **Build:** esbuild (CJS bundle)
-   **Note:** In production the React app intercepts every `/api/*` request in the browser (see Offline Local API below) and writes to IndexedDB instead of hitting Express. The server still runs to host `POST /api/teachings/generate` (the AI proxy passthrough); other routes are effectively unused.

**Offline / PWA Layer (`src/lib/local-api/`, `public/sw.js`):**
-   **Local API interceptor (`src/lib/local-api/index.ts`):** `installLocalApi()` is called in `main.tsx` *before* React mounts. It monkey-patches `window.fetch` so any same-origin `/api/*` request is dispatched to a local handler instead of the network. All Orval-generated React Query hooks (`useGetSongs`, `useUpdateScreenState`, …) keep working unchanged.
-   **IndexedDB store (`src/lib/local-api/db.ts`):** One database `wf-local-api`, four object stores — `songs`, `notes`, `schedules`, and a `singletons` store that holds the screen-state and settings rows plus auto-increment counters (`_seq:<store>`).
-   **Handlers (`src/lib/local-api/handlers.ts`):** One async function per OpenAPI operation. Mirrors the Express defaults for `screen_state` and `settings` so existing pages get the same shape they always did. Defaults are kept in sync with `lib/db/src/schema/screen.ts` by hand.
-   **Pass-through:** `POST /api/teachings/generate` and any non-`/api/*` URL still hit the real network. AI generation needs internet; everything else is fully offline.
-   **Cross-tab sync:** `updateScreenState` posts on a `BroadcastChannel("wf-screen-state")`. Both `pages/broadcast.tsx` and `components/live-preview.tsx` subscribe via `subscribeScreenChanges()` and call `queryClient.invalidateQueries(getGetScreenStateQueryKey())`, so the projection refreshes the moment the operator clicks send. The 500 ms `refetchInterval` poll is kept as a fallback for browsers without `BroadcastChannel`.
-   **Service worker (`public/sw.js`, registered only in `import.meta.env.PROD`):** Cache-first for app shell assets (JS/CSS/HTML/icons/fonts), stale-while-revalidate for `bible-api.com` and Google Fonts, network passthrough for `/api/*` (the JS-side interceptor handles those). Skipped on `/broadcast` and in dev (Vite HMR conflict).
-   **Install UX:** `src/lib/install-prompt.ts` captures `beforeinstallprompt`. `src/components/install-app-card.tsx` (rendered inside Settings) shows install status, online/offline indicator, IndexedDB usage from `navigator.storage.estimate()`, and an Install button. The `manifest.json` (already in `public/`) provides the standalone display, theme color, icons, and shortcuts.

**Core Features:**

*   **Pages:**
    *   **Bible:** Integrates with `bible-api.com` for passages, supports multiple public-domain translations, verse-by-verse navigation, word highlighting, phrase search, and side-by-side translation comparison. Includes a "Recently Presented" widget.
    *   **Songs:** Library management with search, categories, and full CRUD for songs. Lyrics are split into slides, with color-coded section chips (verse, chorus, bridge, pre-chorus).
    *   **Custom Text:** Free-form text editor with extensive font, size, and alignment controls.
    *   **Themes:** 12 presets and 8 live animated wallpapers (particle, aurora, matrix, starfield, flame, ocean, geometric, neon).
    *   **Media & Broadcast:** Supports uploading images/videos (drag-drop, file browser, blob URLs), webcam feed, and URL-based media. Broadcast module includes screen detection, auto-fullscreen, cursor hiding, and video looping.
    *   **Schedule:** Drag-and-drop service order builder.
    *   **Sermon Notes:** Rich CRUD editor with search and presentation capabilities.
    *   **Daily Inspiration:** Displays Verse of the Day, Bible facts, and a Christian liturgical calendar. Content includes screen labelling for context.
    *   **Teachings:** Offers 42 ready-to-use lessons categorized by audience and topic, with sections like Key Verse, Teaching Points, Discussion Questions, Activity, and Closing Prayer. Supports user-added custom teachings and AI-generated drafts (using Replit AI Integrations OpenAI proxy).
    *   **Bible Games:** Four offline games: Bible Trivia, Books of the Bible (ordering), Who Said It?, and Bible Charades.
    *   **How To:** In-app, searchable user guide with quick-jump tiles.
    *   **Settings:** Application-wide settings for church name, default font, etc.

*   **Broadcast Window (`/broadcast`):** A dedicated full-screen output window. Reads screen state via `useGetScreenState` with a 500 ms `refetchInterval` AND subscribes to `BroadcastChannel("wf-screen-state")` for instant cross-tab updates from the operator. Both reads now resolve through the IndexedDB local API rather than Express. Renders backgrounds (color, gradient, image, video, camera, live wallpaper) and applies layout settings (textScale, alignment, padding). Includes a hover-reveal control bar (hide cursor, PiP, settings info, fullscreen toggle) and supports ticker bars and animations (fade_in, glow, float). Designed for performance, avoiding heavy DOM updates.

**Data Flow (offline-first):**
1.  Operator updates content on any page.
2.  The page calls `PUT /api/screen` — intercepted by `src/lib/local-api`, written to IndexedDB, and a `BroadcastChannel("wf-screen-state")` message is posted.
3.  The broadcast window receives the channel message and re-fetches `GET /api/screen` (also IndexedDB-backed) immediately. Its 500 ms poll is the safety net for browsers without `BroadcastChannel`.
4.  No server round-trip; the operator and broadcast tabs stay in sync entirely inside the browser.

**Key Architectural Patterns:**

*   **`safeBase` / `safeFullState`:** Explicit objects with sensible defaults are used before calling `updateScreen` to prevent issues with null or missing fields during Zod validation.
*   **Partial Updates:** For patching, `{ ...safeFullState(), ...patch }` is used. Explicit empty strings are required to clear text fields.
*   **Persistent UI State:** Long-lived UI state (e.g., recording, active media tab) is managed using module-level stores (`src/lib/recording.ts`) or `sessionStorage` to survive route changes.
*   **Broadcast Performance:** The broadcast window is kept lean for performance, running outside the main application layout and avoiding heavy DOM updates.
*   **Alpha Composition:** Alpha is applied to background colors via `applyAlpha` helper to avoid fading foreground text.

## External Dependencies

*   `bible-api.com`: For fetching Bible passages and translations.
*   Replit AI Integrations OpenAI proxy (`gpt-5.4`): Used for AI-generated teaching drafts.
*   PostgreSQL: Primary database for application data.
*   OpenAPI Specification: Defines the API contract, used by Orval for client-side code generation.
*   Window Management API: Utilized for multi-display picking in the broadcast feature.
*   `localStorage`: For storing user preferences, custom teachings, recently presented items, and control appearance.
*   `IndexedDB` (database `wf-local-api`): Stores all songs, sermon notes, schedules, app settings, and the live screen state. Replaces the PostgreSQL backend for end-user reads/writes — the server is only used as an AI proxy. Persists across browser restarts and works fully offline.
*   `BroadcastChannel("wf-screen-state")`: Operator → broadcast window cross-tab sync.
*   Service Worker (`/sw.js`, production-only): Caches the app shell so the site is installable as a PWA and loads with no network connection.
*   `sessionStorage`: For session-scoped UI state.