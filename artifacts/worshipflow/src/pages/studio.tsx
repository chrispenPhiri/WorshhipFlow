/**
 * Live Studio — production broadcast control console
 *
 * Layout: large preview + scene grid (left) | controls (right)
 * Shared localStorage keys with LiveStudioPanel stay in sync.
 *
 * Bug fixes vs v1:
 *  - switchCameraLayout no longer requires camera bg to be pre-set
 *  - safeBase() preserves isLive / liveScene so live session survives bg/overlay updates
 *  - Camera can be enabled/disabled independently of layout
 */
import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey,
  type Background, type BackgroundCameraLayout,
  type ScreenStateScoreboardStyle, type ScreenStateScoreboardPosition,
  type ScreenStateLogoPosition, type ScreenStateTimerMode,
  type ScreenStateTimerPosition, type ScreenStateUrlOverlayPosition,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Radio, Youtube, Tv, Twitch, Zap, MonitorPlay,
  Play, Square, RotateCcw, Sparkles, Loader2,
  Camera, SwitchCamera, Maximize2, RefreshCw, X,
  Layers3, Mic2, ChevronDown, ChevronUp, Copy,
  Eye, EyeOff, Monitor, MonitorOff, VideoOff, Video,
  AlignLeft, FlipHorizontal, Sun, Sliders,
  Trophy, Timer as TimerIcon, Globe, FileImage, Plus, Minus,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Platform = "youtube" | "facebook" | "twitch" | "custom";
interface Scene { id: string; name: string; icon: string; }
interface GraphicPreset { id: string; label: string; emoji: string; lowerThirdName: string; lowerThirdTitle: string; }
interface CameraDevice { deviceId: string; label: string; }
type BgObj = Background;

// ── Constants ─────────────────────────────────────────────────────────────────
const BROADCAST_SRC = (() => {
  const base = import.meta.env.BASE_URL ?? "/";
  return base.endsWith("/") ? `${base}broadcast` : `${base}/broadcast`;
})();

const PLATFORM_INFO: Record<Platform, { label: string; color: string; rtmpDefault: string }> = {
  youtube:  { label: "YouTube Live",  color: "#ef4444", rtmpDefault: "rtmp://a.rtmp.youtube.com/live2" },
  facebook: { label: "Facebook Live", color: "#3b82f6", rtmpDefault: "rtmps://live-api-s.facebook.com:443/rtmp" },
  twitch:   { label: "Twitch",        color: "#a855f7", rtmpDefault: "rtmp://live.twitch.tv/live" },
  custom:   { label: "Custom RTMP",   color: "#f59e0b", rtmpDefault: "" },
};

const DEFAULT_SCENES: Scene[] = [
  { id: "1", name: "Main Stage", icon: "🎤" },
  { id: "2", name: "Worship",    icon: "🎵" },
  { id: "3", name: "Message",    icon: "📖" },
  { id: "4", name: "Prayer",     icon: "🙏" },
];

const DEFAULT_PRESETS: GraphicPreset[] = [
  { id: "welcome",   label: "Welcome",   emoji: "👋", lowerThirdName: "Welcome",        lowerThirdTitle: "We're glad you're here!" },
  { id: "offering",  label: "Offering",  emoji: "💝", lowerThirdName: "Offering",       lowerThirdTitle: "Give generously" },
  { id: "prayer",    label: "Prayer",    emoji: "🙏", lowerThirdName: "Prayer Time",    lowerThirdTitle: "Come before God together" },
  { id: "worship",   label: "Worship",   emoji: "🎵", lowerThirdName: "Worship",        lowerThirdTitle: "Lift your voice" },
  { id: "message",   label: "Message",   emoji: "📖", lowerThirdName: "The Message",    lowerThirdTitle: "" },
  { id: "break",     label: "Break",     emoji: "☕", lowerThirdName: "Short Break",    lowerThirdTitle: "We'll be back shortly" },
  { id: "communion", label: "Communion", emoji: "🍞", lowerThirdName: "Communion",      lowerThirdTitle: "In remembrance of Him" },
  { id: "closing",   label: "Closing",   emoji: "✨", lowerThirdName: "God bless you!", lowerThirdTitle: "See you next time" },
];

// 7 camera layout modes
const CAM_LAYOUTS: { id: string; label: string }[] = [
  { id: "fullscreen",      label: "Full" },
  { id: "pip-bottomright", label: "PiP ↘" },
  { id: "pip-bottomleft",  label: "PiP ↙" },
  { id: "pip-topright",    label: "PiP ↗" },
  { id: "pip-topleft",     label: "PiP ↖" },
  { id: "side-left",       label: "⬤ Left" },
  { id: "side-right",      label: "⬤ Right" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function PlatformIcon({ p, size = 14 }: { p: Platform; size?: number }) {
  if (p === "youtube")  return <Youtube  style={{ width: size, height: size }} />;
  if (p === "facebook") return <span style={{ fontSize: size - 2, fontWeight: 700 }}>f</span>;
  if (p === "twitch")   return <Twitch   style={{ width: size, height: size }} />;
  return <Zap style={{ width: size, height: size }} />;
}

/** Visual mini-diagram for a camera layout option */
function LayoutDiagram({ id, active }: { id: string; active: boolean }) {
  const border = active ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.25)";
  const fill   = active ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.12)";
  const cam    = active ? "rgba(99,102,241,0.9)"  : "rgba(255,255,255,0.55)";
  const W = 40; const H = 26;
  const pip = 11;

  if (id === "fullscreen") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={1} y={1} width={W-2} height={H-2} rx={2} fill={cam} stroke={border} strokeWidth={1.2} />
      </svg>
    );
  }
  if (id === "pip-bottomright") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={1} y={1} width={W-2} height={H-2} rx={2} fill={fill} stroke={border} strokeWidth={1.2} />
        <rect x={W-pip-2} y={H-pip*0.65-2} width={pip} height={pip*0.65} rx={1} fill={cam} stroke={border} strokeWidth={0.8} />
      </svg>
    );
  }
  if (id === "pip-bottomleft") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={1} y={1} width={W-2} height={H-2} rx={2} fill={fill} stroke={border} strokeWidth={1.2} />
        <rect x={2} y={H-pip*0.65-2} width={pip} height={pip*0.65} rx={1} fill={cam} stroke={border} strokeWidth={0.8} />
      </svg>
    );
  }
  if (id === "pip-topright") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={1} y={1} width={W-2} height={H-2} rx={2} fill={fill} stroke={border} strokeWidth={1.2} />
        <rect x={W-pip-2} y={2} width={pip} height={pip*0.65} rx={1} fill={cam} stroke={border} strokeWidth={0.8} />
      </svg>
    );
  }
  if (id === "pip-topleft") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={1} y={1} width={W-2} height={H-2} rx={2} fill={fill} stroke={border} strokeWidth={1.2} />
        <rect x={2} y={2} width={pip} height={pip*0.65} rx={1} fill={cam} stroke={border} strokeWidth={0.8} />
      </svg>
    );
  }
  if (id === "side-left") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={1} y={1} width={W-2} height={H-2} rx={2} fill={fill} stroke={border} strokeWidth={1.2} />
        <rect x={1} y={1} width={Math.round(W*0.35)} height={H-2} rx={2} fill={cam} />
        <line x1={Math.round(W*0.35)} y1={1} x2={Math.round(W*0.35)} y2={H-1} stroke={border} strokeWidth={0.8} />
      </svg>
    );
  }
  if (id === "side-right") {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={1} y={1} width={W-2} height={H-2} rx={2} fill={fill} stroke={border} strokeWidth={1.2} />
        <rect x={W-Math.round(W*0.35)-1} y={1} width={Math.round(W*0.35)} height={H-2} rx={2} fill={cam} />
        <line x1={W-Math.round(W*0.35)-1} y1={1} x2={W-Math.round(W*0.35)-1} y2={H-1} stroke={border} strokeWidth={0.8} />
      </svg>
    );
  }
  return null;
}

