/**
 * Phiri WorshipFlow — Electron main process
 *
 * Serves the pre-built Vite output from artifacts/worshipflow/dist/public
 * using electron-serve (zero-config static file server), so the app runs
 * fully offline with no external Node server required.
 *
 * HOW TO BUILD A DISTRIBUTABLE INSTALLER
 * ─────────────────────────────────────
 * 1. Build the web app first (from the workspace root):
 *      pnpm --filter @workspace/worshipflow run build
 *
 * 2. Then build the Electron installer (from this directory):
 *      cd artifacts/electron
 *      npm install          # or pnpm install
 *      npm run build:win    # → dist-electron/*.exe  (Windows)
 *      npm run build:mac    # → dist-electron/*.dmg  (macOS)
 *      npm run build:linux  # → dist-electron/*.AppImage / .deb
 *
 * NOTE: electron-builder must run on the TARGET platform.
 *   - To build a Windows .exe, run on a Windows machine (or GitHub Actions windows-latest).
 *   - To build a macOS .dmg, run on a macOS machine (or GitHub Actions macos-latest).
 *   - Linux can cross-compile for Linux only.
 *
 * RUNNING IN DEV (no installer, just launches the desktop window):
 *      pnpm --filter @workspace/worshipflow run build
 *      cd artifacts/electron && npm install && npm start
 */

const { app, BrowserWindow, Menu, shell, dialog, nativeTheme } = require("electron");
const path = require("path");
const serve = require("electron-serve");

// Force dark title bar on macOS
nativeTheme.themeSource = "dark";

const loadApp = serve({ directory: path.join(__dirname, "..", "resources", "app") });

let mainWindow = null;
let broadcastWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "Phiri WorshipFlow",
    backgroundColor: "#0f0f11",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    icon: path.join(__dirname, "..", "resources", "app", "icon.png"),
  });

  loadApp(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (broadcastWindow) {
      broadcastWindow.close();
      broadcastWindow = null;
    }
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http") && !url.includes("app://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

function createBroadcastWindow() {
  if (broadcastWindow) { broadcastWindow.focus(); return; }
  broadcastWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    title: "Phiri WorshipFlow — Broadcast",
    backgroundColor: "#000000",
    fullscreen: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  loadApp(broadcastWindow).then(() => {
    broadcastWindow.loadURL("app://-/broadcast");
  });
  broadcastWindow.on("closed", () => { broadcastWindow = null; });
}

function buildMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [{ label: app.name, submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }] }]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open Broadcast Window",
          accelerator: "CmdOrCtrl+B",
          click: createBroadcastWindow,
        },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        {
          label: "Broadcast Output",
          accelerator: "CmdOrCtrl+B",
          click: createBroadcastWindow,
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Phiri WorshipFlow",
          click: () =>
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Phiri WorshipFlow",
              message: "Phiri WorshipFlow",
              detail: `Version ${app.getVersion()}\n\nOffline-first church worship presentation software.\n\nAll data is stored locally on this device.`,
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Handle the broadcast window request from the renderer
app.on("second-instance", () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});
