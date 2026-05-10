# Phiri WorshipFlow — Desktop Installer (Electron)

This package wraps the Phiri WorshipFlow web app in a native desktop window using Electron, producing a proper installable desktop app — `.exe` for Windows and `.dmg` for macOS.

## What you get

| Platform | Output | Notes |
|---|---|---|
| Windows | `Phiri WorshipFlow Setup x.x.x.exe` | NSIS installer with desktop shortcut, Start menu entry, uninstaller |
| macOS | `Phiri WorshipFlow-x.x.x.dmg` | Standard drag-to-Applications DMG |
| Linux | `Phiri WorshipFlow-x.x.x.AppImage` | Portable single-file, no install needed |

All data (songs, notes, schedules, accounts) is stored locally in IndexedDB — the app works fully offline once installed.

## How to build

> **Important:** You must build on the target platform. To make a Windows `.exe`, build on Windows. To make a `.dmg`, build on macOS.

### Step 1 — Build the web app

From the workspace root:

```bash
pnpm --filter @workspace/worshipflow run build
```

This creates `artifacts/worshipflow/dist/public/`.

### Step 2 — Install Electron dependencies

```bash
cd artifacts/electron
npm install
```

### Step 3 — Build the installer

```bash
# Windows .exe
npm run build:win

# macOS .dmg
npm run build:mac

# Linux .AppImage + .deb
npm run build:linux

# All platforms at once (only works on macOS with Wine installed for cross-compile)
npm run build:all
```

Output files appear in `artifacts/electron/dist-electron/`.

## Running without building an installer

If you just want to launch the desktop window locally (e.g. to test):

```bash
# Step 1: build the web app
pnpm --filter @workspace/worshipflow run build

# Step 2: install + launch
cd artifacts/electron
npm install
npm start
```

## GitHub Actions CI (recommended)

To automate installer builds on every release, add a workflow like this:

```yaml
name: Build Desktop Installers
on:
  push:
    tags: ['v*']
jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install
      - run: pnpm --filter @workspace/worshipflow run build
      - run: cd artifacts/electron && npm install && npm run build:win
      - uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: artifacts/electron/dist-electron/*.exe

  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install
      - run: pnpm --filter @workspace/worshipflow run build
      - run: cd artifacts/electron && npm install && npm run build:mac
      - uses: actions/upload-artifact@v4
        with:
          name: mac-installer
          path: artifacts/electron/dist-electron/*.dmg
```

## Architecture notes

- `src/main.js` — Electron main process. Opens a `BrowserWindow` and loads the Vite build via `electron-serve`.
- The web app's IndexedDB storage persists between sessions in the Electron app's data directory (`%APPDATA%\Phiri WorshipFlow` on Windows, `~/Library/Application Support/Phiri WorshipFlow` on macOS).
- The Broadcast window (`Ctrl+B` / `Cmd+B`) opens a second `BrowserWindow` navigated to `/broadcast` — the same projection-optimised route used in the browser version.
- No Express server runs inside the Electron app. The offline API intercept (IndexedDB monkey-patch) handles all `/api/*` calls from within the renderer, exactly as it does in the PWA.
