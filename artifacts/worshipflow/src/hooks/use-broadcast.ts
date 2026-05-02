import { useState, useCallback } from "react";

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
      setPermissionState("granted");
      return mapped;
    } catch {
      setPermissionState("denied");
      return null;
    }
  }, []);

  const openBroadcast = useCallback(
    async (targetScreen?: ScreenInfo) => {
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
        // Move to exact position after open (some browsers shift the window)
        if (win) {
          setTimeout(() => {
            try { win!.moveTo(left, top); win!.resizeTo(width, height); } catch {}
          }, 200);
        }
      } else {
        win = window.open(url, "wf-broadcast", "noopener,noreferrer");
      }

      if (win) setBroadcastWin(win);
      return win;
    },
    [settings]
  );

  const isWindowManagementSupported = typeof (window as any).getScreenDetails === "function";

  return {
    screens,
    permissionState,
    settings,
    updateSettings,
    detectScreens,
    openBroadcast,
    broadcastWin,
    isWindowManagementSupported,
  };
}