/** Collapsible right-panel section */
function Section({
  title, icon, children, collapsible = false, defaultOpen = true,
  badge,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  collapsible?: boolean; defaultOpen?: boolean; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-white/5 ${collapsible ? "cursor-pointer hover:bg-white/8" : "cursor-default"}`}
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-white/70 uppercase tracking-wide">
          {icon} {title}
        </span>
        <span className="flex items-center gap-1.5">
          {badge}
          {collapsible && (open
            ? <ChevronUp className="w-3.5 h-3.5 text-white/40" />
            : <ChevronDown className="w-3.5 h-3.5 text-white/40" />)}
        </span>
      </button>
      {open && <div className="px-3 py-2.5 space-y-2">{children}</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudioPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 1200 },
  });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  // ── Shared localStorage state ──────────────────────────────────────────────
  const [platform, setPlatform] = useLocalStorage<Platform>("wf-live-platform", "youtube");
  const [streamKey]  = useLocalStorage("wf-live-stream-key", "");
  const [rtmpUrl]    = useLocalStorage("wf-live-rtmp-url", "");
  const [showKey, setShowKey] = useState(false);
  const [socialHandles]    = useLocalStorage("wf-live-social-handles", "");
  const [liveShowHandles]  = useLocalStorage("wf-live-show-handles", true);
  const [scenes]     = useLocalStorage<Scene[]>("wf-live-scenes", DEFAULT_SCENES);
  const [presets]    = useLocalStorage<GraphicPreset[]>("wf-graphic-presets", DEFAULT_PRESETS);
  const [iframeKey, setIframeKey] = useState(0);
  const [isRehearsal, setIsRehearsal] = useState(false);

  // ── Derived screen state ───────────────────────────────────────────────────
  const isLive      = screenState?.isLive ?? false;
  const isBlack     = screenState?.isBlack ?? false;
  const isClear     = screenState?.isClear ?? false;
  const liveStartTime = screenState?.liveStartTime;
  const currentScene  = screenState?.liveScene;
  const bg            = screenState?.background as BgObj | undefined;
  const isCameraBg    = bg?.type === "camera";
  const currentLayout = (bg?.cameraLayout as string | undefined) ?? "fullscreen";
  const currentCamId  = (bg?.cameraDeviceId as string | undefined) ?? "";
  const lowerActive   = screenState?.lowerThirdEnabled ?? false;
  const tickerActive  = screenState?.tickerEnabled ?? false;

  // ── Ticker local state ─────────────────────────────────────────────────────
  const [tickerText, setTickerText] = useState(screenState?.tickerText as string ?? "");
  const [tickerSpeed, setTickerSpeed] = useState(screenState?.tickerSpeed as number ?? 25);
  useEffect(() => {
    if (screenState?.tickerText != null) setTickerText(screenState.tickerText as string);
    if (screenState?.tickerSpeed != null) setTickerSpeed(screenState.tickerSpeed as number);
  }, [screenState?.tickerText, screenState?.tickerSpeed]);

  // ── Camera props local state ───────────────────────────────────────────────
  const [camBrightness, setCamBrightness] = useState((bg?.cameraBrightness as number | undefined) ?? 100);
  const [camMirror, setCamMirror]         = useState((bg?.cameraMirror as boolean | undefined) ?? false);
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [detectingCams, setDetectingCams] = useState(false);

  // ── Presenter local state ──────────────────────────────────────────────────
  const [presenterName, setPresenterName]   = useState("");
  const [presenterTitle, setPresenterTitle] = useState("");

  // ── Graphic Overlays local state ───────────────────────────────────────────
  const [overlayTab, setOverlayTab] = useState<"scoreboard" | "image" | "timer" | "url" | "camera">("scoreboard");
  const [studioPanel, setStudioPanel] = useState<"monitor" | "controls">("controls");
  const [imageUrl,   setImageUrl]   = useState((screenState?.logoUrl    as string) ?? "");
  const [teamA,      setTeamA]      = useState((screenState?.scoreboardTeamA as string) ?? "Home");
  const [teamB,      setTeamB]      = useState((screenState?.scoreboardTeamB as string) ?? "Away");
  const [timerDurMin, setTimerDurMin] = useState(Math.floor(((screenState?.timerDurationSec as number) ?? 300) / 60));
  const [timerDurSec, setTimerDurSec] = useState(((screenState?.timerDurationSec as number) ?? 300) % 60);
  const [timerLabelLocal, setTimerLabelLocal] = useState((screenState?.timerLabel as string) ?? "");
  const [urlInput,   setUrlInput]   = useState((screenState?.urlOverlayUrl as string) ?? "");

  useEffect(() => {
    if (screenState?.logoUrl         != null) setImageUrl(screenState.logoUrl as string);
    if (screenState?.scoreboardTeamA != null) setTeamA(screenState.scoreboardTeamA as string);
    if (screenState?.scoreboardTeamB != null) setTeamB(screenState.scoreboardTeamB as string);
    const dur = (screenState?.timerDurationSec as number) ?? 300;
    setTimerDurMin(Math.floor(dur / 60));
    setTimerDurSec(dur % 60);
    if (screenState?.timerLabel     != null) setTimerLabelLocal((screenState.timerLabel as string) ?? "");
    if (screenState?.urlOverlayUrl  != null) setUrlInput((screenState.urlOverlayUrl as string) ?? "");
  }, [screenState?.logoUrl, screenState?.scoreboardTeamA, screenState?.scoreboardTeamB,
      screenState?.timerDurationSec, screenState?.timerLabel, screenState?.urlOverlayUrl]);

  // ── Live duration counter ──────────────────────────────────────────────────
  const [liveDuration, setLiveDuration] = useState(0);
  useEffect(() => {
    if (!isLive || !liveStartTime) { setLiveDuration(0); return; }
    const tick = () => setLiveDuration(Date.now() - new Date(liveStartTime as string).getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isLive, liveStartTime]);

  // ── safeBase: preserve critical live & content fields across all updates ───
  const safeBase = useCallback(() => ({
    isBlack:      screenState?.isBlack     ?? false,
    isClear:      screenState?.isClear     ?? false,
    contentType:  (screenState?.contentType ?? "none") as "none" | "verse" | "song" | "custom_text" | "image" | "video" | "game",
    isLive:       screenState?.isLive      ?? false,
    liveScene:    screenState?.liveScene,
    livePlatform: screenState?.livePlatform,
    liveStartTime: screenState?.liveStartTime,
  }), [screenState]);

  // ── Stream controls ────────────────────────────────────────────────────────
  const goLive = () => {
    setIsRehearsal(false);
    updateScreen({ data: { ...safeBase(), isLive: true, livePlatform: platform, liveStartTime: new Date().toISOString(), liveScene: scenes[0]?.name ?? "Main Stage", liveSocialHandles: liveShowHandles ? socialHandles : "" } });
    toast({ title: `🔴 Going Live on ${PLATFORM_INFO[platform].label}` });
  };
  const rehearse = () => {
    setIsRehearsal(true);
    setIframeKey(k => k + 1);
    updateScreen({ data: { ...safeBase(), isLive: true, livePlatform: platform, liveStartTime: new Date().toISOString(), liveScene: scenes[0]?.name ?? "Main Stage", liveSocialHandles: liveShowHandles ? socialHandles : "" } });
    toast({ title: "🎬 Rehearsal Mode" });
  };
  const endStream = () => {
    setIsRehearsal(false);
    updateScreen({ data: { ...safeBase(), isLive: false, liveStartTime: undefined as unknown as string } });
    toast({ title: isRehearsal ? "Rehearsal ended" : "Stream ended" });
  };

  // ── Screen output controls ─────────────────────────────────────────────────
  const toggleBlack = () => updateScreen({ data: { ...safeBase(), isBlack: !isBlack, isClear: false } });
  const toggleClear = () => updateScreen({ data: { ...safeBase(), isClear: !isClear, isBlack: false } });

  // ── Scene switching ────────────────────────────────────────────────────────
  const switchScene = (scene: Scene) => {
    updateScreen({ data: { ...safeBase(), liveScene: scene.name } });
    toast({ title: `Scene → ${scene.name}` });
  };

  // ── Graphic Overlays derived values ───────────────────────────────────────
  const scoreboardEnabled  = (screenState?.scoreboardEnabled  as boolean) ?? false;
  const scoreA             = (screenState?.scoreboardScoreA   as number)  ?? 0;
  const scoreB             = (screenState?.scoreboardScoreB   as number)  ?? 0;
  const scoreboardStyle    = (screenState?.scoreboardStyle    as string)  ?? "modern";
  const scoreboardPosition = (screenState?.scoreboardPosition as string)  ?? "top-left";
  const scoreboardAccentA  = (screenState?.scoreboardAccentA  as string)  ?? "#ef4444";
  const scoreboardAccentB  = (screenState?.scoreboardAccentB  as string)  ?? "#3b82f6";
  const timerEnabled  = (screenState?.timerEnabled  as boolean) ?? false;
  const timerRunning  = !!(screenState?.timerStartedAt);
  const timerMode     = (screenState?.timerMode     as string)  ?? "stopwatch";
  const timerPosition = (screenState?.timerPosition as string)  ?? "top-center";
  const imageEnabled  = (screenState?.logoOverlayEnabled as boolean) ?? false;
  const imagePosition = (screenState?.logoPosition as string)  ?? "top-right";
  const imageSize     = (screenState?.logoSize     as number)  ?? 20;
  const imageOpacity  = (screenState?.logoOpacity  as number)  ?? 100;
  const urlOverlayEnabled = (screenState?.urlOverlayEnabled as boolean) ?? false;
  const urlWidth    = (screenState?.urlOverlayWidth    as number) ?? 32;
  const urlHeight   = (screenState?.urlOverlayHeight   as number) ?? 22;
  const urlOpacity  = (screenState?.urlOverlayOpacity  as number) ?? 100;
  const urlPosition = (screenState?.urlOverlayPosition as string) ?? "top-right";
  const activeGraphicOverlayCount = [scoreboardEnabled, timerEnabled, imageEnabled, urlOverlayEnabled].filter(Boolean).length;

  // ── Graphic Overlays helpers ────────────────────────────────────────────────
  const bumpScore = (team: "A" | "B", delta: number) => {
    const next = Math.max(0, (team === "A" ? scoreA : scoreB) + delta);
    updateScreen({ data: { ...safeBase(), scoreboardEnabled: true, scoreboardTeamA: teamA, scoreboardTeamB: teamB, scoreboardScoreA: team === "A" ? next : scoreA, scoreboardScoreB: team === "B" ? next : scoreB, scoreboardPeriod: (screenState?.scoreboardPeriod as string) ?? "" } });
  };
  const pushScoreboard = (patch: Record<string, unknown>) => {
    updateScreen({ data: { ...safeBase(), scoreboardTeamA: teamA, scoreboardTeamB: teamB, scoreboardScoreA: scoreA, scoreboardScoreB: scoreB, scoreboardPeriod: (screenState?.scoreboardPeriod as string) ?? "", scoreboardStyle: scoreboardStyle as ScreenStateScoreboardStyle, scoreboardPosition: scoreboardPosition as ScreenStateScoreboardPosition, scoreboardAccentA, scoreboardAccentB, ...patch } });
  };
  const pushImageOverlay = (enabled: boolean, opts?: Record<string, unknown>) => {
    updateScreen({ data: { ...safeBase(), logoOverlayEnabled: enabled, logoUrl: imageUrl, logoPosition: imagePosition as ScreenStateLogoPosition, logoSize: imageSize, logoOpacity: imageOpacity, ...opts } });
  };
  const timerStart = () => {
    updateScreen({ data: { ...safeBase(), timerEnabled: true, timerStartedAt: new Date().toISOString(), timerMode: timerMode as ScreenStateTimerMode, timerDurationSec: timerDurMin * 60 + timerDurSec, timerLabel: timerLabelLocal || null as unknown as string, timerPosition: timerPosition as ScreenStateTimerPosition } });
  };
  const timerPause = () => {
    const st = screenState?.timerStartedAt as string | undefined;
    const elapsed = st ? Date.now() - Date.parse(st) : 0;
    const acc = ((screenState?.timerAccumulatedMs as number) ?? 0) + elapsed;
    updateScreen({ data: { ...safeBase(), timerStartedAt: null as unknown as string, timerAccumulatedMs: acc } });
  };
  const timerReset = () => {
    updateScreen({ data: { ...safeBase(), timerStartedAt: null as unknown as string, timerAccumulatedMs: 0 } });
  };
  const pushUrlOverlay = (enabled: boolean) => {
    updateScreen({ data: { ...safeBase(), urlOverlayEnabled: enabled, urlOverlayUrl: urlInput, urlOverlayPosition: urlPosition as ScreenStateUrlOverlayPosition, urlOverlayWidth: urlWidth, urlOverlayHeight: urlHeight, urlOverlayOpacity: urlOpacity } });
  };

  // ── Overlay / graphic presets ──────────────────────────────────────────────
  const fireGraphic = (g: GraphicPreset) => {
    updateScreen({ data: { ...safeBase(), lowerThirdEnabled: true, lowerThirdName: g.lowerThirdName, lowerThirdTitle: g.lowerThirdTitle, lowerThirdPosition: "bottom-left", lowerThirdStyle: "modern", lowerThirdAutoDismissSec: 6 } });
    toast({ title: `${g.emoji} ${g.label}`, description: "Lower third on broadcast (auto-dismisses in 6s)" });
  };
  const clearOverlays = () => updateScreen({ data: { ...safeBase(), lowerThirdEnabled: false, textOverlayEnabled: false } });

  // ── Presenter spotlight ────────────────────────────────────────────────────
  const spotlightPresenter = () => {
    if (!presenterName) return;
    updateScreen({ data: { ...safeBase(), lowerThirdEnabled: true, lowerThirdName: presenterName, lowerThirdTitle: presenterTitle, lowerThirdPosition: "bottom-left", lowerThirdStyle: "modern", lowerThirdAutoDismissSec: 0 } });
    toast({ title: "Presenter spotlight active" });
  };

  // ── Ticker ─────────────────────────────────────────────────────────────────
  const pushTicker = (enabled: boolean, text?: string) => {
    updateScreen({ data: { ...safeBase(), tickerEnabled: enabled, tickerText: text ?? tickerText, tickerSpeed } });
  };

  // helper: build a camera Background from current state + overrides
  const camBg = (overrides: Partial<BgObj> = {}): Background => ({
    ...(isCameraBg && bg ? bg : {}),
    type: "camera",
    value: "",
    cameraLayout: currentLayout as BackgroundCameraLayout,
    cameraBrightness: camBrightness,
    cameraMirror: camMirror,
    ...(currentCamId ? { cameraDeviceId: currentCamId } : {}),
    ...overrides,
  } as Background);

  // ── Camera layout (FIXED: works with any background type) ─────────────────
  const switchCameraLayout = (layout: string) => {
    updateScreen({ data: { ...safeBase(), background: camBg({ cameraLayout: layout as BackgroundCameraLayout }) } });
  };

  const enableCamera = () => {
    updateScreen({ data: { ...safeBase(), background: camBg() } });
    toast({ title: "Camera background enabled" });
  };

  const disableCamera = () => {
    updateScreen({ data: { ...safeBase(), background: { type: "live_wallpaper", value: "bokeh", overlay: 0 } as Background } });
    toast({ title: "Camera disabled — wallpaper restored" });
  };

  const applyCamBrightness = (v: number) => {
    setCamBrightness(v);
    if (!isCameraBg) return;
    updateScreen({ data: { ...safeBase(), background: camBg({ cameraBrightness: v }) } });
  };

  const applyCamMirror = (v: boolean) => {
    setCamMirror(v);
    if (!isCameraBg) return;
    updateScreen({ data: { ...safeBase(), background: camBg({ cameraMirror: v }) } });
  };

  // ── Camera device detection ────────────────────────────────────────────────
  const detectCameras = async () => {
    setDetectingCams(true);
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const devs = await navigator.mediaDevices.enumerateDevices();
      setCameraDevices(devs.filter(d => d.kind === "videoinput").map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })));
    } catch { toast({ title: "Camera access denied", variant: "destructive" }); }
    finally { setDetectingCams(false); }
  };

  const switchCamera = (deviceId: string) => {
    updateScreen({ data: { ...safeBase(), background: camBg({ cameraDeviceId: deviceId }) } });
    toast({ title: "Camera switched" });
  };

  const copyRtmp = () => {
    const url = rtmpUrl || PLATFORM_INFO[platform].rtmpDefault;
    navigator.clipboard.writeText(`${url}/${streamKey}`).then(() => toast({ title: "RTMP string copied" }));
  };

  const pInfo = PLATFORM_INFO[platform];

  return (
    <div className="flex flex-col h-[calc(100dvh-2rem)] lg:h-full -mx-4 -my-4 overflow-hidden bg-[#0d0d12]">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg shrink-0" style={{ background: isLive ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)" }}>
            <Radio className="w-4 h-4" style={{ color: isLive ? (isRehearsal ? "#eab308" : "#ef4444") : "#64748b" }} />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-sm font-bold text-white leading-none">Live Studio</h1>
            <p className="text-[10px] text-white/40 mt-0.5">Broadcast production console</p>
          </div>
          {isLive && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
              style={{ background: isRehearsal ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)", color: isRehearsal ? "#eab308" : "#ef4444" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isRehearsal ? "#eab308" : "#ef4444" }} />
              {isRehearsal ? "REHEARSAL" : "LIVE"} · {fmtDuration(liveDuration)}
            </span>
          )}
        </div>

        {/* Quick screen state pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleBlack}
            title={isBlack ? "Exit black screen" : "Black screen"}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isBlack ? "bg-white/15 text-white border border-white/30" : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/70"}`}
          >
            <MonitorOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Black</span>
          </button>
          <button
            onClick={toggleClear}
            title={isClear ? "Show screen content" : "Clear / fade out"}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isClear ? "bg-white/15 text-white border border-white/30" : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/70"}`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isLive ? (
            <button onClick={endStream}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">
              <Square className="w-3 h-3" /> {isRehearsal ? "End Rehearsal" : "End Stream"}
            </button>
          ) : (
            <>
              <button onClick={rehearse}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                <Play className="w-3 h-3" /> Rehearsal
              </button>
              <button onClick={goLive}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">
                <Radio className="w-3 h-3" /> Go Live
              </button>
            </>
          )}
          <a href={BROADCAST_SRC} target="_blank" rel="noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Open broadcast window">
            <Maximize2 className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* ── Mobile panel tabs (hidden on lg+) ── */}
      <div className="flex lg:hidden border-b border-white/10 shrink-0">
        {([
          { id: "monitor"  as const, label: "Monitor",  icon: "📺" },
          { id: "controls" as const, label: "Controls", icon: "🎛️" },
        ]).map(p => (
          <button key={p.id} onClick={() => setStudioPanel(p.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-all border-b-2 ${studioPanel === p.id ? "border-primary text-white" : "border-transparent text-white/40 hover:text-white/70"}`}>
            <span>{p.icon}</span> {p.label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 divide-x divide-white/10">

        {/* LEFT: preview + scene grid */}
        <div className={`flex-col flex-1 min-w-0 ${studioPanel === "monitor" ? "flex" : "hidden lg:flex"}`}>

          {/* Broadcast preview */}
          <div className="relative bg-black shrink-0" style={{ aspectRatio: "16/9", maxHeight: "55%" }}>
            <iframe
              key={iframeKey}
              src={BROADCAST_SRC}
              className="absolute inset-0 w-full h-full border-0"
              title="Broadcast Preview"
              allow="camera; microphone; display-capture"
            />

            {/* Off-air overlay */}
            {!isLive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 z-10">
                <MonitorPlay className="w-10 h-10 text-white/20" />
                <p className="text-white/40 text-sm">Off Air</p>
                <div className="flex gap-2">
                  <button onClick={rehearse}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                    <Play className="w-3 h-3" /> Start Rehearsal
                  </button>
                  <button onClick={goLive}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">
                    <Radio className="w-3 h-3" /> Go Live
                  </button>
                </div>
              </div>
            )}

            {/* Black / Clear overlay indicators */}
            {isLive && isBlack && (
              <div className="absolute inset-0 bg-black z-10 flex items-center justify-center">
                <span className="text-white/30 text-sm font-medium">● Black Screen Active</span>
              </div>
            )}
            {isLive && isClear && !isBlack && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-black/60 text-white/50 text-xs font-medium border border-white/15">Content Hidden (Clear)</span>
              </div>
            )}

            {/* Live badge */}
            {isLive && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold"
                style={{ background: isRehearsal ? "rgba(234,179,8,0.85)" : "rgba(239,68,68,0.85)", color: "#fff" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {isRehearsal ? "REHEARSAL" : "LIVE"} · {fmtDuration(liveDuration)}
              </div>
            )}

            {/* Reload */}
            <button onClick={() => setIframeKey(k => k + 1)} title="Reload preview"
              className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded bg-black/60 hover:bg-black/80 text-white/60 hover:text-white transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Quick Black/Clear corner buttons over preview */}
            <div className="absolute bottom-2 right-2 z-20 flex gap-1.5">
              <button onClick={toggleBlack}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${isBlack ? "bg-white text-black" : "bg-black/70 text-white/70 hover:bg-black/90 hover:text-white border border-white/20"}`}>
                <MonitorOff className="w-3 h-3" /> {isBlack ? "Un-black" : "Black"}
              </button>
              <button onClick={toggleClear}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${isClear ? "bg-white text-black" : "bg-black/70 text-white/70 hover:bg-black/90 hover:text-white border border-white/20"}`}>
                <EyeOff className="w-3 h-3" /> {isClear ? "Show" : "Clear"}
              </button>
            </div>
          </div>

          {/* Scene grid */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-2">Scenes</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {scenes.map(scene => {
                const active = currentScene === scene.name;
                return (
                  <button key={scene.id} onClick={() => switchScene(scene)}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border transition-all p-3 aspect-video ${active ? "border-red-500 bg-red-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                    <span className="text-2xl leading-none">{scene.icon}</span>
                    <span className={`text-[11px] font-medium text-center leading-tight ${active ? "text-red-300" : "text-white/70"}`}>{scene.name}</span>
                    {active && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  </button>
                );
              })}
              <a href="#" onClick={e => { e.preventDefault(); window.history.pushState({}, "", (import.meta.env.BASE_URL ?? "/") + "media"); window.dispatchEvent(new PopStateEvent("popstate")); }}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 hover:bg-white/5 hover:border-white/20 transition-all p-3 aspect-video">
                <span className="text-white/20 text-xl">＋</span>
                <span className="text-[10px] text-white/30">Edit scenes</span>
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT: controls panel */}
        <div className={`${studioPanel === "controls" ? "flex" : "hidden lg:flex"} w-full lg:w-72 xl:w-80 shrink-0 flex-col overflow-y-auto bg-[#0f0f18]`}>
          <div className="flex flex-col gap-2.5 p-3">

            {/* ── Screen Output ── */}
            <Section title="Screen Output" icon={<Monitor className="w-3.5 h-3.5" />} collapsible defaultOpen>
              <div className="grid grid-cols-2 gap-2">
                {/* Black screen */}
                <button onClick={toggleBlack}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all ${isBlack ? "border-white bg-white/15 text-white" : "border-white/15 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"}`}>
                  <MonitorOff className="w-5 h-5" />
                  <span className="text-[11px] font-semibold leading-none">{isBlack ? "● Black ON" : "Black Screen"}</span>
                </button>
                {/* Clear */}
                <button onClick={toggleClear}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all ${isClear ? "border-white bg-white/15 text-white" : "border-white/15 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"}`}>
                  <EyeOff className="w-5 h-5" />
                  <span className="text-[11px] font-semibold leading-none">{isClear ? "● Hidden" : "Clear / Hide"}</span>
                </button>
              </div>
              {/* Status bar */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isBlack ? "bg-white animate-pulse" : isClear ? "bg-yellow-400 animate-pulse" : isLive ? "bg-red-500 animate-pulse" : "bg-white/20"}`} />
                <span className="text-[11px] text-white/60 flex-1">
                  {isBlack ? "Screen is black" : isClear ? "Content hidden" : isLive ? (isRehearsal ? "Rehearsal active" : "Live to audience") : "Off air"}
                </span>
                {(isBlack || isClear) && (
                  <button onClick={() => updateScreen({ data: { ...safeBase(), isBlack: false, isClear: false } })}
                    className="text-[10px] text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors">
                    Restore
                  </button>
                )}
              </div>
            </Section>

            {/* ── Platform selector ── */}
            <Section title="Destinations" icon={<Tv className="w-3.5 h-3.5" />} collapsible defaultOpen>
              {(["youtube", "facebook", "twitch", "custom"] as Platform[]).map(p => {
                const pi = PLATFORM_INFO[p];
                const isSelected = platform === p;
                return (
                  <div key={p} onClick={() => setPlatform(p)}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${isSelected ? "bg-white/8 border border-white/15" : "hover:bg-white/5"}`}>
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 text-sm font-bold"
                      style={{ background: `${pi.color}22`, color: pi.color }}>
                      <PlatformIcon p={p} />
                    </span>
                    <span className="flex-1 text-sm text-white/80">{pi.label}</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-green-500 bg-green-500" : "border-white/20"}`}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                );
              })}
              {streamKey && (
                <button onClick={copyRtmp}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-all mt-1">
                  <Copy className="w-3 h-3" /> Copy RTMP string for OBS
                </button>
              )}
            </Section>

            {/* ── Overlays / graphic presets ── */}
            <Section title="Overlays" icon={<Sparkles className="w-3.5 h-3.5" />} collapsible defaultOpen
              badge={lowerActive ? <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> : undefined}>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map(g => (
                  <button key={g.id} onClick={() => fireGraphic(g)}
                    className="flex items-center gap-1.5 px-2 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:border-primary/40 text-left transition-all">
                    <span className="text-base leading-none">{g.emoji}</span>
                    <span className="text-xs text-white/70 font-medium truncate">{g.label}</span>
                  </button>
                ))}
              </div>
              {lowerActive && (
                <button onClick={clearOverlays}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-all">
                  <X className="w-3 h-3" /> Clear Active Overlay
                </button>
              )}
            </Section>

            {/* ── Ticker bar ── */}
            <Section title="Ticker Bar" icon={<AlignLeft className="w-3.5 h-3.5" />} collapsible defaultOpen={false}
              badge={tickerActive ? <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> : undefined}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50 w-12">Speed</span>
                <input type="range" min={10} max={80} value={tickerSpeed}
                  onChange={e => setTickerSpeed(Number(e.target.value))}
                  onMouseUp={() => { if (tickerActive) pushTicker(true); }}
                  className="flex-1 accent-primary h-1" />
                <span className="text-xs text-white/40 w-6 text-right">{tickerSpeed}</span>
              </div>
              <textarea
                value={tickerText}
                onChange={e => setTickerText(e.target.value)}
                placeholder="Ticker message… (scrolls across bottom of screen)"
                className="w-full h-14 px-2.5 py-2 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-primary/60"
              />
              <div className="flex gap-1.5">
                <button onClick={() => pushTicker(true)}
                  className="flex-1 h-8 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all disabled:opacity-40"
                  disabled={!tickerText.trim()}>
                  {tickerActive ? "Update Ticker" : "Show Ticker"}
                </button>
                {tickerActive && (
                  <button onClick={() => pushTicker(false)}
                    className="h-8 px-3 rounded-lg text-xs font-medium border border-white/10 text-white/50 hover:bg-white/10 transition-all">
                    Hide
                  </button>
                )}
              </div>
            </Section>

            {/* ── Presenter spotlight ── */}
            <Section title="Presenter" icon={<Mic2 className="w-3.5 h-3.5" />} collapsible defaultOpen={false}>
              <input value={presenterName} onChange={e => setPresenterName(e.target.value)}
                placeholder="Speaker name"
                className="w-full h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60" />
              <input value={presenterTitle} onChange={e => setPresenterTitle(e.target.value)}
                placeholder="Title / role (optional)"
                className="w-full h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60" />
              <div className="flex gap-1.5">
                <button onClick={spotlightPresenter} disabled={!presenterName}
                  className="flex-1 h-8 rounded-lg text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 transition-all">
                  Spotlight
                </button>
                <button onClick={() => updateScreen({ data: { ...safeBase(), lowerThirdEnabled: false } })}
                  className="h-8 px-3 rounded-lg text-xs text-white/50 border border-white/10 hover:bg-white/10 transition-all">
                  Clear
                </button>
              </div>
            </Section>

            {/* ── Graphic Overlays ── */}
            <Section title="Graphic Overlays" icon={<Sparkles className="w-3.5 h-3.5" />} collapsible defaultOpen={false}
              badge={activeGraphicOverlayCount > 0
                ? <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/30 text-primary text-[9px] font-bold">{activeGraphicOverlayCount}</span>
                : undefined}>

              {/* Mini tab bar */}
              <div className="flex p-0.5 bg-white/5 rounded-lg gap-0.5">
                {([
                  { id: "scoreboard" as const, label: "Score",  icon: <Trophy    className="w-3 h-3" />, active: scoreboardEnabled },
                  { id: "image"      as const, label: "Image",  icon: <FileImage className="w-3 h-3" />, active: imageEnabled },
                  { id: "timer"      as const, label: "Timer",  icon: <TimerIcon className="w-3 h-3" />, active: timerEnabled },
                  { id: "url"        as const, label: "URL",    icon: <Globe     className="w-3 h-3" />, active: urlOverlayEnabled },
                  { id: "camera"     as const, label: "Camera", icon: <Video     className="w-3 h-3" />, active: isCameraBg },
                ]).map(tab => (
                  <button key={tab.id} onClick={() => setOverlayTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${overlayTab === tab.id ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}>
                    {tab.icon} {tab.label}
                    {tab.active && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-0.5" />}
                  </button>
                ))}
              </div>

              {/* ── Scoreboard tab ── */}
              {overlayTab === "scoreboard" && (
                <div className="space-y-2">
                  {/* Style */}
                  <div className="flex gap-1">
                    {(["modern", "classic", "minimal"] as const).map(s => (
                      <button key={s} onClick={() => pushScoreboard({ scoreboardStyle: s })}
                        className={`flex-1 h-7 rounded text-[10px] font-medium capitalize transition-all ${scoreboardStyle === s ? "bg-primary/25 text-primary border border-primary/40" : "border border-white/10 text-white/40 hover:bg-white/10"}`}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Team A row */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: scoreboardAccentA }} />
                    <input value={teamA} onChange={e => setTeamA(e.target.value)}
                      onBlur={() => pushScoreboard({ scoreboardTeamA: teamA })}
                      placeholder="Team A"
                      className="flex-1 min-w-0 h-7 px-2 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60" />
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => bumpScore("A", -1)} className="w-7 h-7 flex items-center justify-center rounded border border-white/10 text-white/50 hover:bg-white/10 transition-all"><Minus className="w-3 h-3" /></button>
                      <span className="w-7 text-center text-sm font-bold text-white tabular-nums">{scoreA}</span>
                      <button onClick={() => bumpScore("A", 1)}  className="w-7 h-7 flex items-center justify-center rounded border border-white/10 text-white/50 hover:bg-white/10 transition-all"><Plus  className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Team B row */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: scoreboardAccentB }} />
                    <input value={teamB} onChange={e => setTeamB(e.target.value)}
                      onBlur={() => pushScoreboard({ scoreboardTeamB: teamB })}
                      placeholder="Team B"
                      className="flex-1 min-w-0 h-7 px-2 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60" />
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => bumpScore("B", -1)} className="w-7 h-7 flex items-center justify-center rounded border border-white/10 text-white/50 hover:bg-white/10 transition-all"><Minus className="w-3 h-3" /></button>
                      <span className="w-7 text-center text-sm font-bold text-white tabular-nums">{scoreB}</span>
                      <button onClick={() => bumpScore("B", 1)}  className="w-7 h-7 flex items-center justify-center rounded border border-white/10 text-white/50 hover:bg-white/10 transition-all"><Plus  className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Period */}
                  <input value={(screenState?.scoreboardPeriod as string) ?? ""}
                    onChange={e => pushScoreboard({ scoreboardPeriod: e.target.value })}
                    placeholder="Period / half / quarter (optional)"
                    className="w-full h-7 px-2 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60" />

                  {/* Position */}
                  <div className="flex gap-1">
                    {(["top-left","top-center","top-right","bottom-left","bottom-right"] as const).map((p, i) => (
                      <button key={p} onClick={() => pushScoreboard({ scoreboardPosition: p })}
                        className={`flex-1 h-7 rounded text-sm transition-all ${scoreboardPosition === p ? "bg-primary/30 text-primary" : "border border-white/10 text-white/40 hover:bg-white/10"}`}>
                        {["↖","↑","↗","↙","↘"][i]}
                      </button>
                    ))}
                  </div>

                  {/* Team accent colors */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40">Colors</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <span className="text-[10px] text-white/40">A</span>
                      <input type="color" value={scoreboardAccentA}
                        onChange={e => pushScoreboard({ scoreboardAccentA: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0.5" />
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <span className="text-[10px] text-white/40">B</span>
                      <input type="color" value={scoreboardAccentB}
                        onChange={e => pushScoreboard({ scoreboardAccentB: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0.5" />
                    </label>
                  </div>

                  {/* Show / Hide */}
                  <div className="flex gap-1.5">
                    <button onClick={() => pushScoreboard({ scoreboardEnabled: true })}
                      className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${scoreboardEnabled ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-white/8 text-white/70 hover:bg-white/15"}`}>
                      {scoreboardEnabled ? "● Live" : "Show"}
                    </button>
                    {scoreboardEnabled && (
                      <button onClick={() => pushScoreboard({ scoreboardEnabled: false })}
                        className="h-8 px-3 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all">
                        Hide
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Image tab ── */}
              {overlayTab === "image" && (
                <div className="space-y-2">
                  <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://… (PNG, JPG, GIF)"
                    className="w-full h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60" />

                  {/* Position */}
                  <div className="flex gap-1">
                    {(["top-left","top-center","top-right","bottom-left","bottom-right"] as const).map((p, i) => (
                      <button key={p} onClick={() => pushImageOverlay(imageEnabled, { logoPosition: p })}
                        className={`flex-1 h-7 rounded text-sm transition-all ${imagePosition === p ? "bg-primary/30 text-primary" : "border border-white/10 text-white/40 hover:bg-white/10"}`}>
                        {["↖","↑","↗","↙","↘"][i]}
                      </button>
                    ))}
                  </div>

                  {/* Size */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 w-8">Size</span>
                    <input type="range" min={5} max={40} value={imageSize}
                      onChange={e => updateScreen({ data: { ...safeBase(), logoSize: Number(e.target.value) } })}
                      className="flex-1 accent-primary h-1" />
                    <span className="text-[10px] text-white/40 w-10 text-right">{imageSize}vw</span>
                  </div>

                  {/* Opacity */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 w-8">Opacity</span>
                    <input type="range" min={10} max={100} value={imageOpacity}
                      onChange={e => updateScreen({ data: { ...safeBase(), logoOpacity: Number(e.target.value) } })}
                      className="flex-1 accent-primary h-1" />
                    <span className="text-[10px] text-white/40 w-10 text-right">{imageOpacity}%</span>
                  </div>

                  {/* Show / Hide */}
                  <div className="flex gap-1.5">
                    <button onClick={() => pushImageOverlay(true)} disabled={!imageUrl.trim()}
                      className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${imageEnabled ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-white/8 text-white/70 hover:bg-white/15"}`}>
                      {imageEnabled ? "● Live" : "Show"}
                    </button>
                    {imageEnabled && (
                      <button onClick={() => pushImageOverlay(false)}
                        className="h-8 px-3 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all">
                        Hide
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Timer tab ── */}
              {overlayTab === "timer" && (
                <div className="space-y-2">
                  {/* Mode */}
                  <div className="flex gap-1">
                    {(["countdown","stopwatch"] as const).map(m => (
                      <button key={m} onClick={() => updateScreen({ data: { ...safeBase(), timerMode: m } })}
                        className={`flex-1 h-7 rounded text-[10px] font-medium transition-all ${timerMode === m ? "bg-primary/25 text-primary border border-primary/40" : "border border-white/10 text-white/40 hover:bg-white/10"}`}>
                        {m === "countdown" ? "Countdown" : "Stopwatch"}
                      </button>
                    ))}
                  </div>

                  {/* Duration (countdown only) */}
                  {timerMode === "countdown" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/40">Duration</span>
                      <input type="number" min={0} max={99} value={timerDurMin}
                        onChange={e => setTimerDurMin(Number(e.target.value))}
                        onBlur={() => updateScreen({ data: { ...safeBase(), timerDurationSec: timerDurMin * 60 + timerDurSec } })}
                        className="w-12 h-7 px-1 text-center rounded-lg border border-white/10 bg-white/5 text-xs text-white focus:outline-none focus:border-primary/60" />
                      <span className="text-[10px] text-white/40">m</span>
                      <input type="number" min={0} max={59} value={timerDurSec}
                        onChange={e => setTimerDurSec(Number(e.target.value))}
                        onBlur={() => updateScreen({ data: { ...safeBase(), timerDurationSec: timerDurMin * 60 + timerDurSec } })}
                        className="w-12 h-7 px-1 text-center rounded-lg border border-white/10 bg-white/5 text-xs text-white focus:outline-none focus:border-primary/60" />
                      <span className="text-[10px] text-white/40">s</span>
                    </div>
                  )}

                  {/* Label */}
                  <input value={timerLabelLocal} onChange={e => setTimerLabelLocal(e.target.value)}
                    onBlur={() => updateScreen({ data: { ...safeBase(), timerLabel: timerLabelLocal || null as unknown as string } })}
                    placeholder="Label (e.g. 'Starts in')"
                    className="w-full h-7 px-2 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60" />

                  {/* Position */}
                  <div className="flex gap-1">
                    {(["top-left","top-center","top-right","bottom-left","bottom-right"] as const).map((p, i) => (
                      <button key={p} onClick={() => updateScreen({ data: { ...safeBase(), timerPosition: p } })}
                        className={`flex-1 h-7 rounded text-sm transition-all ${timerPosition === p ? "bg-primary/30 text-primary" : "border border-white/10 text-white/40 hover:bg-white/10"}`}>
                        {["↖","↑","↗","↙","↘"][i]}
                      </button>
                    ))}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-1.5">
                    {!timerRunning ? (
                      <button onClick={timerStart}
                        className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-all">
                        <Play className="w-3 h-3" /> Start
                      </button>
                    ) : (
                      <button onClick={timerPause}
                        className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all">
                        <Square className="w-3 h-3" /> Pause
                      </button>
                    )}
                    <button onClick={timerReset} title="Reset"
                      className="h-8 px-3 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all">
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button onClick={() => updateScreen({ data: { ...safeBase(), timerEnabled: !timerEnabled } })}
                      className={`h-8 px-3 rounded-lg border text-[10px] font-medium transition-all ${timerEnabled ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-white/10 text-white/40 hover:bg-white/10"}`}>
                      {timerEnabled ? "On" : "Off"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── URL tab ── */}
              {overlayTab === "url" && (
                <div className="space-y-2">
                  <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://…"
                    className="w-full h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60" />

                  {/* Position */}
                  <div className="flex gap-1">
                    {(["top-left","top-center","top-right","bottom-left","bottom-right"] as const).map((p, i) => (
                      <button key={p} onClick={() => updateScreen({ data: { ...safeBase(), urlOverlayPosition: p } })}
                        className={`flex-1 h-7 rounded text-sm transition-all ${urlPosition === p ? "bg-primary/30 text-primary" : "border border-white/10 text-white/40 hover:bg-white/10"}`}>
                        {["↖","↑","↗","↙","↘"][i]}
                      </button>
                    ))}
                  </div>

                  {/* Width */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 w-5">W</span>
                    <input type="range" min={10} max={80} value={urlWidth}
                      onChange={e => updateScreen({ data: { ...safeBase(), urlOverlayWidth: Number(e.target.value) } })}
                      className="flex-1 accent-primary h-1" />
                    <span className="text-[10px] text-white/40 w-10 text-right">{urlWidth}vw</span>
                  </div>

                  {/* Height */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 w-5">H</span>
                    <input type="range" min={10} max={80} value={urlHeight}
                      onChange={e => updateScreen({ data: { ...safeBase(), urlOverlayHeight: Number(e.target.value) } })}
                      className="flex-1 accent-primary h-1" />
                    <span className="text-[10px] text-white/40 w-10 text-right">{urlHeight}vh</span>
                  </div>

                  {/* Opacity */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 w-5">Op</span>
                    <input type="range" min={10} max={100} value={urlOpacity}
                      onChange={e => updateScreen({ data: { ...safeBase(), urlOverlayOpacity: Number(e.target.value) } })}
                      className="flex-1 accent-primary h-1" />
                    <span className="text-[10px] text-white/40 w-10 text-right">{urlOpacity}%</span>
                  </div>

                  <p className="text-[10px] text-white/25 leading-relaxed">Some sites block embedding with X-Frame-Options. Works best with your own content.</p>

                  {/* Show / Hide */}
                  <div className="flex gap-1.5">
                    <button onClick={() => pushUrlOverlay(true)} disabled={!urlInput.trim()}
                      className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${urlOverlayEnabled ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-white/8 text-white/70 hover:bg-white/15"}`}>
                      {urlOverlayEnabled ? "● Live" : "Show"}
                    </button>
                    {urlOverlayEnabled && (
                      <button onClick={() => pushUrlOverlay(false)}
                        className="h-8 px-3 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all">
                        Hide
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Camera tab ── */}
              {overlayTab === "camera" && (
                <div className="space-y-2">
                  {/* Enable / disable */}
                  <div className="flex gap-1.5">
                    <button onClick={enableCamera}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border text-xs font-medium transition-all ${isCameraBg ? "border-green-500/40 bg-green-500/15 text-green-300" : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"}`}>
                      <Video className="w-3.5 h-3.5" /> {isCameraBg ? "Camera Active" : "Enable Camera"}
                    </button>
                    {isCameraBg && (
                      <button onClick={disableCamera}
                        className="h-8 px-3 rounded-lg border border-white/10 text-xs text-white/40 hover:bg-white/10 hover:text-red-400 hover:border-red-500/30 transition-all">
                        <VideoOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Layout grid */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {CAM_LAYOUTS.map(l => {
                      const active = isCameraBg && currentLayout === l.id;
                      return (
                        <button key={l.id} onClick={() => switchCameraLayout(l.id)} title={l.label}
                          className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all ${active ? "border-primary bg-primary/15" : "border-white/10 hover:bg-white/10 hover:border-white/20"}`}>
                          <LayoutDiagram id={l.id} active={active} />
                          <span className={`text-[9px] leading-none font-medium ${active ? "text-primary" : "text-white/50"}`}>{l.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Detected cameras */}
                  {cameraDevices.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-white/8">
                      {cameraDevices.map(dev => (
                        <button key={dev.deviceId} onClick={() => switchCamera(dev.deviceId)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all text-left ${currentCamId === dev.deviceId ? "border-green-500/50 bg-green-500/10 text-green-300" : "border-white/10 hover:bg-white/10 text-white/60"}`}>
                          <Camera className="w-3 h-3 shrink-0" />
                          <span className="truncate flex-1">{dev.label}</span>
                          {currentCamId === dev.deviceId && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Detect / re-scan */}
                  <button onClick={detectCameras} disabled={detectingCams}
                    className="w-full flex items-center justify-center gap-1.5 h-7 rounded-lg border border-white/10 text-[10px] text-white/40 hover:text-white/70 hover:bg-white/10 transition-all">
                    {detectingCams
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Detecting…</>
                      : <><SwitchCamera className="w-3 h-3" /> {cameraDevices.length ? "Re-scan cameras" : "Detect cameras"}</>}
                  </button>
                </div>
              )}

            </Section>

            {/* ── Camera Layout (FIXED) ── */}
            <Section title="Camera Layout" icon={<Layers3 className="w-3.5 h-3.5" />} collapsible defaultOpen
              badge={
                isCameraBg
                  ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400">ON</span>
                  : <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white/40">OFF</span>
              }>

              {/* Enable / Disable camera background */}
              <div className="flex gap-1.5">
                <button onClick={enableCamera}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border text-xs font-medium transition-all ${isCameraBg ? "border-green-500/40 bg-green-500/15 text-green-300" : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"}`}>
                  <Video className="w-3.5 h-3.5" /> {isCameraBg ? "Camera Active" : "Enable Camera"}
                </button>
                {isCameraBg && (
                  <button onClick={disableCamera}
                    className="h-8 px-3 rounded-lg border border-white/10 text-xs text-white/40 hover:bg-white/10 hover:text-red-400 hover:border-red-500/30 transition-all">
                    <VideoOff className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Layout grid — visual diagrams */}
              <div className="grid grid-cols-4 gap-1.5">
                {CAM_LAYOUTS.map(l => {
                  const active = isCameraBg && currentLayout === l.id;
                  return (
                    <button key={l.id} onClick={() => switchCameraLayout(l.id)} title={l.label}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all ${active ? "border-primary bg-primary/15" : "border-white/10 hover:bg-white/10 hover:border-white/20"}`}>
                      <LayoutDiagram id={l.id} active={active} />
                      <span className={`text-[9px] leading-none font-medium ${active ? "text-primary" : "text-white/50"}`}>
                        {l.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Camera properties */}
              <div className="space-y-2 pt-1 border-t border-white/8">
                <div className="flex items-center gap-2">
                  <Sun className="w-3 h-3 text-white/40 shrink-0" />
                  <input type="range" min={50} max={150} value={camBrightness}
                    onChange={e => setCamBrightness(Number(e.target.value))}
                    onMouseUp={e => applyCamBrightness(Number((e.target as HTMLInputElement).value))}
                    className="flex-1 accent-primary h-1" />
                  <span className="text-[10px] text-white/40 w-8 text-right">{camBrightness}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <FlipHorizontal className="w-3 h-3 text-white/40 shrink-0" />
                  <span className="text-xs text-white/50 flex-1">Mirror camera</span>
                  <button onClick={() => applyCamMirror(!camMirror)}
                    className={`relative w-9 h-5 rounded-full border transition-all ${camMirror ? "bg-primary border-primary" : "bg-white/10 border-white/20"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${camMirror ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
              </div>
            </Section>

            {/* ── Camera device ── */}
            <Section title="Camera Device" icon={<Camera className="w-3.5 h-3.5" />} collapsible defaultOpen={false}>
              {cameraDevices.length === 0 ? (
                <button onClick={detectCameras} disabled={detectingCams}
                  className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all">
                  {detectingCams ? <><Loader2 className="w-3 h-3 animate-spin" /> Detecting…</> : <><SwitchCamera className="w-3 h-3" /> Detect Cameras</>}
                </button>
              ) : (
                <div className="space-y-1">
                  {cameraDevices.map(dev => (
                    <button key={dev.deviceId} onClick={() => switchCamera(dev.deviceId)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs transition-all text-left ${currentCamId === dev.deviceId ? "border-green-500/50 bg-green-500/10 text-green-300" : "border-white/10 hover:bg-white/10 text-white/60"}`}>
                      <Camera className="w-3 h-3 shrink-0" />
                      <span className="truncate flex-1">{dev.label}</span>
                      {currentCamId === dev.deviceId && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />}
                    </button>
                  ))}
                  <button onClick={detectCameras}
                    className="w-full flex items-center justify-center gap-1 h-7 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                    <RefreshCw className="w-2.5 h-2.5" /> Re-scan
                  </button>
                </div>
              )}
            </Section>

            {/* ── Stream key ── */}
            {streamKey && (
              <Section title="Stream Key" icon={<Eye className="w-3.5 h-3.5" />} collapsible defaultOpen={false}>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/40 flex items-center overflow-hidden">
                    <span className="truncate font-mono">{showKey ? streamKey : "••••••••••••••••"}</span>
                  </div>
                  <button onClick={() => setShowKey(v => !v)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all">
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-white/25">Configure in Media → Live Studio</p>
              </Section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
