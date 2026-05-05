/**
 * Live Studio Panel
 * Full live-streaming production environment — platform config, Go Live controls,
 * scene switcher, presenter spotlight, graphic presets, social handles.
 * All stream credentials stored in localStorage only (never sent to API).
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Radio, Youtube, Tv, Twitch, Zap, Mic2, Users, MonitorPlay,
  Play, Square, Copy, Eye, EyeOff, RefreshCw, Plus, Pencil, Trash2,
  ChevronRight, Layers3, Sparkles, AlertTriangle, CheckCircle2,
  Hash, AtSign, Star, Clapperboard, Loader2, FlipHorizontal,
  Maximize2, Minimize2, RotateCcw, ChevronDown, ChevronUp,
  Camera, SwitchCamera, Save, X,
} from "lucide-react";

const BROADCAST_SRC = (() => {
  const base = import.meta.env.BASE_URL ?? "/";
  return base.endsWith("/") ? `${base}broadcast` : `${base}/broadcast`;
})();

// ── Types ────────────────────────────────────────────────────────────────────
type Platform = "youtube" | "facebook" | "twitch" | "custom";

interface Scene {
  id: string;
  name: string;
  icon: string;
}

interface GraphicPreset {
  id: string;
  label: string;
  emoji: string;
  lowerThirdName: string;
  lowerThirdTitle: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const PLATFORM_INFO: Record<Platform, { label: string; color: string; rtmpDefault: string; help: string }> = {
  youtube:  { label: "YouTube Live",   color: "#ef4444", rtmpDefault: "rtmp://a.rtmp.youtube.com/live2",          help: "Get stream key from YouTube Studio → Go Live → Stream" },
  facebook: { label: "Facebook Live",  color: "#3b82f6", rtmpDefault: "rtmps://live-api-s.facebook.com:443/rtmp", help: "Get stream key from Facebook → Live Producer" },
  twitch:   { label: "Twitch",         color: "#a855f7", rtmpDefault: "rtmp://live.twitch.tv/live",               help: "Get stream key from Twitch Dashboard → Stream" },
  custom:   { label: "Custom RTMP",    color: "#f59e0b", rtmpDefault: "",                                         help: "Enter your RTMP server URL and stream key" },
};

const DEFAULT_SCENES: Scene[] = [
  { id: "1", name: "Main Stage",    icon: "🎤" },
  { id: "2", name: "Worship",       icon: "🎵" },
  { id: "3", name: "Message",       icon: "📖" },
  { id: "4", name: "Prayer",        icon: "🙏" },
];

const DEFAULT_GRAPHIC_PRESETS: GraphicPreset[] = [
  { id: "welcome",   label: "Welcome",   emoji: "👋", lowerThirdName: "Welcome",      lowerThirdTitle: "We're glad you're here!" },
  { id: "offering",  label: "Offering",  emoji: "💝", lowerThirdName: "Offering",     lowerThirdTitle: "Give generously • Visit our app" },
  { id: "prayer",    label: "Prayer",    emoji: "🙏", lowerThirdName: "Prayer Time",  lowerThirdTitle: "Come before God together" },
  { id: "worship",   label: "Worship",   emoji: "🎵", lowerThirdName: "Worship",      lowerThirdTitle: "Lift your voice" },
  { id: "message",   label: "Message",   emoji: "📖", lowerThirdName: "The Message",  lowerThirdTitle: "" },
  { id: "break",     label: "Break",     emoji: "☕", lowerThirdName: "Short Break",  lowerThirdTitle: "We'll be back shortly" },
  { id: "communion", label: "Communion", emoji: "🍞", lowerThirdName: "Communion",    lowerThirdTitle: "In remembrance of Him" },
  { id: "closing",   label: "Closing",   emoji: "✨", lowerThirdName: "God bless you!", lowerThirdTitle: "See you next time" },
];

interface CameraDevice { deviceId: string; label: string; }

interface VisItem {
  id: string;
  label: string;
  desc: string;
  content: string;
  position: string;
  fontSize: number;
  bg: string;
  animation: string;
  isLowerThird: boolean;
  ltName: string;
  ltTitle: string;
  ltPosition: string;
  ltStyle: string;
}

const DEFAULT_VIS_ITEMS: VisItem[] = [
  { id: "scripture", label: "Scripture Banner",    desc: "Show verse as full-screen overlay",  content: "John 3:16 — For God so loved the world…", position: "center", fontSize: 32, bg: "rgba(0,0,0,0.75)", animation: "fade_in",  isLowerThird: false, ltName: "", ltTitle: "", ltPosition: "bottom-left", ltStyle: "modern" },
  { id: "announce",  label: "Announcement Slide",  desc: "Full-screen announcement text",      content: "Join us next Sunday at 10:00 AM",          position: "center", fontSize: 36, bg: "rgba(0,0,0,0.75)", animation: "slide_up", isLowerThird: false, ltName: "", ltTitle: "", ltPosition: "bottom-left", ltStyle: "modern" },
  { id: "offering",  label: "Offering Prompt",     desc: "On-screen giving prompt",            content: "",                                         position: "center", fontSize: 28, bg: "rgba(0,0,0,0.75)", animation: "fade_in",  isLowerThird: true,  ltName: "Support Our Ministry", ltTitle: "Scan QR code or visit our website to give", ltPosition: "bottom-center", ltStyle: "gradient" },
  { id: "prayer",    label: "Prayer Request",      desc: "Invite viewers to send requests",    content: "",                                         position: "center", fontSize: 28, bg: "rgba(0,0,0,0.75)", animation: "glow",     isLowerThird: true,  ltName: "Send Your Prayer Request", ltTitle: "DM us or comment below", ltPosition: "bottom-left", ltStyle: "modern" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export function LiveStudioPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 2000 },
  });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  const isLive = screenState?.isLive ?? false;
  const liveStartTime = screenState?.liveStartTime;
  const [liveDuration, setLiveDuration] = useState(0);

  // ── Persistent stream config ─────────────────────────────────────────────
  const [platform, setPlatform] = useLocalStorage<Platform>("wf-live-platform", "youtube");
  const [streamKey, setStreamKey] = useLocalStorage("wf-live-stream-key", "");
  const [rtmpUrl, setRtmpUrl] = useLocalStorage("wf-live-rtmp-url", "");
  const [showKey, setShowKey] = useState(false);
  const [socialHandles, setSocialHandles] = useLocalStorage("wf-live-social-handles", "");
  const [scenes, setScenes] = useLocalStorage<Scene[]>("wf-live-scenes", DEFAULT_SCENES);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [liveShowBadge, setLiveShowBadge] = useLocalStorage("wf-live-show-badge", true);
  const [liveShowHandles, setLiveShowHandles] = useLocalStorage("wf-live-show-handles", true);

  // ── Preview monitor ──────────────────────────────────────────────────────
  const [showPreview, setShowPreview] = useLocalStorage("wf-live-show-preview", true);
  const [isRehearsal, setIsRehearsal] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // ── Presenter spotlight ──────────────────────────────────────────────────
  const [presenterName, setPresenterName] = useState("");
  const [presenterTitle, setPresenterTitle] = useState("");
  const prevLiveBg = useRef<import("@workspace/api-client-react").Background | null>(null);

  // ── Collapsible sections ─────────────────────────────────────────────────
  const [openSections, setOpenSections] = useLocalStorage<Record<string, boolean>>("wf-studio-sections", {
    platform: true, streamConfig: true, overlays: true,
    scenes: true, presenter: true, checklist: false,
    presets: true, visualizations: true, audience: false,
    cameraSwitch: true,
  });
  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Editable graphic presets ─────────────────────────────────────────────
  const [customPresets, setCustomPresets] = useLocalStorage<GraphicPreset[]>("wf-graphic-presets", DEFAULT_GRAPHIC_PRESETS);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editPresetDraft, setEditPresetDraft] = useState<GraphicPreset | null>(null);

  // ── Editable live visualizations ─────────────────────────────────────────
  const [visItems, setVisItems] = useLocalStorage<VisItem[]>("wf-vis-items", DEFAULT_VIS_ITEMS);
  const [editingVisId, setEditingVisId] = useState<string | null>(null);
  const [editVisDraft, setEditVisDraft] = useState<VisItem | null>(null);

  // ── Camera switcher ──────────────────────────────────────────────────────
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [detectingCams, setDetectingCams] = useState(false);
  const currentCamId = (screenState?.background as { cameraDeviceId?: string } | undefined)?.cameraDeviceId ?? "";

  const detectCameras = async () => {
    setDetectingCams(true);
    try {
      // Need permission first
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices
        .filter(d => d.kind === "videoinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      setCameraDevices(cams);
    } catch {
      toast({ title: "Camera access denied", description: "Allow camera permission to enumerate devices.", variant: "destructive" });
    } finally {
      setDetectingCams(false);
    }
  };

  const switchCamera = (deviceId: string) => {
    const bg = screenState?.background;
    if (!bg) return;
    updateScreen({
      data: {
        ...safeBase(),
        background: { ...bg, cameraDeviceId: deviceId } as typeof bg,
      },
    });
    const dev = cameraDevices.find(d => d.deviceId === deviceId);
    toast({ title: "Camera switched", description: dev?.label ?? "Camera updated on broadcast." });
  };

  // ── Live duration timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive || !liveStartTime) { setLiveDuration(0); return; }
    const tick = () => setLiveDuration(Date.now() - new Date(liveStartTime).getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isLive, liveStartTime]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const safeBase = () => ({
    isBlack: screenState?.isBlack ?? false,
    isClear: screenState?.isClear ?? false,
    contentType: (screenState?.contentType ?? "none") as "none" | "verse" | "song" | "custom_text" | "image" | "video" | "game",
  });

  const goLive = () => {
    const pInfo = PLATFORM_INFO[platform];
    setIsRehearsal(false);
    updateScreen({
      data: {
        ...safeBase(),
        isLive: true,
        livePlatform: platform,
        liveStartTime: new Date().toISOString(),
        liveScene: scenes[0]?.name ?? "Main Stage",
        liveSocialHandles: liveShowHandles ? socialHandles : "",
      },
    });
    toast({ title: `🔴 Going Live on ${pInfo.label}`, description: "Broadcast window is now showing the LIVE indicator." });
  };

  const rehearse = () => {
    setIsRehearsal(true);
    setShowPreview(true);
    setIframeKey(k => k + 1);
    updateScreen({
      data: {
        ...safeBase(),
        isLive: true,
        livePlatform: platform,
        liveStartTime: new Date().toISOString(),
        liveScene: scenes[0]?.name ?? "Main Stage",
        liveSocialHandles: liveShowHandles ? socialHandles : "",
      },
    });
    toast({ title: "🎬 Rehearsal Mode active", description: "Live overlays are on. Preview monitor is open below." });
  };

  const endStream = () => {
    setIsRehearsal(false);
    updateScreen({
      data: { ...safeBase(), isLive: false, liveStartTime: undefined as unknown as string },
    });
    toast({ title: isRehearsal ? "Rehearsal ended" : "Stream ended", description: "LIVE badge has been removed from the broadcast." });
  };

  const switchScene = (scene: Scene) => {
    updateScreen({ data: { ...safeBase(), liveScene: scene.name } });
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
    toast({ title: `${g.emoji} ${g.label}`, description: "Lower third pushed to broadcast (auto-dismisses in 6s)" });
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
    toast({ title: "Presenter spotlight active", description: `"${presenterName}" is showing on broadcast.` });
  };

  const clearPresenter = () => {
    updateScreen({ data: { ...safeBase(), lowerThirdEnabled: false } });
  };

  const copyRtmpString = () => {
    const pInfo = PLATFORM_INFO[platform];
    const url = rtmpUrl || pInfo.rtmpDefault;
    navigator.clipboard.writeText(`${url}/${streamKey}`).then(() => {
      toast({ title: "Copied to clipboard", description: "RTMP URL/key copied for OBS or streaming software." });
    });
  };

  const pInfo = PLATFORM_INFO[platform];
  const currentScene = screenState?.liveScene;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: isLive ? (isRehearsal ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)") : "rgba(255,255,255,0.06)" }}>
            <Radio className="w-5 h-5" style={{ color: isLive ? (isRehearsal ? "#eab308" : "#ef4444") : "#94a3b8" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Live Studio
              {isLive && !isRehearsal && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE · {formatDuration(liveDuration)}
                </span>
              )}
              {isLive && isRehearsal && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-yellow-400">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  REHEARSAL · {formatDuration(liveDuration)}
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">Live podcast, streaming & production controls</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isLive && (
            <Button size="sm" variant="outline" onClick={rehearse} className="gap-2 text-yellow-500 border-yellow-500/40 hover:bg-yellow-500/10">
              <Play className="w-3.5 h-3.5" /> Rehearsal Mode
            </Button>
          )}
          {isLive && (
            <Button variant="destructive" size="sm" onClick={endStream} className="gap-2">
              <Square className="w-3.5 h-3.5" /> {isRehearsal ? "End Rehearsal" : "End Stream"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowPreview(v => !v)} className="gap-1.5 text-xs text-muted-foreground">
            <MonitorPlay className="w-3.5 h-3.5" />
            {showPreview ? "Hide Monitor" : "Show Monitor"}
          </Button>
        </div>
      </div>

      {/* ── Broadcast Preview Monitor ── */}
      {showPreview && (
        <Card className="overflow-hidden border-2" style={{ borderColor: isLive ? (isRehearsal ? "rgba(234,179,8,0.4)" : "rgba(239,68,68,0.4)") : "rgba(255,255,255,0.08)" }}>
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Preview Monitor</span>
                {isLive && (
                  <Badge className="text-[10px] h-4 px-1.5" style={{
                    background: isRehearsal ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)",
                    color: isRehearsal ? "#eab308" : "#ef4444",
                    border: "none",
                  }}>
                    {isRehearsal ? "REHEARSAL" : "LIVE"}
                  </Badge>
                )}
                {!isLive && <span className="text-[11px] text-muted-foreground">Off Air</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIframeKey(k => k + 1)}
                  title="Reload preview"
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <a
                  href={BROADCAST_SRC}
                  target="_blank"
                  rel="noreferrer"
                  title="Open broadcast window"
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                >
                  <Maximize2 className="w-3 h-3" />
                </a>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            {/* Iframe */}
            <div className="relative w-full rounded-lg overflow-hidden bg-black border border-border/30" style={{ paddingTop: "56.25%" }}>
              <iframe
                key={iframeKey}
                src={BROADCAST_SRC}
                className="absolute inset-0 w-full h-full border-0"
                title="Broadcast Preview"
                allow="camera; microphone; display-capture"
              />
              {!isLive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-10">
                  <MonitorPlay className="w-10 h-10 text-white/20" />
                  <p className="text-white/40 text-sm font-medium">Off Air</p>
                  <p className="text-white/25 text-xs text-center px-4">Click <strong>Rehearsal Mode</strong> above to test all overlays and commands</p>
                  <Button size="sm" variant="outline" onClick={rehearse}
                    className="mt-1 gap-2 text-yellow-500 border-yellow-500/40 hover:bg-yellow-500/10">
                    <Play className="w-3.5 h-3.5" /> Start Rehearsal
                  </Button>
                </div>
              )}
            </div>

            {/* Quick-test command bar */}
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Quick Test Commands</p>
              <div className="flex flex-wrap gap-1.5">
                {customPresets.slice(0, 4).map(g => (
                  <button
                    key={g.id}
                    onClick={() => fireGraphic(g)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border hover:bg-muted/60 hover:border-primary/50 text-xs transition-all"
                  >
                    <span>{g.emoji}</span> {g.label}
                  </button>
                ))}
                <button
                  onClick={() => updateScreen({ data: { ...safeBase(), lowerThirdEnabled: false, textOverlayEnabled: false } })}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border hover:bg-muted/60 text-xs text-muted-foreground transition-all"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scenes.slice(0, 4).map(s => (
                  <button
                    key={s.id}
                    onClick={() => switchScene(s)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-all ${
                      currentScene === s.name
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <span>{s.icon}</span> {s.name}
                    {currentScene === s.name && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-0.5" />}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        {/* ── Column 1: Platform + Stream Config ── */}
        <div className="space-y-4">
          {/* Platform Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Tv className="w-4 h-4" /> Platform</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["youtube", "facebook", "twitch", "custom"] as Platform[]).map(p => {
                const pi = PLATFORM_INFO[p];
                const icons: Record<Platform, React.ReactNode> = {
                  youtube:  <Youtube className="w-4 h-4" />,
                  facebook: <span className="text-sm font-bold">f</span>,
                  twitch:   <Twitch className="w-4 h-4" />,
                  custom:   <Zap className="w-4 h-4" />,
                };
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                      platform === p
                        ? "border-transparent ring-2 ring-offset-1 ring-offset-background"
                        : "border-border hover:bg-muted/40"
                    }`}
                    style={platform === p ? { background: `${pi.color}18`, outline: `2px solid ${pi.color}`, outlineOffset: "1px" } : {}}
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
                      style={{ background: `${pi.color}22`, color: pi.color }}>
                      {icons[p]}
                    </span>
                    <span className="text-sm font-medium">{pi.label}</span>
                    {platform === p && <CheckCircle2 className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: pi.color }} />}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Stream Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Stream Configuration</CardTitle>
              <CardDescription className="text-[11px]">{pInfo.help}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {platform === "custom" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">RTMP Server URL</label>
                  <Input
                    value={rtmpUrl}
                    onChange={e => setRtmpUrl(e.target.value)}
                    placeholder="rtmp://your-server/live"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Stream Key</label>
                <div className="flex gap-1.5">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={streamKey}
                    onChange={e => setStreamKey(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="h-8 text-xs font-mono flex-1"
                  />
                  <button onClick={() => setShowKey(v => !v)}
                    className="h-8 w-8 flex items-center justify-center rounded border border-border hover:bg-muted/60 text-muted-foreground transition-colors shrink-0">
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <Button size="sm" variant="outline" onClick={copyRtmpString} className="w-full gap-2 text-xs">
                <Copy className="w-3.5 h-3.5" /> Copy RTMP URL + Key for OBS
              </Button>

              <div className="bg-muted/30 rounded-lg p-2.5 text-[11px] text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Streaming with OBS or StreamYard:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Open your broadcast window on the projector</li>
                  <li>Add a Window Capture in OBS</li>
                  <li>Paste the RTMP URL + key above into OBS Settings → Stream</li>
                  <li>Click Start Streaming in OBS</li>
                </ol>
              </div>

              {!isLive ? (
                <Button
                  className="w-full gap-2 font-bold"
                  style={{ background: pInfo.color, borderColor: pInfo.color }}
                  onClick={goLive}
                  disabled={!streamKey && platform !== "custom"}
                >
                  <Radio className="w-4 h-4" /> Go Live on {pInfo.label}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-bold text-red-400">LIVE · {formatDuration(liveDuration)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Overlays Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Layers3 className="w-4 h-4" /> Live Overlays</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">LIVE Badge</p>
                  <p className="text-[11px] text-muted-foreground">Red badge in broadcast window</p>
                </div>
                <Switch checked={liveShowBadge} onCheckedChange={setLiveShowBadge} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Social Handles</p>
                  <p className="text-[11px] text-muted-foreground">Show below LIVE badge</p>
                </div>
                <Switch checked={liveShowHandles} onCheckedChange={setLiveShowHandles} />
              </div>
              {liveShowHandles && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Handles (comma-separated)</label>
                  <Input
                    value={socialHandles}
                    onChange={e => setSocialHandles(e.target.value)}
                    placeholder="@YourChurch, youtube.com/YourChurch"
                    className="h-8 text-xs"
                  />
                  {isLive && (
                    <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 mt-1"
                      onClick={() => updateScreen({ data: { ...safeBase(), liveSocialHandles: liveShowHandles ? socialHandles : "" } })}>
                      <RefreshCw className="w-3 h-3" /> Update on Screen
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Column 2: Scenes + Presenter Spotlight ── */}
        <div className="space-y-4">
          {/* Scene Switcher */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Clapperboard className="w-4 h-4" /> Scene Switcher</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scenes.map(scene => {
                const active = currentScene === scene.name;
                return (
                  <div key={scene.id} className="flex items-center gap-2">
                    {editingScene === scene.id ? (
                      <Input
                        autoFocus
                        defaultValue={scene.name}
                        className="h-8 text-xs flex-1"
                        onBlur={e => {
                          setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, name: e.target.value || s.name } : s));
                          setEditingScene(null);
                        }}
                        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    ) : (
                      <button
                        onClick={() => switchScene(scene)}
                        className={`flex-1 flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                          active
                            ? "bg-primary/15 border-primary text-primary font-semibold"
                            : "border-border text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="text-base leading-none">{scene.icon}</span>
                        <span className="text-sm">{scene.name}</span>
                        {active && (
                          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            LIVE
                          </span>
                        )}
                      </button>
                    )}
                    <button onClick={() => setEditingScene(scene.id)}
                      className="w-7 h-8 flex items-center justify-center rounded border border-border hover:bg-muted/60 text-muted-foreground shrink-0">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {scenes.length < 8 && (
                <Button size="sm" variant="ghost" className="w-full gap-1.5 text-xs text-muted-foreground"
                  onClick={() => setScenes(prev => [...prev, { id: Date.now().toString(), name: `Scene ${prev.length + 1}`, icon: "🎬" }])}>
                  <Plus className="w-3.5 h-3.5" /> Add Scene
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Presenter Spotlight */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Mic2 className="w-4 h-4" /> Presenter Spotlight</CardTitle>
              <CardDescription className="text-[11px]">Push presenter name tag to broadcast window</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={presenterName}
                onChange={e => setPresenterName(e.target.value)}
                placeholder="Presenter Name"
                className="h-8 text-sm"
              />
              <Input
                value={presenterTitle}
                onChange={e => setPresenterTitle(e.target.value)}
                placeholder="Title / Role (optional)"
                className="h-8 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={spotlightPresenter} disabled={!presenterName} className="gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5" /> Push to Screen
                </Button>
                <Button size="sm" variant="outline" onClick={clearPresenter} className="gap-1.5">
                  Clear Tag
                </Button>
              </div>

              {/* Quick presenter presets */}
              <div className="pt-2 border-t border-border/50 space-y-1.5">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Quick Fill</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { name: "Pastor",       title: "Lead Pastor" },
                    { name: "Worship Team", title: "Worship" },
                    { name: "Guest Speaker",title: "" },
                    { name: "Announcements",title: "This Week" },
                  ].map(p => (
                    <button key={p.name}
                      onClick={() => { setPresenterName(p.name); setPresenterTitle(p.title); }}
                      className="py-1.5 px-2 rounded border border-border hover:bg-muted/40 text-[11px] text-left transition-colors">
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Stream Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Pre-Live Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[
                  { label: "Camera is on and previewing", done: true },
                  { label: "Audio levels checked",        done: true },
                  { label: "Stream key entered",          done: !!streamKey },
                  { label: "Broadcast window open",       done: false },
                  { label: "Lower thirds ready",          done: !!presenterName },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${item.done ? "bg-green-500/20 text-green-400" : "bg-muted/50 text-muted-foreground"}`}>
                      {item.done ? "✓" : "○"}
                    </span>
                    <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* ── Column 3: Camera Switch + Graphic Presets + Visualizations ── */}
        <div className="space-y-4">

          {/* ── Camera Switcher ── */}
          <Card>
            <CardHeader className="pb-0 pt-3 px-4">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection("cameraSwitch")}
              >
                <CardTitle className="text-sm flex items-center gap-2">
                  <SwitchCamera className="w-4 h-4" /> Camera Switch
                </CardTitle>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.cameraSwitch ? "rotate-180" : ""}`} />
              </button>
            </CardHeader>
            {openSections.cameraSwitch !== false && (
              <CardContent className="px-4 pb-3 pt-3 space-y-2">
                {cameraDevices.length === 0 ? (
                  <div className="text-center py-2">
                    <p className="text-[11px] text-muted-foreground mb-2">Detect available cameras to switch between them live.</p>
                    <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={detectCameras} disabled={detectingCams}>
                      {detectingCams ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      Detect Cameras
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {cameraDevices.map(dev => (
                      <button
                        key={dev.deviceId}
                        onClick={() => switchCamera(dev.deviceId)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-lg border text-left text-xs transition-all ${
                          currentCamId === dev.deviceId
                            ? "bg-primary/15 border-primary text-primary font-medium"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1">{dev.label}</span>
                        {currentCamId === dev.deviceId && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active
                          </span>
                        )}
                      </button>
                    ))}
                    <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground gap-1.5 mt-1"
                      onClick={detectCameras} disabled={detectingCams}>
                      {detectingCams ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Re-scan cameras
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* ── Graphic Presets (editable) ── */}
          <Card>
            <CardHeader className="pb-0 pt-3 px-4">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection("presets")}
              >
                <div>
                  <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> Graphic Presets</CardTitle>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.presets !== false ? "rotate-180" : ""}`} />
              </button>
            </CardHeader>
            {openSections.presets !== false && (
              <CardContent className="px-4 pb-3 pt-3">
                {/* Edit mode for a preset */}
                {editingPresetId && editPresetDraft && (
                  <div className="mb-3 p-3 rounded-lg border border-primary/40 bg-primary/5 space-y-2">
                    <p className="text-xs font-semibold text-primary">Editing: {editPresetDraft.label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Input value={editPresetDraft.emoji} onChange={e => setEditPresetDraft(d => d && ({ ...d, emoji: e.target.value }))} placeholder="Emoji" className="h-7 text-xs text-center" />
                      <Input value={editPresetDraft.label} onChange={e => setEditPresetDraft(d => d && ({ ...d, label: e.target.value }))} placeholder="Label" className="h-7 text-xs col-span-2" />
                    </div>
                    <Input value={editPresetDraft.lowerThirdName} onChange={e => setEditPresetDraft(d => d && ({ ...d, lowerThirdName: e.target.value }))} placeholder="Lower Third Name" className="h-7 text-xs" />
                    <Input value={editPresetDraft.lowerThirdTitle} onChange={e => setEditPresetDraft(d => d && ({ ...d, lowerThirdTitle: e.target.value }))} placeholder="Lower Third Subtitle" className="h-7 text-xs" />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="flex-1 gap-1 h-7 text-xs" onClick={() => {
                        setCustomPresets(prev => prev.map(p => p.id === editingPresetId ? editPresetDraft! : p));
                        setEditingPresetId(null); setEditPresetDraft(null);
                      }}><Save className="w-3 h-3" /> Save</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingPresetId(null); setEditPresetDraft(null); }}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {customPresets.map(g => (
                    <div key={g.id} className="group relative">
                      <button
                        onClick={() => fireGraphic(g)}
                        className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted/40 hover:border-primary/50 transition-all text-left"
                      >
                        <span className="text-xl leading-none shrink-0">{g.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{g.label}</p>
                          {g.lowerThirdTitle && (
                            <p className="text-[10px] text-muted-foreground truncate">{g.lowerThirdTitle}</p>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => { setEditingPresetId(g.id); setEditPresetDraft({ ...g }); }}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center bg-background/80 border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:border-primary/50 text-muted-foreground hover:text-foreground"
                        title="Edit preset"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="ghost" className="flex-1 text-xs text-muted-foreground gap-1.5"
                    onClick={() => updateScreen({ data: { ...safeBase(), lowerThirdEnabled: false } })}>
                    Clear All Graphics
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground gap-1.5"
                    onClick={() => setCustomPresets(DEFAULT_GRAPHIC_PRESETS)} title="Reset to defaults">
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* ── Live Visualizations (editable) ── */}
          <Card>
            <CardHeader className="pb-0 pt-3 px-4">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection("visualizations")}
              >
                <CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4" /> Live Visualizations</CardTitle>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.visualizations !== false ? "rotate-180" : ""}`} />
              </button>
            </CardHeader>
            {openSections.visualizations !== false && (
              <CardContent className="px-4 pb-3 pt-3 space-y-2">
                {/* Edit mode for a vis item */}
                {editingVisId && editVisDraft && (
                  <div className="mb-2 p-3 rounded-lg border border-primary/40 bg-primary/5 space-y-2">
                    <p className="text-xs font-semibold text-primary">Editing: {editVisDraft.label}</p>
                    {editVisDraft.isLowerThird ? (
                      <>
                        <Input value={editVisDraft.ltName} onChange={e => setEditVisDraft(d => d && ({ ...d, ltName: e.target.value }))} placeholder="Lower Third Name" className="h-7 text-xs" />
                        <Input value={editVisDraft.ltTitle} onChange={e => setEditVisDraft(d => d && ({ ...d, ltTitle: e.target.value }))} placeholder="Lower Third Subtitle" className="h-7 text-xs" />
                      </>
                    ) : (
                      <textarea
                        value={editVisDraft.content}
                        onChange={e => setEditVisDraft(d => d && ({ ...d, content: e.target.value }))}
                        placeholder="Overlay text content"
                        className="w-full h-16 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                    <div className="flex gap-1.5">
                      <Button size="sm" className="flex-1 gap-1 h-7 text-xs" onClick={() => {
                        setVisItems(prev => prev.map(v => v.id === editingVisId ? editVisDraft! : v));
                        setEditingVisId(null); setEditVisDraft(null);
                      }}><Save className="w-3 h-3" /> Save</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingVisId(null); setEditVisDraft(null); }}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                )}
                {visItems.map(item => (
                  <div key={item.id} className="group relative">
                    <button
                      onClick={() => {
                        if (item.isLowerThird) {
                          updateScreen({ data: { ...safeBase(), lowerThirdEnabled: true, lowerThirdName: item.ltName, lowerThirdTitle: item.ltTitle, lowerThirdPosition: item.ltPosition as "bottom-left" | "bottom-center" | "bottom-right", lowerThirdStyle: item.ltStyle as "modern" | "gradient" | "minimal" | "classic", lowerThirdAutoDismissSec: 8 } });
                        } else {
                          updateScreen({ data: { ...safeBase(), textOverlayEnabled: true, textOverlayContent: item.content, textOverlayPosition: item.position as "top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right", textOverlayFontSize: item.fontSize, textOverlayBg: item.bg, textOverlayAnimation: item.animation as "none" | "fade_in" | "slide_up" | "glow" | "pulse" } });
                        }
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/40 hover:border-primary/50 text-left transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {item.isLowerThird ? item.ltName : item.content}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                    <button
                      onClick={() => { setEditingVisId(item.id); setEditVisDraft({ ...item }); }}
                      className="absolute top-1.5 right-6 w-5 h-5 rounded flex items-center justify-center bg-background/80 border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      title="Edit visualization"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground gap-1.5"
                  onClick={() => setVisItems(DEFAULT_VIS_ITEMS)} title="Reset visualizations">
                  <RotateCcw className="w-3 h-3" /> Reset to defaults
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Audience Engagement */}
          <Card>
            <CardHeader className="pb-0 pt-3 px-4">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => toggleSection("audience")}
              >
                <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Audience Tools</CardTitle>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.audience ? "rotate-180" : ""}`} />
              </button>
            </CardHeader>
            {openSections.audience && (
              <CardContent className="px-4 pb-3 pt-3 space-y-2 text-xs text-muted-foreground">
                <div className="bg-muted/30 rounded p-2.5 space-y-1.5">
                  <p className="font-medium text-foreground">YouTube Live Chat</p>
                  <p>Access chat from YouTube Studio or the YouTube mobile app while streaming.</p>
                </div>
                <div className="bg-muted/30 rounded p-2.5 space-y-1.5">
                  <p className="font-medium text-foreground">Facebook Live Reactions</p>
                  <p>Monitor comments and reactions in Facebook Live Producer dashboard.</p>
                </div>
                <div className="bg-muted/30 rounded p-2.5 space-y-1.5">
                  <p className="font-medium text-foreground">Member Camera Feeds</p>
                  <p>Use Zoom or Google Meet, then capture the window as a camera source in OBS.</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
