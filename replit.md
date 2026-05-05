# Phiri WorshipFlow

## Overview

Phiri WorshipFlow is a full-stack church worship presentation software designed to manage and display worship content including Bible passages, songs, custom text, and multimedia. It aims to provide a seamless operator experience and an engaging audience display with features like live previews, multi-display broadcasting, and rich content management. The project is a pnpm workspace monorepo built with Node.js 24 and TypeScript 5.9.

## User Preferences

I want iterative development. I prefer detailed explanations for complex features. I want to be asked before making major architectural changes or introducing new external dependencies.

## System Architecture

The application is built as a pnpm monorepo using Node.js 24 and TypeScript 5.9. It follows an offline-first approach, leveraging client-side storage for most operations.

**Frontend:**
*   **Framework:** React with Vite
*   **Styling:** Tailwind v4, shadcn/ui
*   **Routing:** Wouter
*   **Data Fetching:** TanStack Query
*   **UI/UX:** Customizable operator-facing controls, live preview sidebar (16:9 aspect ratio, 2s updates) with stage controls. Responsive layout supporting desktop, tablet, and mobile views. Customizable main menu icons stored in `localStorage`.
*   **Offline / PWA Layer:** `window.fetch` is monkey-patched to intercept `/api/*` requests and direct them to a local API layer, ensuring offline functionality. A service worker caches app shell assets for PWA capabilities. Cross-tab synchronization is achieved via `BroadcastChannel`.

**Backend:**
*   **API Framework:** Express 5
*   **Database:** PostgreSQL with Drizzle ORM (primarily for server-side operations; client uses IndexedDB).
*   **Validation:** Zod (`zod/v4`), `drizzle-zod`.
*   **API Codegen:** Orval (from OpenAPI spec).
*   **Build:** esbuild (CJS bundle).
*   **Note:** In production, the React app intercepts `/api/*` requests to write to IndexedDB, making the Express server mainly host the AI proxy passthrough.

**Core Features:**
*   **Install & Local Storage:** Utilizes `navigator.storage.persist()` for PWA storage protection, and offers single-file or folder-based backup/restore of user data (songs, notes, schedules, accounts) via File System Access API.
*   **Local Accounts:** Secure, device-local username/password authentication using PBKDF2-SHA256 for hashing, with credentials stored in IndexedDB.
*   **Pages:**
    *   **Bible:** Integrates with `bible-api.com` for passages, multiple translations, verse navigation, and search.
    *   **Songs:** Library management with CRUD, categories, and bulk import functionality (JSON/CSV).
    *   **Custom Text:** Free-form text editor with extensive styling controls.
    *   **Themes:** 12 presets and 8 live animated wallpapers.
    *   **Media & Broadcast:** Supports various media types (images, videos, webcam, URLs) and includes broadcast features like screen detection, auto-fullscreen, and ticker bars.
    *   **Schedule:** Drag-and-drop service order builder.
    *   **Sermon Notes:** Rich CRUD editor with search.
    *   **Daily Inspiration:** Displays religious content.
    *   **Teachings:** Provides 42 pre-made lessons, user-added custom teachings, and AI-generated drafts.
    *   **Bible Games:** Thirteen offline games (e.g., Trivia, Connections, Fill in the Blank) with "Show on screen" and "Reveal answer on screen" projection capabilities.
    *   **Prayer Wall:** Capture, search, categorise (Healing/Family/Salvation/Provision/Guidance/Praise/Other), and project the church's prayer requests. Per-request "Project / Mark answered / Delete" plus a "Project all active" bulk action. Persisted in `localStorage` (`wf-prayer-wall`).
    *   **Hymn Number:** Quick large-display projection for traditional services using a printed hymnal — enter hymnal name + number + optional title, hit "Show on screen" for a giant `№ NNN` card. Last-25 history for one-tap re-show.
    *   **Service Countdown:** Set a target time + label, pick a `+5/+10/+15/+30/+60 min` preset, then "Show on screen". Ticks locally every second and re-broadcasts the remaining time to the projection screen every minute, auto-stopping at zero. State survives a refresh.
    *   **How To:** In-app user guide.
    *   **Settings:** Application-wide configuration. Now includes a **Bible-only mode** toggle (`lib/bible-only-mode.ts`, persisted in `wf-bible-only-mode`) — when on, the sidebar collapses to just Bible + Settings, every other route redirects back to `/`, and a banner above the main content reminds the operator the mode is active. The **Main-menu icon palette** has been expanded to ~60 hand-picked church/worship Lucide icons so each nav entry can have a more lifelike identity. **Emoji Mode** toggle (`wf-emoji-mode` in localStorage, `useEmojiMode` hook) replaces sidebar icons with emoji characters — each `NavItemDef` carries a default `emoji` field; Settings shows a live preview row when the mode is on.
