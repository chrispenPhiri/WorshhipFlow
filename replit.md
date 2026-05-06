# Phiri WorshipFlow

Phiri WorshipFlow is a church worship presentation software that helps manage and display worship content for operators and audiences.

## Run & Operate

_Populate as you build_

## Stack

*   **Frontend:** React, Vite, Tailwind v4, shadcn/ui, Wouter, TanStack Query
*   **Backend:** Express 5, PostgreSQL, Drizzle ORM, Zod, TypeScript 5.9, Node.js 24
*   **Build:** pnpm monorepo, esbuild
*   **API Codegen:** Orval

## Where things live

*   **DB Schema:** Drizzle ORM definitions (server-side), IndexedDB (`wf-local-api`) for client-side data.
*   **API Contracts:** OpenAPI specification.
*   **UI Customization:** `localStorage` for main menu icons, themes, and various UI states.
*   **PWA Assets:** `sw.js` (Service Worker).
*   **Application Data Backup:** File System Access API for single-file/folder backup/restore.
*   **Bible-only mode:** `lib/bible-only-mode.ts`
*   **Emoji Mode:** `wf-emoji-mode` in `localStorage`
*   **Live Captions:** `components/live-captions-card.tsx`
*   **Stream Destinations:** `components/stream-destinations-card.tsx`
*   **Global Operator Scroll:** `hooks/use-global-scroll-keys.ts`, `components/layout.tsx`
*   **AI Page Tabs:** TABS array (see `/ai` route)

## Architecture decisions

*   **Offline-first:** Most operations leverage client-side storage (IndexedDB) with `window.fetch` monkey-patched to intercept `/api/*` requests for offline functionality.
*   **Cross-tab Synchronization:** Achieved using `BroadcastChannel` for real-time updates across multiple browser tabs.
*   **Client-side Authentication:** Secure, device-local username/password authentication using PBKDF2-SHA256, stored in IndexedDB.
*   **Dynamic AI Content Generation:** AI tools generate diverse content, with a shared `<ResultBlock>` for unified actions (Send to screen, Export PDF, Refine).
*   **Broadcast Window Optimization:** Dedicated window (`/broadcast`) focused on lean rendering, auto-fit text, smooth camera transitions, and no-flash camera switching for optimal audience display.
*   **Global Operator Scroll:** Allows operators to control screen content scroll from anywhere in the app using keyboard shortcuts.

## Product

*   **Content Management:** Bible passages (via `bible-api.com`), songs, custom text, multimedia.
*   **Presentation Tools:** Live preview, multi-display broadcasting, customizable themes, live animated wallpapers, ticker bars.
*   **Service Management:** Drag-and-drop schedule builder, sermon notes, prayer wall, hymn number projection, service countdown.
*   **AI-Powered Features:** AI-generated teaching drafts, sermon outlines, devotionals, quizzes, cross-references, translations. Floating AI Quick Panel (`components/ai-quick-panel.tsx`) accessible from every tab — quick prompts (prayer, sermon, devotional, announcement) and free-text chat, with send-to-screen. Requires user's own OpenAI API key (stored in localStorage `wf-openai-key`, sent as `X-OpenAI-Key` header).
*   **Interactive Elements:** Offline Bible games (all graphical broadcast via `game-stage-view.tsx`), live captions (Web Speech API), stream destination management.
*   **User Accounts:** Local, secure account management with profile editing (display name, avatar, password) via `ProfileDialog` (`components/profile-dialog.tsx`).
*   **Data Persistence:** PWA storage protection, single-file/folder backup and restore.

## User preferences

I want iterative development. I prefer detailed explanations for complex features. I want to be asked before making major architectural changes or introducing new external dependencies.

## Gotchas

*   **Offline API:** The React app intercepts `/api/*` requests to write to IndexedDB, so the Express server mainly serves as an AI proxy passthrough in production.
*   **Screen Capture Gesture:** Browsers require a real user gesture in the receiving window to initiate `getDisplayMedia()`, so the broadcast page displays a click overlay for screen capture.
*   **Live Captions (Web Speech API):** Chromium-only feature.
*   **Teleprompter Auto-scroll:** Space bar (in broadcast or via global scroll keys) toggles teleprompter mode.
*   **Scroll Alignment:** When scrolling is active, vertical alignment switches to `flex-start` to ensure the full text range is reachable.

## Pointers

*   **Multi-Provider AI:** Server (`artifacts/api-server/src/routes/ai.ts`) resolves provider via `X-AI-Source` (replit) or `X-AI-Provider` + `X-AI-Key` headers (openai/gemini/openrouter). Providers use OpenAI SDK with different base URLs. Keys stored per-provider in `localStorage` (`wf-openai-key`, `wf-gemini-key`, `wf-openrouter-key`); source stored as `wf-ai-source`. Image generation (DALL-E 3) requires OpenAI or OpenRouter — Gemini returns 400.
*   **YouTube Mini-Player:** Drag anywhere via pointer events; hide/show (iframe stays rendered in overflow:hidden container to keep audio alive); monitor button opens YouTube in popup window for presentation screen.
*   **bible-api.com:** External API for Bible content.
*   **W3C Window Management API:** For multi-display handling.
*   **Web Speech API:** Browser API for live captions.
*   **File System Access API:** For data backup/restore.