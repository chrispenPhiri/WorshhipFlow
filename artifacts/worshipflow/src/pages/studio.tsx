/**
 * Live Studio — YoloCast-style broadcast control console
 *
 * Layout: large preview + scene grid (left) | stream controls (right)
 * All localStorage keys are shared with LiveStudioPanel so both views stay in sync.
 */
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Radio, Youtube, Tv, Twitch, Zap, MonitorPlay,
  Play, Square, RotateCcw, Sparkles, Loader2,
  Camera, SwitchCamera, Maximize2, RefreshCw, X,
  Layers3, Mic2, ChevronDown, ChevronUp, Copy,
  Eye, EyeOff, CheckCircle2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type Platform = "youtube" | "facebook" | "twitch" | "custom";

interface Scene { id: string; name: string; icon: string; }

interface GraphicPreset {
  id: string; label: string; emoji: string;
  lowerThirdName: string; lowerThirdTitle: string;
}

interface CameraDevice { deviceId: string; label: string; }

// ── Constants ────────────────────────────────────────────────────────────────
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
  { id: "welcome",   label: "Welcome",   emoji: "👋", lowerThirdName: "Welcome",         lowerThirdTitle: "We're glad you're here!" },
  { id: "offering",  label: "Offering",  emoji: "💝", lowerThirdName: "Offering",        lowerThirdTitle: "Give generously" },
  { id: "prayer",    label: "Prayer",    emoji: "🙏", lowerThirdName: "Prayer Time",     lowerThirdTitle: "Come before God together" },
  { id: "worship",   label: "Worship",   emoji: "🎵", lowerThirdName: "Worship",         lowerThirdTitle: "Lift your voice" },
  { id: "message",   label: "Message",   emoji: "📖", lowerThirdName: "The Message",     lowerThirdTitle: "" },
  { id: "break",     label: "Break",     emoji: "☕", lowerThirdName: "Short Break",     lowerThirdTitle: "We'll be back shortly" },
  { id: "communion", label: "Communion", emoji: "🍞", lowerThirdName: "Communion",       lowerThirdTitle: "In remembrance of Him" },
  { id: "closing",   label: "Closing",   emoji: "✨", lowerThirdName: "God bless you!",  lowerThirdTitle: "See you next time" },
];

const CAM_LAYOUTS: { id: string; label: string; short: string }[] = [
  { id: "fullscreen",      label: "Full Screen",     short: "Full" },
  { id: "pip-bottomright", label: "PiP — BR",        short: "PiP ↘" },
  { id: "pip-bottomleft",  label: "PiP — BL",        short: "PiP ↙" },
  { id: "pip-topright",    label: "PiP — TR",        short: "PiP ↗" },
  { id: "pip-topleft",     label: "PiP — TL",        short: "PiP ↖" },
  { id: "side-left",       label: "Split — Cam Left",  short: "⬛▪" },
  { id: "side-right",      label: "Split — Cam Right", short: "▪⬛" },
];

// ── Duration formatter ───────────────────────────────────────────────────────
function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ── Platform icon ────────────────────────────────────────────────────────────
function PlatformIcon({ p, size = 14 }: { p: Platform; size?: number }) {
  if (p === "youtube")  return <Youtube  style={{ width: size, height: size }} />;
  if (p === "facebook") return <span style={{ fontSize: size - 2, fontWeight: 700 }}>f</span>;
  if (p === "twitch")   return <Twitch   style={{ width: size, height: size }} />;
  return <Zap style={{ width: size, height: size }} />;
}

