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
    *   **How To:** In-app user guide.
    *   **Settings:** Application-wide configuration.
*   **Broadcast Window (`/broadcast`):** Dedicated full-screen output window for audience display, synchronized with operator actions via IndexedDB and `BroadcastChannel`. Renders backgrounds and applies layout settings with a focus on performance.

**Key Architectural Patterns:**
*   **Offline-first Data Flow:** Content updates are written to IndexedDB, and changes are synchronized across tabs using `BroadcastChannel`, minimizing server interaction.
*   **`safeBase` / `safeFullState`:** Ensures data consistency before updates.
*   **Partial Updates:** Facilitates efficient patching of data.
*   **Persistent UI State:** Manages long-lived UI state across route changes.
*   **Broadcast Performance:** Broadcast window is optimized for performance with lean rendering.
*   **Alpha Composition:** Ensures proper background alpha application without affecting foreground text.

## External Dependencies

*   `bible-api.com`: For fetching Bible passages and translations.
*   Replit AI Integrations OpenAI proxy (`gpt-5.4`): For AI-generated teaching drafts.
*   PostgreSQL: Used as the primary backend database.
*   OpenAPI Specification: Defines the API contract for client-side code generation.
*   Window Management API: For multi-display handling in broadcast.
*   `localStorage`: Stores user preferences, custom teachings, and UI settings.
*   `IndexedDB` (database `wf-local-api`): Stores all client-side application data, supporting offline functionality.
*   `BroadcastChannel("wf-screen-state")`: Facilitates cross-tab synchronization.
*   Service Worker (`/sw.js`): Caches app shell for PWA and offline access.
*   `sessionStorage`: For session-scoped UI state.