*   **Broadcast Window (`/broadcast`):** Dedicated full-screen output window for audience display, synchronized with operator actions via IndexedDB and `BroadcastChannel`. Renders backgrounds and applies layout settings with a focus on performance. **Auto-fit text**: after each new content key, measures overflow and scales `fontSize` down (min 12%) so long passages are never clipped. **Text scroll**: `scrollOffset` state driven by arrow keys (↑/↓) and `BroadcastChannel` commands (`scroll_up`/`scroll_down`/`scroll_reset`); when scrolling is active `effectiveAutoFitFactor` is overridden to 1 so text renders at full size. **Smooth camera transitions**: CSS `opacity 0.45s ease` applied to all camera video elements (BackgroundLayer, CameraOverlay, QuadCameraLayer). **No-flash camera switch**: new stream is acquired before stopping the old one (`cameraStreamRef`) so there is never a black-screen gap.
*   **AI Page (`/ai`):** Tabs registered via a TABS array (Ask a Prophet, Chapter Summary, Context Lens, Sermon Outline, Prayer, Worship Set, Announcements, Devotional [NEW], Bible Quiz [NEW], Cross-References [NEW], Translate [NEW], Children's Sermon [NEW]). Every one-shot generator wraps its result in a shared `<ResultBlock>` that exposes **Send to screen** (writes via `useUpdateScreenState`), **Export PDF** (print window), **Dismiss**, and an inline **`<RefinePanel>`** — a free-form follow-up box that POSTs to `/api/ai/refine` with the original output + user instruction and atomically swaps the result on success (drafts are buffered to keep the original visible if streaming fails mid-way). Tab list scrolls/wraps to fit ≥12 tabs.
*   **Inspiration / Teachings / Prayer Wall — graphic send:** Each page can send a styled gradient card directly to the broadcast screen (`type: "gradient"`). Category-specific colours: verse=indigo, fact=amber, event=violet, prayer=rose, teaching categories (Youth/Mothers/Fathers/etc.) have their own palette.

**Key Architectural Patterns:**
*   **Offline-first Data Flow:** Content updates are written to IndexedDB, and changes are synchronized across tabs using `BroadcastChannel`, minimizing server interaction.
*   **Live Studio enhancements**: Camera Switcher card (`wf-studio-sections`) enumerates `navigator.mediaDevices` and updates `background.cameraDeviceId`; Graphic Presets stored in `wf-graphic-presets` (localStorage), editable inline with emoji/label/lower-third fields and a reset-to-defaults button; Live Visualizations stored in `wf-vis-items` (localStorage), editable text/lower-third fields; all column-3 cards are collapsible with toggle state in `wf-studio-sections`.
*   **Live Preview Stage Controls**: `SliderWithButtons` replaced with `NudgeControl` (± step buttons + value chip, optional big-step «» buttons). Text Scroll section in Presentation Remote exposes ↑/↓/reset buttons via `scroll_up`/`scroll_down`/`scroll_reset` BroadcastChannel commands.
*   **Global Operator Scroll** (`hooks/use-global-scroll-keys.ts`, mounted in `components/layout.tsx`): listens for ↑/↓/PageUp/PageDown/Home/End anywhere in the operator app and posts the matching `scroll_up`/`scroll_down`/`scroll_reset` command on the `wf-broadcast-cmd` BroadcastChannel. Skips when an `<input>`/`<textarea>`/`contentEditable` element is focused, when modifier keys are held, and when the operator is on `/broadcast` itself (that page already binds its own keydown). Lets the operator nudge long Bible passages and sermon text on the audience screen without focusing any specific button. Live Preview's "Text Scroll" hint advertises the keys as `↑ ↓ scroll · Home reset · Works anywhere in the app`.
*   **Media page Camera & Broadcast tab** is now organised into collapsible cards (`Camera Source`, `Camera Layout`, `Camera Adjustments`) with persisted per-section state in `wf-media-cam-sections` (localStorage). Header titles include a tiny live-status hint (`· device`, `· fullscreen`, `· customised`) so the operator can see active settings while sections are collapsed. The Broadcast Output sub-section continues to use its existing `broadcastOpen` toggle.
*   **Live Captions (AI)** — `components/live-captions-card.tsx` uses the browser's Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`, Chromium-only) to transcribe the operator's microphone in real time and pushes interim/final transcripts to the broadcast window via the `wf-broadcast-cmd` BroadcastChannel using new `caption_set { text, isFinal? }` and `caption_clear` commands. The broadcast page renders the caption above the ticker (z-30, `clamp(20px, 2.6vw, 38px)`, blurred dark backdrop). Settings (language, interim words, auto-clear delay) persist in localStorage. Auto-restarts the recogniser when Chrome ends the session after silence.
*   **Stream Destinations** — `components/stream-destinations-card.tsx` stores YouTube / Facebook / Twitch / custom RTMP URL + stream key pairs in `wf-stream-destinations` (localStorage; never sent to the server). Provides copy-to-clipboard buttons so the operator can paste credentials into OBS or similar streaming tools (browsers cannot push native RTMP). Each destination has on/off toggle, masked key input, and platform-specific "get a key" link.
*   **Tab/result persistence** — `hooks/use-session-storage.ts` is a `sessionStorage` twin of `useLocalStorage` (cross-instance custom-event sync). Used to keep the looked-up Bible verse (`wf-bible-result`, `wf-bible-result-2`, `wf-bible-current-verse-idx`) and the active AI tab (`wf-ai-active-tab`) visible after switching tabs. State clears when the browser tab is closed.
*   **`safeBase` / `safeFullState`:** Ensures data consistency before updates.
*   **Partial Updates:** Facilitates efficient patching of data.
*   **Persistent UI State:** Manages long-lived UI state across route changes.
*   **Broadcast Performance:** Broadcast window is optimized for performance with lean rendering.
*   **Alpha Composition:** Ensures proper background alpha application without affecting foreground text.

## External Dependencies

*   `bible-api.com`: For fetching Bible passages and translations.
*   Replit AI Integrations OpenAI proxy (`gpt-5.4`): For AI-generated teaching drafts and all 12 AI tools on `/ai`. New endpoints in `routes/ai.ts` for this batch: `/refine`, `/devotional`, `/quiz`, `/cross-refs`, `/translate`, `/childrens-sermon`. All stream SSE chunks via the shared `streamCompletion` helper.
*   PostgreSQL: Used as the primary backend database.
*   OpenAPI Specification: Defines the API contract for client-side code generation.
*   Window Management API: For multi-display handling in broadcast.
*   `localStorage`: Stores user preferences, custom teachings, and UI settings.
*   `IndexedDB` (database `wf-local-api`): Stores all client-side application data, supporting offline functionality.
*   `BroadcastChannel("wf-screen-state")`: Facilitates cross-tab synchronization.
*   Service Worker (`/sw.js`): Caches app shell for PWA and offline access.
*   `sessionStorage`: For session-scoped UI state.