// ── Right-panel section wrapper ──────────────────────────────────────────────
function Section({ title, icon, children, collapsible = false, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  collapsible?: boolean; defaultOpen?: boolean;
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
        {collapsible && (open
          ? <ChevronUp className="w-3.5 h-3.5 text-white/40" />
          : <ChevronDown className="w-3.5 h-3.5 text-white/40" />)}
      </button>
      {open && <div className="px-3 py-2.5 space-y-2">{children}</div>}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function StudioPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 1500 },
  });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  // ── Shared state (same localStorage keys as LiveStudioPanel) ─────────────
  const [platform, setPlatform] = useLocalStorage<Platform>("wf-live-platform", "youtube");
  const [streamKey] = useLocalStorage("wf-live-stream-key", "");
  const [rtmpUrl] = useLocalStorage("wf-live-rtmp-url", "");
  const [showKey, setShowKey] = useState(false);
  const [socialHandles] = useLocalStorage("wf-live-social-handles", "");
  const [liveShowHandles] = useLocalStorage("wf-live-show-handles", true);
  const [scenes]    = useLocalStorage<Scene[]>("wf-live-scenes", DEFAULT_SCENES);
  const [presets]   = useLocalStorage<GraphicPreset[]>("wf-graphic-presets", DEFAULT_PRESETS);
  const [isRehearsal, setIsRehearsal] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Presenter spotlight
  const [presenterName, setPresenterName] = useState("");
  const [presenterTitle, setPresenterTitle] = useState("");

  // Camera devices
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [detectingCams, setDetectingCams] = useState(false);

  // Live duration
  const isLive = screenState?.isLive ?? false;
  const liveStartTime = screenState?.liveStartTime;
  const [liveDuration, setLiveDuration] = useState(0);
  useEffect(() => {
    if (!isLive || !liveStartTime) { setLiveDuration(0); return; }
    const tick = () => setLiveDuration(Date.now() - new Date(liveStartTime).getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isLive, liveStartTime]);

  const currentScene  = screenState?.liveScene;
  const currentLayout = (screenState?.background as { cameraLayout?: string } | undefined)?.cameraLayout ?? "fullscreen";
  const currentCamId  = (screenState?.background as { cameraDeviceId?: string } | undefined)?.cameraDeviceId ?? "";
  const lowerActive   = screenState?.lowerThirdEnabled ?? false;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const safeBase = useCallback(() => ({
    isBlack: screenState?.isBlack ?? false,
    isClear: screenState?.isClear ?? false,
    contentType: (screenState?.contentType ?? "none") as "none" | "verse" | "song" | "custom_text" | "image" | "video" | "game",
  }), [screenState]);

  const goLive = () => {
    setIsRehearsal(false);
    updateScreen({
      data: {
        ...safeBase(), isLive: true,
        livePlatform: platform,
        liveStartTime: new Date().toISOString(),
        liveScene: scenes[0]?.name ?? "Main Stage",
        liveSocialHandles: liveShowHandles ? socialHandles : "",
      },
    });
    toast({ title: `🔴 Going Live on ${PLATFORM_INFO[platform].label}`, description: "LIVE indicator is now on the broadcast screen." });
  };

  const rehearse = () => {
    setIsRehearsal(true);
    setIframeKey(k => k + 1);
    updateScreen({
      data: {
        ...safeBase(), isLive: true,
        livePlatform: platform,
        liveStartTime: new Date().toISOString(),
        liveScene: scenes[0]?.name ?? "Main Stage",
        liveSocialHandles: liveShowHandles ? socialHandles : "",
      },
    });
    toast({ title: "🎬 Rehearsal Mode active", description: "Live overlays on. Preview refreshed." });
  };

  const endStream = () => {
    setIsRehearsal(false);
    updateScreen({ data: { ...safeBase(), isLive: false, liveStartTime: undefined as unknown as string } });
    toast({ title: isRehearsal ? "Rehearsal ended" : "Stream ended" });
  };

  const switchScene = (scene: Scene) => {
    updateScreen({ data: { ...safeBase(), liveScene: scene.name } });
    toast({ title: `Scene → ${scene.name}` });
  };

  const fireGraphic = (g: GraphicPreset) => {
    updateScreen({
      data: {
        ...safeBase(),
        lowerThirdEnabled: true,
        lowerThirdName: g.lowerThirdName,
        lowerThirdTitle: g.lowerThirdTitle,
        lowerThirdPosition: "bottom-left",
        lowerThirdStyle: "modern",
        lowerThirdAutoDismissSec: 6,
      },
    });
    toast({ title: `${g.emoji} ${g.label}`, description: "Lower third on broadcast (auto-dismisses in 6s)" });
  };

  const clearOverlays = () => {
    updateScreen({ data: { ...safeBase(), lowerThirdEnabled: false, textOverlayEnabled: false } });
  };

  const spotlightPresenter = () => {
    if (!presenterName) return;
    updateScreen({
      data: {
        ...safeBase(),
        lowerThirdEnabled: true,
        lowerThirdName: presenterName,
        lowerThirdTitle: presenterTitle,
        lowerThirdPosition: "bottom-left",
        lowerThirdStyle: "modern",
        lowerThirdAutoDismissSec: 0,
      },
    });
    toast({ title: "Presenter spotlight active" });
  };

  const switchCameraLayout = (layout: string) => {
    const bg = screenState?.background;
    if (!bg) return;
    updateScreen({ data: { ...safeBase(), background: { ...bg, cameraLayout: layout } as typeof bg } });
  };

  const switchCamera = (deviceId: string) => {
    const bg = screenState?.background;
    if (!bg) return;
    updateScreen({ data: { ...safeBase(), background: { ...bg, cameraDeviceId: deviceId } as typeof bg } });
    toast({ title: "Camera switched" });
  };

  const detectCameras = async () => {
    setDetectingCams(true);
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameraDevices(
        devices.filter(d => d.kind === "videoinput")
               .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }))
      );
    } catch {
      toast({ title: "Camera access denied", variant: "destructive" });
    } finally {
      setDetectingCams(false);
    }
  };

  const copyRtmp = () => {
    const url = rtmpUrl || PLATFORM_INFO[platform].rtmpDefault;
    navigator.clipboard.writeText(`${url}/${streamKey}`).then(() => {
      toast({ title: "RTMP string copied" });
    });
  };

  const pInfo = PLATFORM_INFO[platform];

  return (
    <div className="flex flex-col h-[calc(100dvh-2rem)] lg:h-full gap-0 -mx-4 -my-4 overflow-hidden bg-[#0d0d12]">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg" style={{ background: isLive ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)" }}>
            <Radio className="w-4 h-4" style={{ color: isLive ? (isRehearsal ? "#eab308" : "#ef4444") : "#64748b" }} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">Live Studio</h1>
            <p className="text-[10px] text-white/40 mt-0.5">Broadcast production console</p>
          </div>
          {isLive && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: isRehearsal ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)", color: isRehearsal ? "#eab308" : "#ef4444" }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isRehearsal ? "#eab308" : "#ef4444" }} />
              {isRehearsal ? "REHEARSAL" : "LIVE"} · {fmtDuration(liveDuration)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLive ? (
            <Button size="sm" variant="destructive" onClick={endStream} className="gap-1.5 h-8">
              <Square className="w-3 h-3" /> {isRehearsal ? "End Rehearsal" : "End Stream"}
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={rehearse}
                className="gap-1.5 h-8 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10">
                <Play className="w-3 h-3" /> Rehearsal
              </Button>
              <Button size="sm" onClick={goLive} className="gap-1.5 h-8 bg-red-600 hover:bg-red-700 text-white">
                <Radio className="w-3 h-3" /> Go Live
              </Button>
            </>
          )}
          <a href={BROADCAST_SRC} target="_blank" rel="noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Open broadcast window">
            <Maximize2 className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* ── Body: preview + scenes (left) | controls (right) ── */}
      <div className="flex flex-1 min-h-0 divide-x divide-white/10">

        {/* LEFT: preview + scene grid */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Broadcast preview */}
          <div className="relative bg-black shrink-0" style={{ aspectRatio: "16/9", maxHeight: "55%" }}>
            <iframe
              key={iframeKey}
              src={BROADCAST_SRC}
              className="absolute inset-0 w-full h-full border-0"
              title="Broadcast Preview"
              allow="camera; microphone; display-capture"
            />
            {!isLive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 z-10">
                <MonitorPlay className="w-10 h-10 text-white/20" />
                <p className="text-white/40 text-sm">Off Air</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={rehearse}
                    className="gap-1.5 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/10">
                    <Play className="w-3 h-3" /> Start Rehearsal
                  </Button>
                  <Button size="sm" onClick={goLive}
                    className="gap-1.5 bg-red-600 hover:bg-red-700 text-white">
                    <Radio className="w-3 h-3" /> Go Live
                  </Button>
                </div>
              </div>
            )}
            {/* Reload button */}
            <button
              onClick={() => setIframeKey(k => k + 1)}
              title="Reload preview"
              className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded bg-black/60 hover:bg-black/80 text-white/60 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {/* Live badge */}
            {isLive && (
              <div
                className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold"
                style={{ background: isRehearsal ? "rgba(234,179,8,0.85)" : "rgba(239,68,68,0.85)", color: "#fff" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {isRehearsal ? "REHEARSAL" : "LIVE"} · {fmtDuration(liveDuration)}
              </div>
            )}
          </div>

          {/* Scene grid */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-2 px-0.5">Scenes</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {scenes.map(scene => {
                const active = currentScene === scene.name;
                return (
                  <button
                    key={scene.id}
                    onClick={() => switchScene(scene)}
                    className={`group relative flex flex-col items-center justify-center gap-2 rounded-xl border transition-all p-3 aspect-video ${
                      active
                        ? "border-red-500 bg-red-500/15 shadow-[0_0_0_1px_rgba(239,68,68,0.4)]"
                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className="text-2xl leading-none">{scene.icon}</span>
                    <span className={`text-[11px] font-medium text-center leading-tight ${active ? "text-red-300" : "text-white/70"}`}>
                      {scene.name}
                    </span>
                    {active && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>
                );
              })}

              {/* Add-a-scene placeholder — links back to the Media page */}
              <a
                href="#"
                onClick={e => { e.preventDefault(); window.history.pushState({}, "", (import.meta.env.BASE_URL ?? "/") + "media"); window.dispatchEvent(new PopStateEvent("popstate")); }}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-transparent hover:bg-white/5 hover:border-white/20 transition-all p-3 aspect-video"
              >
                <span className="text-white/20 text-xl">＋</span>
                <span className="text-[10px] text-white/30">Edit scenes</span>
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT: controls panel */}
        <div className="w-72 xl:w-80 shrink-0 flex flex-col overflow-y-auto bg-[#0f0f18]">
          <div className="flex flex-col gap-2.5 p-3">

            {/* ── Platform selector ── */}
            <Section title="Destinations" icon={<Tv className="w-3.5 h-3.5" />}>
              {(["youtube", "facebook", "twitch", "custom"] as Platform[]).map(p => {
                const pi = PLATFORM_INFO[p];
                const isSelected = platform === p;
                return (
                  <div
                    key={p}
                    className="flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer hover:bg-white/5"
                    onClick={() => setPlatform(p)}
                  >
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-sm font-bold"
                      style={{ background: `${pi.color}22`, color: pi.color }}
                    >
                      <PlatformIcon p={p} />
                    </span>
                    <span className="flex-1 text-sm text-white/80">{pi.label}</span>
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => setPlatform(p)}
                      className="data-[state=checked]:bg-green-500 scale-90"
                    />
                  </div>
                );
              })}
              {streamKey && (
                <button
                  onClick={copyRtmp}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-all mt-1"
                >
                  <Copy className="w-3 h-3" /> Copy RTMP string for OBS
                </button>
              )}
            </Section>

            {/* ── Overlays / graphic presets ── */}
            <Section title="Overlays" icon={<Sparkles className="w-3.5 h-3.5" />}>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map(g => (
                  <button
                    key={g.id}
                    onClick={() => fireGraphic(g)}
                    className="flex items-center gap-1.5 px-2 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:border-primary/40 text-left transition-all"
                  >
                    <span className="text-base leading-none">{g.emoji}</span>
                    <span className="text-xs text-white/70 font-medium truncate">{g.label}</span>
                  </button>
                ))}
              </div>
              {lowerActive && (
                <button
                  onClick={clearOverlays}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-all mt-1"
                >
                  <X className="w-3 h-3" /> Clear Active Overlay
                </button>
              )}
            </Section>

            {/* ── Presenter spotlight ── */}
            <Section title="Presenter" icon={<Mic2 className="w-3.5 h-3.5" />} collapsible defaultOpen={false}>
              <input
                value={presenterName}
                onChange={e => setPresenterName(e.target.value)}
                placeholder="Speaker name"
                className="w-full h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60"
              />
              <input
                value={presenterTitle}
                onChange={e => setPresenterTitle(e.target.value)}
                placeholder="Title / role (optional)"
                className="w-full h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={spotlightPresenter}
                  disabled={!presenterName}
                  className="flex-1 h-8 rounded-lg text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 transition-all"
                >
                  Spotlight
                </button>
                <button
                  onClick={() => updateScreen({ data: { ...safeBase(), lowerThirdEnabled: false } })}
                  className="h-8 px-3 rounded-lg text-xs text-white/50 border border-white/10 hover:bg-white/10 transition-all"
                >
                  Clear
                </button>
              </div>
            </Section>

            {/* ── Camera layout ── */}
            <Section title="Camera Layout" icon={<Layers3 className="w-3.5 h-3.5" />} collapsible defaultOpen>
              <div className="grid grid-cols-3 gap-1">
                {CAM_LAYOUTS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => switchCameraLayout(l.id)}
                    title={l.label}
                    className={`flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-lg border text-center transition-all ${
                      currentLayout === l.id
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-white/10 hover:bg-white/10 text-white/60"
                    }`}
                  >
                    <span className="text-sm font-mono leading-none">{l.short}</span>
                    <span className="text-[9px] leading-tight opacity-70">{l.label.split("—")[0].trim()}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── Camera switch ── */}
            <Section title="Camera" icon={<Camera className="w-3.5 h-3.5" />} collapsible defaultOpen={false}>
              {cameraDevices.length === 0 ? (
                <button
                  onClick={detectCameras}
                  disabled={detectingCams}
                  className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all"
                >
                  {detectingCams
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Detecting…</>
                    : <><SwitchCamera className="w-3 h-3" /> Detect Cameras</>
                  }
                </button>
              ) : (
                <div className="space-y-1">
                  {cameraDevices.map(dev => (
                    <button
                      key={dev.deviceId}
                      onClick={() => switchCamera(dev.deviceId)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs transition-all text-left ${
                        currentCamId === dev.deviceId
                          ? "border-green-500/50 bg-green-500/10 text-green-300"
                          : "border-white/10 hover:bg-white/10 text-white/60"
                      }`}
                    >
                      <Camera className="w-3 h-3 shrink-0" />
                      <span className="truncate flex-1">{dev.label}</span>
                      {currentCamId === dev.deviceId && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={detectCameras}
                    className="w-full flex items-center justify-center gap-1 h-7 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Re-scan
                  </button>
                </div>
              )}
            </Section>

            {/* ── Stream key (read-only display) ── */}
            {streamKey && (
              <Section title="Stream Key" icon={<Eye className="w-3.5 h-3.5" />} collapsible defaultOpen={false}>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-8 px-2.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/40 flex items-center overflow-hidden">
                    <span className="truncate font-mono">{showKey ? streamKey : "••••••••••••••••"}</span>
                  </div>
                  <button
                    onClick={() => setShowKey(v => !v)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
                  >
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
