import { useState, useCallback, useRef } from "react";

export interface ScreenInfo {
  index: number;
  label: string;
  width: number;
  height: number;
  left: number;
  top: number;
  isPrimary: boolean;
  isInternal: boolean;
}

export interface BroadcastSettings {
  autoFullscreen: boolean;
  hideCursor: boolean;
  loopVideo: boolean;
  aspectRatio: "16:9" | "4:3" | "native";
}

const DEFAULT_SETTINGS: BroadcastSettings = {
  autoFullscreen: true,
  hideCursor: true,
  loopVideo: true,
  aspectRatio: "16:9",
};

function loadSettings(): BroadcastSettings {
  try {
    const saved = localStorage.getItem("wf-broadcast-settings");
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: BroadcastSettings) {
  try {
    localStorage.setItem("wf-broadcast-settings", JSON.stringify(s));
  } catch {}
}

export function useBroadcast() {
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [permissionState, setPermissionState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [settings, setSettingsState] = useState<BroadcastSettings>(loadSettings);
  const [broadcastWin, setBroadcastWin] = useState<Window | null>(null);
  // Track the screen the broadcast window is currently on
  const [activeScreen, setActiveScreen] = useState<ScreenInfo | null>(null);
  const screensRef = useRef<ScreenInfo[]>([]);

  const updateSettings = useCallback((patch: Partial<BroadcastSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const detectScreens = useCallback(async (): Promise<ScreenInfo[] | null> => {
    const api = (window as any).getScreenDetails;
    if (typeof api !== "function") return null;

    setPermissionState("requesting");
    try {
      const details = await (window as any).getScreenDetails();
      const mapped: ScreenInfo[] = (details.screens as any[]).map(
        (s: any, i: number) => ({
          index: i,
          label: s.label || (s.isPrimary ? "Primary display" : `Display ${i + 1}`),
          width: s.availWidth ?? s.width,
          height: s.availHeight ?? s.height,
          left: s.availLeft ?? s.left,
          top: s.availTop ?? s.top,
          isPrimary: s.isPrimary,
          isInternal: s.isInternal,
        })
      );
      setScreens(mapped);
      screensRef.current = mapped;
      setPermissionState("granted");
      return mapped;
    } catch {
      setPermissionState("denied");
      return null;
    }
  }, []);

  const openBroadcast = useCallback(
    async (targetScreen?: ScreenInfo) => {
      // If the broadcast window is already open and alive, just focus it
      if (broadcastWin && !broadcastWin.closed) {
        try {
          broadcastWin.focus();
          return broadcastWin;
        } catch {}
      }

      const base = window.location.origin + import.meta.env.BASE_URL;
      const params = new URLSearchParams();
      if (settings.autoFullscreen) params.set("fullscreen", "1");
      if (settings.hideCursor) params.set("hidecursor", "1");
      const url = `${base}broadcast?${params.toString()}`;

      let win: Window | null = null;

      if (targetScreen) {
        const { left, top, width, height } = targetScreen;
        win = window.open(
          url,
          "wf-broadcast",
          `left=${left},top=${top},width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`
        );
        if (win) {
          setTimeout(() => {
            try { win!.moveTo(left, top); win!.resizeTo(width, height); } catch {}
          }, 200);
        }
      } else {
        win = window.open(url, "wf-broadcast", "noopener,noreferrer");
      }

      if (win) {
        setBroadcastWin(win);
        setActiveScreen(targetScreen ?? null);
      }
      return win;
    },
    [settings, broadcastWin]
  );

  /**
   * Auto-detect screens and launch broadcast on the first secondary display.
   * Falls back to a new tab if only one screen is found or the API is unsupported.
   */
  const autoLaunchBroadcast = useCallback(async (): Promise<{ win: Window | null; screen: ScreenInfo | null }> => {
    let available = screensRef.current;

    // Try to detect if we haven't yet (or refresh the list)
    if (typeof (window as any).getScreenDetails === "function") {
      const detected = await detectScreens();
      available = detected ?? available;
    }

    // Prefer first non-primary screen; fall back to any screen
    const secondary = available.find(s => !s.isPrimary) ?? available[0] ?? null;

    const win = await openBroadcast(secondary ?? undefined);
    return { win, screen: secondary };
  }, [detectScreens, openBroadcast]);

  const isWindowManagementSupported = typeof (window as any).getScreenDetails === "function";

  // Derived: is a secondary screen currently detected?
  const secondaryScreen = screens.find(s => !s.isPrimary) ?? null;

  return {
    screens,
    secondaryScreen,
    permissionState,
    settings,
    updateSettings,
    detectScreens,
    openBroadcast,
    autoLaunchBroadcast,
    broadcastWin,
    activeScreen,
    isWindowManagementSupported,
  };
}
