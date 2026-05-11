import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SliderWithButtons } from "@/components/slider-with-buttons";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey, type Background,
  type ScreenStateScoreboardStyle, type ScreenStateScoreboardPosition, type ScreenStateUrlOverlayPosition,
} from "@workspace/api-client-react";
import { useRecording, startRecording as recStart, stopRecording as recStop, setIncludeMic, clearDownload } from "@/lib/recording";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera, Video, Image as ImageIcon, Cast, CameraOff, Play, Square,
  MonitorSpeaker, Monitor, Settings2, Loader2, CheckCircle2,
  PictureInPicture2, Maximize2, EyeOff, RotateCcw, ChevronRight, ChevronDown,
  Upload, X, FileImage, FileVideo, User, Clock, Scissors, RefreshCw, Layers3,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Circle, StopCircle, Download, Radio,
  Timer as TimerIcon, Pause, RotateCw, Hexagon, Shield, Type, Sparkles,
  Wifi, FlipHorizontal, SlidersHorizontal, MonitorPlay, Tv,
  Smartphone, ExternalLink, Trophy, Globe, Minus, Plus,
} from "lucide-react";
import { LiveStudioPanel } from "@/components/live-studio";
import { LiveCaptionsCard } from "@/components/live-captions-card";
import { StreamDestinationsCard } from "@/components/stream-destinations-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollapsibleTabsBar } from "@/components/ui/collapsible-tabs";

type PhotoTextLayer = {
  id: string; text: string; size: number; color: string;
  px: number; py: number; bold: boolean; italic: boolean;
  gradient: boolean; gc1: string; gc2: string; shadow: boolean;
  align: "left" | "center" | "right";
  fontFamily?: string;
  letterSpacing?: number;
  stroke?: boolean;
  strokeColor?: string;
  bgHighlight?: boolean;
  bgHighlightColor?: string;
  uppercase?: boolean;
};

const MEDIA_TAB_LABELS: Record<string, string> = {
  upload: "Upload", "photo-edit": "Photo Edit", "camera-broadcast": "Camera & Broadcast",
  url: "URL", icons: "Icons", overlays: "Overlays",
};
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBroadcast, type ScreenInfo } from "@/hooks/use-broadcast";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";

/** Local helper: collapsible Card sections for the Camera & Broadcast tab. */
type CamSectionKey = "source" | "layout" | "adjust";
const DEFAULT_CAM_SECTIONS: Record<CamSectionKey, boolean> = {
  source: true,
  layout: false,
  adjust: false,
};

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
  size: string;
  fit: "cover" | "contain" | "fill";
  loop: boolean;
}

function CastToDisplayCard() {
  const [casting, setCasting] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);
  const [castConnected, setCastConnected] = useState(false);
  const broadcastUrl = `${window.location.protocol}//${window.location.host}/broadcast`;
  const supportsPresentationApi = typeof window !== "undefined" && "PresentationRequest" in window;

  const castChromecast = async () => {
    setCastError(null);
    setCasting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req = new (window as any).PresentationRequest([broadcastUrl]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn: any = await req.start();
      setCastConnected(true);
      conn.addEventListener("terminate", () => setCastConnected(false));
    } catch (err) {
      const e = err as Error;
      if (e.name !== "NotAllowedError" && e.name !== "AbortError") {
        setCastError("No Chromecast found nearby. Make sure it's on the same Wi-Fi network.");
      }
    } finally {
      setCasting(false);
    }
  };

  const openBroadcastWindow = () =>
    window.open(broadcastUrl, "_blank", "noopener,noreferrer");

  const steps = {
    airplay: [
      "Open the Broadcast view (button below) on this device",
      "Swipe to open Control Centre on iPhone/iPad",
      "Tap Screen Mirroring → select your Apple TV or AirPlay display",
      "Your screen mirrors to the TV instantly",
    ],
    android: [
      "Open the Broadcast view (button below) in Chrome",
      "Pull down the notification shade twice",
      "Tap the Cast / Smart View tile",
      "Select your TV, Chromecast, or Fire Stick",
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-0 pt-3 px-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cast className="w-4 h-4" /> Cast to TV / Display
          </CardTitle>
          <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full ml-auto">Free</span>
        </div>
        <CardDescription className="text-xs mt-1">Send the broadcast view to any TV, monitor, or projector</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">

        {/* Chromecast */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <Cast className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm font-medium">Chromecast / Google TV</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Chrome browser</span>
          </div>
          {castError && <p className="text-xs text-destructive">{castError}</p>}
          {castConnected && <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Casting — broadcast view is live on Chromecast.</p>}
          {supportsPresentationApi ? (
            <Button size="sm" className="w-full gap-2" onClick={castChromecast} disabled={casting || castConnected}>
              {casting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cast className="w-3.5 h-3.5" />}
              {castConnected ? "Casting…" : casting ? "Connecting…" : "Cast Broadcast View"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground rounded bg-muted px-3 py-2">
              Open Phiri WorshipFlow in <strong className="text-foreground/70">Google Chrome</strong> to cast to Chromecast — the Cast API is Chrome‑only.
            </p>
          )}
        </div>

        {/* AirPlay — iOS */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-white/70 shrink-0" />
            <span className="text-sm font-medium">AirPlay · iPhone / iPad</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Built-in · free</span>
          </div>
          <ol className="space-y-1.5">
            {steps.airplay.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="flex items-center justify-center w-4 h-4 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold mt-0.5">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <Button size="sm" variant="outline" className="w-full gap-2" onClick={openBroadcastWindow}>
            <ExternalLink className="w-3.5 h-3.5" /> Open Broadcast View
          </Button>
        </div>

        {/* Android Cast */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">Android Cast / Smart View</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Built-in · free</span>
          </div>
          <ol className="space-y-1.5">
            {steps.android.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="flex items-center justify-center w-4 h-4 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold mt-0.5">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <Button size="sm" variant="outline" className="w-full gap-2" onClick={openBroadcastWindow}>
            <ExternalLink className="w-3.5 h-3.5" /> Open Broadcast View
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-3">
          The Broadcast view is a full-screen, chrome-free page designed specifically for projection. For the best result on AirPlay or Android Cast, open it in a dedicated tab before mirroring your screen.
        </p>
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Module-level store — persists uploaded files across route changes (cleared on page refresh). */
const _fileStore: { files: UploadedFile[] } = { files: [] };

// A small color swatch + hex input combo
function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <div className="flex gap-1 items-center">
        <input type="color" value={value.startsWith("rgba") ? "#888888" : value} onChange={e => onChange(e.target.value)}
          className="h-7 w-8 rounded border border-input cursor-pointer bg-transparent p-0.5 shrink-0" />
        <Input className="h-7 text-[11px] font-mono" value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export default function MediaPage() {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileVideoRef = useRef<HTMLVideoElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [broadcastOpen, setBroadcastOpen] = useLocalStorage("wf-card:broadcast-output:open", true);
  // Persisted per-section open/closed state for the Camera & Broadcast tab so
  // operators see a tidy collapsed panel by default after their first visit.
  const [camSections, setCamSections] = useLocalStorage<Record<CamSectionKey, boolean>>(
    "wf-media-cam-sections",
    DEFAULT_CAM_SECTIONS,
  );
  const toggleCamSection = (k: CamSectionKey) =>
    setCamSections((prev) => ({ ...prev, [k]: !prev[k] }));
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraSource, setCameraSource] = useState<"device" | "ip" | "screen">("device");
  const [ipCameraUrl, setIpCameraUrl] = useState("");
  const [camMirror, setCamMirror] = useState(false);
  const [camBrightness, setCamBrightness] = useState(100);
  const [camContrast, setCamContrast] = useState(100);
  const [camSaturate, setCamSaturate] = useState(100);
  const ipVideoRef = useRef<HTMLVideoElement>(null);

  // Track which overlay sub-cards are expanded. Default: all collapsed for a clean tab.
  const [openOverlays, setOpenOverlays] = useState<Set<string>>(new Set());
  const toggleOverlay = (k: string) => setOpenOverlays(prev => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });
  const SectionChevron = ({ section }: { section: string }) => {
    const open = openOverlays.has(section);
    return (
      <button
        type="button"
        aria-label={open ? "Collapse settings" : "Expand settings"}
        aria-expanded={open}
        onClick={() => toggleOverlay(section)}
        data-testid={`button-overlay-toggle-${section}`}
        className="p-1 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`} />
      </button>
    );
  };
  const [overlay, setOverlay] = useState([0]);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadedFiles, setUploadedFilesState] = useState<UploadedFile[]>(_fileStore.files);
  const [draggingOver, setDraggingOver] = useState(false);

  // Camera layout settings
  const [camLayout, setCamLayout] = useState<"fullscreen" | "pip-topright" | "pip-topleft" | "pip-bottomright" | "pip-bottomleft" | "side-left" | "side-right" | "dual" | "quad">("fullscreen");
  const [camShape, setCamShape] = useState<"rect" | "circle" | "rounded">("rect");
  const [camPipSize, setCamPipSize] = useState(30);
  // Side-by-side: CSS background applied to the OTHER (text) half so it isn't pure black.
  // Stored on background.value when type=camera + side layout.
  const [camSideBg, setCamSideBg] = useState<string>("linear-gradient(135deg,#1e1b4b 0%,#0f0a2e 100%)");
  // Camera border
  const [camBorderWidth, setCamBorderWidth] = useState(0);
  const [camBorderColor, setCamBorderColor] = useState("#ffffff");
  // Quad-cam: up to 4 device-slot IDs (empty string = not configured)
  const [quadSlots, setQuadSlots] = useState<[string,string,string,string]>(["","","",""]);
  const quadVideoRefs = [
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
  ];
  const [quadStreams, setQuadStreams] = useState<(MediaStream | null)[]>([null,null,null,null]);
  // Search query for the Icons & Flags tab
  const [iconSearch, setIconSearch] = useState("");
  // How clicking an icon/flag sends it to the presentation screen
  const [iconSendMode, setIconSendMode] = useState<"logo" | "background">("logo");

  // ── Photo Editor ─────────────────────────────────────────────────────────
  const [photoEditUrl, setPhotoEditUrl] = useState<string | null>(null);
  const [photoEditBrightness, setPhotoEditBrightness] = useState(100);
  const [photoEditContrast, setPhotoEditContrast] = useState(100);
  const [photoEditSaturate, setPhotoEditSaturate] = useState(100);
  const [photoEditHue, setPhotoEditHue] = useState(0);
  const [photoEditSepia, setPhotoEditSepia] = useState(0);
  const [photoEditGrayscale, setPhotoEditGrayscale] = useState(0);
  const [photoEditBlur, setPhotoEditBlur] = useState(0);
  const photoEditInputRef = useRef<HTMLInputElement>(null);

  // Photo editor – sub-tabs & advanced features
  const [photoSubTab, setPhotoSubTab] = useState<"filters" | "text" | "merge" | "bg">("filters");
  const [photoTexts, setPhotoTexts] = useState<PhotoTextLayer[]>([]);
  const [photoTInput, setPhotoTInput] = useState("Add Your Text Here");
  const [photoTSize, setPhotoTSize] = useState(72);
  const [photoTColor, setPhotoTColor] = useState("#ffffff");
  const [photoTBold, setPhotoTBold] = useState(true);
  const [photoTItalic, setPhotoTItalic] = useState(false);
  const [photoTGradient, setPhotoTGradient] = useState(false);
  const [photoTGC1, setPhotoTGC1] = useState("#ffffff");
  const [photoTGC2, setPhotoTGC2] = useState("#f97316");
  const [photoTShadow, setPhotoTShadow] = useState(true);
  const [photoTPx, setPhotoTPx] = useState(50);
  const [photoTPy, setPhotoTPy] = useState(50);
  const [photoTAlign, setPhotoTAlign] = useState<"left" | "center" | "right">("center");
  const [photoPosterBg, setPhotoPosterBg] = useState("linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#0f0a2e 100%)");
  const [photoUsePoster, setPhotoUsePoster] = useState(false);
  const [photoMergeUrl, setPhotoMergeUrl] = useState<string | null>(null);
  const [photoMergeOpacity, setPhotoMergeOpacity] = useState(80);
  const [photoMergeBlend, setPhotoMergeBlend] = useState("screen");
  const [photoMergeLayout, setPhotoMergeLayout] = useState<"overlay" | "side-by-side">("overlay");
  const [photoSplitRatio, setPhotoSplitRatio] = useState(50);
  const [photoLeftFit, setPhotoLeftFit] = useState<"cover" | "contain" | "fill">("cover");
  const [photoRightFit, setPhotoRightFit] = useState<"cover" | "contain" | "fill">("cover");
  const [photoSideBySideGap, setPhotoSideBySideGap] = useState(0);
  const photoMergeRef = useRef<HTMLInputElement>(null);
  // Image drag-to-reposition
  const [photoImgObjPosX, setPhotoImgObjPosX] = useState(50);
  const [photoImgObjPosY, setPhotoImgObjPosY] = useState(50);
  const photoPreviewDragRef = useRef<{ active: boolean; startX: number; startY: number; startPX: number; startPY: number }>({ active: false, startX: 0, startY: 0, startPX: 50, startPY: 50 });
  // Text include toggle
  const [photoIncludeText, setPhotoIncludeText] = useState(true);
  // Text layer extra options
  const [photoTFont, setPhotoTFont] = useState("Default");
  const [photoTLetterSpacing, setPhotoTLetterSpacing] = useState(0);
  const [photoTStroke, setPhotoTStroke] = useState(false);
  const [photoTStrokeColor, setPhotoTStrokeColor] = useState("#000000");
  const [photoTBgHighlight, setPhotoTBgHighlight] = useState(false);
  const [photoTBgHighlightColor, setPhotoTBgHighlightColor] = useState("rgba(0,0,0,0.55)");
  const [photoTUppercase, setPhotoTUppercase] = useState(false);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [removeBgKey, setRemoveBgKey] = useLocalStorage<string>("wf-remove-bg-key", "");

  // Previous background — saved before camera goes live so Cut/Stop can roll back
  const prevBackgroundRef = useRef<{ type: string; value: string; overlay?: number; fit?: "cover" | "contain" | "fill"; loop?: boolean; cameraLayout?: string; cameraShape?: string; cameraPipSize?: number } | null>(null);

  // Recording — module-level state survives navigation
  const recording = useRecording();
  const recState = recording.state;
  const recDuration = recording.duration;
  const recDownloadUrl = recording.downloadUrl;
  const recIncludeMic = recording.includeMic;

  // Active tab — persisted across navigation via sessionStorage
  const [mediaTabsCollapsed, setMediaTabsCollapsed] = useLocalStorage<boolean>("wf-tabs:media:collapsed", false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem("wf-media-tab") || "upload";
      // Migrate old tab values to new combined tab
      if (saved === "camera" || saved === "broadcast") return "camera-broadcast";
      return saved;
    } catch { return "upload"; }
  });

  // Lower-third draft state
  const [ltName, setLtName] = useState("");
  const [ltTitleText, setLtTitleText] = useState("");
  const [ltPosition, setLtPosition] = useState<"bottom-left" | "bottom-center" | "bottom-right">("bottom-left");
  const [ltStyle, setLtStyle] = useState<"modern" | "classic" | "gradient" | "minimal">("modern");
  const [ltNameColor, setLtNameColor] = useState("#ffffff");
  const [ltTitleColor, setLtTitleColor] = useState("rgba(255,255,255,0.65)");
  const [ltBgColor, setLtBgColor] = useState("rgba(0,0,0,0.72)");
  const [ltAccentColor, setLtAccentColor] = useState("rgba(255,255,255,0.75)");
  const [ltNameSize, setLtNameSize] = useState(22);
  const [ltTitleSize, setLtTitleSize] = useState(13);
  const [ltAutoDismissSec, setLtAutoDismissSec] = useState(0);
  const [ltInitialized, setLtInitialized] = useState(false);

  // Logo overlay draft state
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrlDraft, setLogoUrlDraft] = useState("");
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [logoPosDraft, setLogoPosDraft] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right" | "center">("top-right");
  const [logoSizeDraft, setLogoSizeDraft] = useState(20);
  const [logoOpacityDraft, setLogoOpacityDraft] = useState(100);
  const [logoShapeDraft, setLogoShapeDraft] = useState<"rect" | "circle" | "rounded" | "hex" | "shield">("rect");
  const [logoTextDraft, setLogoTextDraft] = useState("");
  const [logoTextColorDraft, setLogoTextColorDraft] = useState("#ffffff");
  const [logoTextSizeDraft, setLogoTextSizeDraft] = useState(14);
  const [logoTextPositionDraft, setLogoTextPositionDraft] = useState<"right" | "left" | "below" | "above">("right");
  const [logoTextWeightDraft, setLogoTextWeightDraft] = useState<"400" | "500" | "600" | "700">("600");
  const [logoInitialized, setLogoInitialized] = useState(false);

  // Timer / stopwatch draft state
  const [timerModeDraft, setTimerModeDraft] = useState<"stopwatch" | "countdown">("stopwatch");
  const [timerDurationMinDraft, setTimerDurationMinDraft] = useState(5);
  const [timerDurationSecDraft, setTimerDurationSecDraft] = useState(0);
  const [timerPositionDraft, setTimerPositionDraft] = useState<"top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right">("top-center");
  const [timerFontSizeDraft, setTimerFontSizeDraft] = useState(48);
  const [timerColorDraft, setTimerColorDraft] = useState("#ffffff");
  const [timerBgColorDraft, setTimerBgColorDraft] = useState("rgba(0,0,0,0.6)");
  const [timerLabelDraft, setTimerLabelDraft] = useState("");
  const [timerWarningSecDraft, setTimerWarningSecDraft] = useState(60);
  const [timerInitialized, setTimerInitialized] = useState(false);
  const [timerTick, setTimerTick] = useState(0);

  // Ticker draft state
  const [tickerTextDraft, setTickerTextDraft] = useState("");
  const [tickerSpeedDraft, setTickerSpeedDraft] = useState(20);
  const [tickerDividerDraft, setTickerDividerDraft] = useState("✦");
  const [tickerColorDraft, setTickerColorDraft] = useState("#ffffff");
  const [tickerBgColorDraft, setTickerBgColorDraft] = useState("rgba(0,0,0,0.75)");
  const [tickerFontSizeDraft, setTickerFontSizeDraft] = useState(18);
  const [tickerInitialized, setTickerInitialized] = useState(false);

  // Text overlay draft state
  const [toContent, setToContent] = useState("");
  const [toPosition, setToPosition] = useState<"top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right">("top-left");
  const [toFontSize, setToFontSize] = useState(36);
  const [toColor, setToColor] = useState("#ffffff");
  const [toBg, setToBg] = useState("rgba(0,0,0,0.55)");
  const [toBold, setToBold] = useState(false);
  const [toItalic, setToItalic] = useState(false);
  const [toAlign, setToAlign] = useState<"left" | "center" | "right">("left");
  const [toFontFamily, setToFontFamily] = useState("inherit");
  const [toShadow, setToShadow] = useState(false);
  const [toOpacity, setToOpacity] = useState(100);
  const [toPadding, setToPadding] = useState(8);
  const [toRadius, setToRadius] = useState(4);
  const [toLetterSpacing, setToLetterSpacing] = useState(0);
  const [toAnimation, setToAnimation] = useState<"none" | "fade_in" | "slide_up" | "glow" | "pulse">("none");
  const [toMaxWidth, setToMaxWidth] = useState(80);
  const [toBorderColor, setToBorderColor] = useState("#ffffff");
  const [toBorderWidth, setToBorderWidth] = useState(0);
  const [toAutoDismissSec, setToAutoDismissSec] = useState(0);
  const [toInitialized, setToInitialized] = useState(false);

  const { toast } = useToast();

  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 2000 },
  });

  // ── Scoreboard overlay local state ──────────────────────────────────────────
  const [sbTeamA,    setSbTeamA]    = useState((screenState?.scoreboardTeamA as string) ?? "Home");
  const [sbTeamB,    setSbTeamB]    = useState((screenState?.scoreboardTeamB as string) ?? "Away");
  const [sbScoreA,   setSbScoreA]   = useState((screenState?.scoreboardScoreA as number) ?? 0);
  const [sbScoreB,   setSbScoreB]   = useState((screenState?.scoreboardScoreB as number) ?? 0);
  const [sbStyle,    setSbStyle]    = useState<ScreenStateScoreboardStyle>((screenState?.scoreboardStyle as ScreenStateScoreboardStyle) ?? "modern");
  const [sbPosition, setSbPosition] = useState<ScreenStateScoreboardPosition>((screenState?.scoreboardPosition as ScreenStateScoreboardPosition) ?? "top-center");
  const [sbAccentA,  setSbAccentA]  = useState((screenState?.scoreboardAccentA as string) ?? "#3b82f6");
  const [sbAccentB,  setSbAccentB]  = useState((screenState?.scoreboardAccentB as string) ?? "#ef4444");

  // ── URL overlay local state ──────────────────────────────────────────────────
  const [urlOvUrl,      setUrlOvUrl]      = useState((screenState?.urlOverlayUrl as string) ?? "");
  const [urlOvPosition, setUrlOvPosition] = useState<ScreenStateUrlOverlayPosition>((screenState?.urlOverlayPosition as ScreenStateUrlOverlayPosition) ?? "bottom-right");
  const [urlOvWidth,    setUrlOvWidth]    = useState((screenState?.urlOverlayWidth  as number) ?? 35);
  const [urlOvHeight,   setUrlOvHeight]   = useState((screenState?.urlOverlayHeight as number) ?? 25);
  const [urlOvOpacity,  setUrlOvOpacity]  = useState((screenState?.urlOverlayOpacity as number) ?? 90);

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
      onError: () => toast({ title: "Failed to update screen", description: "Could not save changes. Please try again.", variant: "destructive" }),
    },
  });

  const {
    screens, permissionState, settings, updateSettings,
    detectScreens, openBroadcast, isWindowManagementSupported,
  } = useBroadcast();

  // Sync lower-third draft from server state on first load only
  useEffect(() => {
    if (!ltInitialized && screenState) {
      if (screenState.lowerThirdName)     setLtName(screenState.lowerThirdName);
      if (screenState.lowerThirdTitle)    setLtTitleText(screenState.lowerThirdTitle);
      if (screenState.lowerThirdPosition) setLtPosition(screenState.lowerThirdPosition as typeof ltPosition);
      if (screenState.lowerThirdStyle)    setLtStyle(screenState.lowerThirdStyle as typeof ltStyle);
      if (screenState.lowerThirdNameColor)   setLtNameColor(screenState.lowerThirdNameColor);
      if (screenState.lowerThirdTitleColor)  setLtTitleColor(screenState.lowerThirdTitleColor);
      if (screenState.lowerThirdBgColor)     setLtBgColor(screenState.lowerThirdBgColor);
      if (screenState.lowerThirdAccentColor) setLtAccentColor(screenState.lowerThirdAccentColor);
      if (screenState.lowerThirdNameSize)    setLtNameSize(screenState.lowerThirdNameSize);
      if (screenState.lowerThirdTitleSize)   setLtTitleSize(screenState.lowerThirdTitleSize);
      if (typeof screenState.lowerThirdAutoDismissSec === "number") setLtAutoDismissSec(screenState.lowerThirdAutoDismissSec);
      setLtInitialized(true);
    }
  }, [screenState, ltInitialized]);

  // Sync ticker draft from server state on first load only
  useEffect(() => {
    if (!tickerInitialized && screenState) {
      if (screenState.tickerText)      setTickerTextDraft(screenState.tickerText);
      if (screenState.tickerSpeed)     setTickerSpeedDraft(screenState.tickerSpeed);
      if (screenState.tickerDivider)   setTickerDividerDraft(screenState.tickerDivider);
      if (screenState.tickerColor)     setTickerColorDraft(screenState.tickerColor);
      if (screenState.tickerBgColor)   setTickerBgColorDraft(screenState.tickerBgColor);
      if (screenState.tickerFontSize)  setTickerFontSizeDraft(screenState.tickerFontSize);
      setTickerInitialized(true);
    }
  }, [screenState, tickerInitialized]);

  // Sync logo draft from server state on first load only
  useEffect(() => {
    if (!logoInitialized && screenState) {
      if (screenState.logoUrl)      setLogoUrlDraft(screenState.logoUrl);
      if (screenState.logoPosition) setLogoPosDraft(screenState.logoPosition as typeof logoPosDraft);
      if (screenState.logoSize)     setLogoSizeDraft(screenState.logoSize);
      if (screenState.logoOpacity)  setLogoOpacityDraft(screenState.logoOpacity);
      if (screenState.logoShape)         setLogoShapeDraft(screenState.logoShape as typeof logoShapeDraft);
      if (screenState.logoText)          setLogoTextDraft(screenState.logoText);
      if (screenState.logoTextColor)     setLogoTextColorDraft(screenState.logoTextColor);
      if (screenState.logoTextSize)      setLogoTextSizeDraft(screenState.logoTextSize);
      if (screenState.logoTextPosition)  setLogoTextPositionDraft(screenState.logoTextPosition as typeof logoTextPositionDraft);
      if (screenState.logoTextWeight)    setLogoTextWeightDraft(screenState.logoTextWeight as typeof logoTextWeightDraft);
      setLogoInitialized(true);
    }
  }, [screenState, logoInitialized]);

  // Sync text overlay draft from server state on first load only
  useEffect(() => {
    if (!toInitialized && screenState) {
      if (screenState.textOverlayContent)        setToContent(screenState.textOverlayContent);
      if (screenState.textOverlayPosition)       setToPosition(screenState.textOverlayPosition as typeof toPosition);
      if (screenState.textOverlayFontSize)       setToFontSize(screenState.textOverlayFontSize);
      if (screenState.textOverlayColor)          setToColor(screenState.textOverlayColor);
      if (screenState.textOverlayBg)             setToBg(screenState.textOverlayBg);
      setToBold(screenState.textOverlayBold ?? false);
      setToItalic(screenState.textOverlayItalic ?? false);
      if (screenState.textOverlayAlign)          setToAlign(screenState.textOverlayAlign as typeof toAlign);
      if (screenState.textOverlayFontFamily)     setToFontFamily(screenState.textOverlayFontFamily);
      setToShadow(screenState.textOverlayShadow ?? false);
      if (typeof screenState.textOverlayOpacity === "number")        setToOpacity(screenState.textOverlayOpacity);
      if (typeof screenState.textOverlayPadding === "number")        setToPadding(screenState.textOverlayPadding);
      if (typeof screenState.textOverlayRadius === "number")         setToRadius(screenState.textOverlayRadius);
      if (typeof screenState.textOverlayLetterSpacing === "number")  setToLetterSpacing(screenState.textOverlayLetterSpacing);
      if (screenState.textOverlayAnimation)                          setToAnimation(screenState.textOverlayAnimation as typeof toAnimation);
      if (typeof screenState.textOverlayMaxWidth === "number")       setToMaxWidth(screenState.textOverlayMaxWidth);
      if (screenState.textOverlayBorderColor)                        setToBorderColor(screenState.textOverlayBorderColor);
      if (typeof screenState.textOverlayBorderWidth === "number")    setToBorderWidth(screenState.textOverlayBorderWidth);
      if (typeof screenState.textOverlayAutoDismissSec === "number") setToAutoDismissSec(screenState.textOverlayAutoDismissSec);
      setToInitialized(true);
    }
  }, [screenState, toInitialized]);

  // Live tick for the Timer card display in Overlays tab
  useEffect(() => {
    if (!screenState?.timerEnabled || !screenState.timerStartedAt) return;
    const id = setInterval(() => setTimerTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [screenState?.timerEnabled, screenState?.timerStartedAt]);

  // Sync timer draft from server state on first load only
  useEffect(() => {
    if (!timerInitialized && screenState) {
      if (screenState.timerMode)        setTimerModeDraft(screenState.timerMode as typeof timerModeDraft);
      if (typeof screenState.timerDurationSec === "number") {
        setTimerDurationMinDraft(Math.floor(screenState.timerDurationSec / 60));
        setTimerDurationSecDraft(screenState.timerDurationSec % 60);
      }
      if (screenState.timerPosition)    setTimerPositionDraft(screenState.timerPosition as typeof timerPositionDraft);
      if (screenState.timerFontSize)    setTimerFontSizeDraft(screenState.timerFontSize);
      if (screenState.timerColor)       setTimerColorDraft(screenState.timerColor);
      if (screenState.timerBgColor)     setTimerBgColorDraft(screenState.timerBgColor);
      if (screenState.timerLabel)       setTimerLabelDraft(screenState.timerLabel);
      if (screenState.timerWarningSec)  setTimerWarningSecDraft(screenState.timerWarningSec);
      setTimerInitialized(true);
    }
  }, [screenState, timerInitialized]);

  const setUploadedFiles = (updater: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => {
    setUploadedFilesState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      _fileStore.files = next;
      return next;
    });
  };

  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vids = devices.filter(d => d.kind === "videoinput");
      setCameras(vids);
      if (vids.length > 0 && !selectedCameraId) setSelectedCameraId(vids[0].deviceId);
    } catch {}
  };

  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = { video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      // NOTE: don't assign srcObject here — the <video> element only mounts
      // AFTER this state update commits, so videoRef.current is null on the
      // first call. The dedicated `useEffect([cameraStream])` below handles
      // the assignment once the element is in the DOM.
      await enumerateCameras();
      if (deviceId) setSelectedCameraId(deviceId);
    } catch {
      setCameraError("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    // If camera is currently live on the presentation screen, revert to previous background
    if (screenState?.background?.type === "camera") {
      const prevBg = prevBackgroundRef.current;
      const defaultWpId = localStorage.getItem("wf-default-wallpaper") ?? "bokeh";
      const fallbackBg = { type: "live_wallpaper" as const, value: defaultWpId, overlay: 0 };
      updateScreen({
        data: {
          ...safeFullState(),
          isBlack: false,
          isClear: false,
          background: (prevBg ?? fallbackBg) as Background,
        }
      });
      prevBackgroundRef.current = null;
      toast({ title: "Camera stopped", description: prevBg ? "Presentation reverted to previous background." : "Presentation restored to default wallpaper." });
    }
  };

  const switchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    await startCamera(deviceId);
    // If the camera is currently live on the presentation screen, push the new deviceId
    // so the broadcast window re-acquires the stream from the correct device.
    if (screenState?.background?.type === "camera") {
      updateScreen({
        data: {
          ...safeFullState(),
          background: {
            ...screenState.background,
            cameraDeviceId: deviceId,
          },
        },
      });
    }
  };

  const cutFeed = () => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    const prevBg = prevBackgroundRef.current;
    if (prevBg && prevBg.type !== "camera") {
      updateScreen({ data: { ...safeFullState(), isBlack: false, background: prevBg as Background } });
      prevBackgroundRef.current = null;
      toast({ title: "Feed cut", description: "Camera stopped. Presentation restored to previous background." });
    } else {
      updateScreen({ data: { ...safeFullState(), isBlack: true, isClear: false } });
      toast({ title: "Feed cut", description: "Camera stopped and screen blacked out." });
    }
  };

  const startScreenCapture = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(stream);
      setCameraSource("screen");
      // srcObject is wired up by the `useEffect([cameraStream])` below once
      // the conditional <video> element mounts in the DOM.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setCameraStream(null);
      });
    } catch {
      setCameraError("Screen capture was cancelled or denied.");
    }
  };

  const sendIpCameraToScreen = () => {
    if (!ipCameraUrl) return;
    sendVideoToScreen(ipCameraUrl, "cover", true);
    toast({ title: "IP Camera sent", description: "Streaming URL sent to the presentation screen." });
  };

  /** Build a safe full state object preserving all overlay fields. */
  const safeFullState = () => ({
    isBlack: screenState?.isBlack ?? false,
    isClear: screenState?.isClear ?? false,
    contentType: (screenState?.contentType ?? "none") as "none" | "verse" | "song" | "custom_text" | "image" | "video",
    title: screenState?.title ?? undefined,
    content: screenState?.content ?? undefined,
    textStyle: screenState?.textStyle ?? undefined,
    background: screenState?.background ?? undefined,
    layout: screenState?.layout ?? undefined,
    tickerEnabled: screenState?.tickerEnabled ?? false,
    tickerText: screenState?.tickerText ?? undefined,
    tickerSpeed: screenState?.tickerSpeed ?? 20,
    tickerDivider: screenState?.tickerDivider ?? "✦",
    tickerColor: screenState?.tickerColor ?? "#ffffff",
    tickerBgColor: screenState?.tickerBgColor ?? "rgba(0,0,0,0.75)",
    tickerFontSize: screenState?.tickerFontSize ?? 18,
    idleWatermark: screenState?.idleWatermark ?? undefined,
    lowerThirdEnabled: screenState?.lowerThirdEnabled ?? false,
    lowerThirdName: screenState?.lowerThirdName ?? undefined,
    lowerThirdTitle: screenState?.lowerThirdTitle ?? undefined,
    lowerThirdPosition: (screenState?.lowerThirdPosition ?? "bottom-left") as "bottom-left" | "bottom-center" | "bottom-right",
    lowerThirdStyle: (screenState?.lowerThirdStyle ?? "modern") as "modern" | "classic" | "gradient" | "minimal",
    lowerThirdNameColor: screenState?.lowerThirdNameColor ?? "#ffffff",
    lowerThirdTitleColor: screenState?.lowerThirdTitleColor ?? "rgba(255,255,255,0.65)",
    lowerThirdBgColor: screenState?.lowerThirdBgColor ?? "rgba(0,0,0,0.72)",
    lowerThirdAccentColor: screenState?.lowerThirdAccentColor ?? "rgba(255,255,255,0.75)",
    lowerThirdNameSize: screenState?.lowerThirdNameSize ?? 22,
    lowerThirdTitleSize: screenState?.lowerThirdTitleSize ?? 13,
    lowerThirdAutoDismissSec: screenState?.lowerThirdAutoDismissSec ?? 0,
    clockShowSeconds: screenState?.clockShowSeconds ?? true,
    clockBgColor: screenState?.clockBgColor ?? "rgba(0,0,0,0.52)",
    clockBgOpacity: screenState?.clockBgOpacity ?? 100,
    clockBgRadius: screenState?.clockBgRadius ?? 6,
    clockBgPadding: screenState?.clockBgPadding ?? 13,
    logoShape: screenState?.logoShape ?? "rect",
    logoText: screenState?.logoText ?? undefined,
    logoTextColor: screenState?.logoTextColor ?? "#ffffff",
    logoTextSize: screenState?.logoTextSize ?? 14,
    logoTextPosition: screenState?.logoTextPosition ?? "right",
    logoTextWeight: screenState?.logoTextWeight ?? "600",
    textOverlayOpacity: screenState?.textOverlayOpacity ?? 100,
    textOverlayPadding: screenState?.textOverlayPadding ?? 8,
    textOverlayRadius: screenState?.textOverlayRadius ?? 4,
    textOverlayLetterSpacing: screenState?.textOverlayLetterSpacing ?? 0,
    textOverlayAnimation: screenState?.textOverlayAnimation ?? "none",
    textOverlayMaxWidth: screenState?.textOverlayMaxWidth ?? 80,
    textOverlayBorderColor: screenState?.textOverlayBorderColor ?? "transparent",
    textOverlayBorderWidth: screenState?.textOverlayBorderWidth ?? 0,
    textOverlayAutoDismissSec: screenState?.textOverlayAutoDismissSec ?? 0,
    timerEnabled: screenState?.timerEnabled ?? false,
    timerMode: screenState?.timerMode ?? "stopwatch",
    timerStartedAt: screenState?.timerStartedAt ?? "",
    timerAccumulatedMs: screenState?.timerAccumulatedMs ?? 0,
    timerDurationSec: screenState?.timerDurationSec ?? 300,
    timerPosition: screenState?.timerPosition ?? "top-center",
    timerFontSize: screenState?.timerFontSize ?? 48,
    timerColor: screenState?.timerColor ?? "#ffffff",
    timerBgColor: screenState?.timerBgColor ?? "rgba(0,0,0,0.6)",
    timerLabel: screenState?.timerLabel ?? undefined,
    timerWarningSec: screenState?.timerWarningSec ?? 60,
    timerWarningColor: screenState?.timerWarningColor ?? "#fbbf24",
    timerCriticalColor: screenState?.timerCriticalColor ?? "#ef4444",
    clockOverlayEnabled: screenState?.clockOverlayEnabled ?? false,
    clockPosition: (screenState?.clockPosition ?? "top-right") as "top-left" | "top-right" | "bottom-left" | "bottom-right",
    clockStyle: (screenState?.clockStyle ?? "digital") as "digital" | "clean",
    clockShowDate: screenState?.clockShowDate ?? false,
    clockDateFormat: (screenState?.clockDateFormat ?? "long") as "short" | "long" | "numeric",
    clockFontSize: screenState?.clockFontSize ?? 16,
    clockColor: screenState?.clockColor ?? "rgba(255,255,255,0.92)",
    logoOverlayEnabled: screenState?.logoOverlayEnabled ?? false,
    logoUrl: screenState?.logoUrl ?? undefined,
    logoPosition: (screenState?.logoPosition ?? "top-right") as "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center",
    logoSize: screenState?.logoSize ?? 20,
    logoOpacity: screenState?.logoOpacity ?? 100,
    textOverlayEnabled: screenState?.textOverlayEnabled ?? false,
    textOverlayContent: screenState?.textOverlayContent ?? undefined,
    textOverlayPosition: (screenState?.textOverlayPosition ?? "top-left") as "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right",
    textOverlayFontSize: screenState?.textOverlayFontSize ?? 36,
    textOverlayColor: screenState?.textOverlayColor ?? "#ffffff",
    textOverlayBg: screenState?.textOverlayBg ?? "rgba(0,0,0,0.55)",
    textOverlayBold: screenState?.textOverlayBold ?? false,
    textOverlayItalic: screenState?.textOverlayItalic ?? false,
    textOverlayAlign: (screenState?.textOverlayAlign ?? "left") as "left" | "center" | "right",
    textOverlayFontFamily: screenState?.textOverlayFontFamily ?? "inherit",
    textOverlayShadow: screenState?.textOverlayShadow ?? false,
    bibleRefShow: screenState?.bibleRefShow ?? true,
    bibleRefFontSize: screenState?.bibleRefFontSize ?? 28,
    bibleRefColor: screenState?.bibleRefColor ?? "#ffffff",
    bibleRefBgColor: screenState?.bibleRefBgColor ?? "rgba(0,0,0,0.55)",
    bibleRefBold: screenState?.bibleRefBold ?? true,
    bibleRefShowTranslation: screenState?.bibleRefShowTranslation ?? true,
    bibleRefPadding: screenState?.bibleRefPadding ?? 10,
    bibleRefRadius: screenState?.bibleRefRadius ?? 6,
    bibleRefLetterSpacing: screenState?.bibleRefLetterSpacing ?? 4,
    bibleRefUppercase: screenState?.bibleRefUppercase ?? false,
    bibleBookShow: screenState?.bibleBookShow ?? true,
    bibleBookFontSize: screenState?.bibleBookFontSize ?? 28,
    bibleBookColor: screenState?.bibleBookColor ?? "#ffffff",
    bibleBookBgColor: screenState?.bibleBookBgColor ?? "rgba(0,0,0,0.52)",
    bibleBookBold: screenState?.bibleBookBold ?? true,
    bibleBookPadding: screenState?.bibleBookPadding ?? 10,
    bibleBookRadius: screenState?.bibleBookRadius ?? 6,
    bibleBookLetterSpacing: screenState?.bibleBookLetterSpacing ?? 18,
    bibleBookUppercase: screenState?.bibleBookUppercase ?? true,
  });

  const updateOverlay = (patch: Partial<ReturnType<typeof safeFullState>>) =>
    updateScreen({ data: { ...safeFullState(), ...patch } });

  /** Compress a logo image to ≤400px PNG. */
  const compressLogoImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.onload = (evt) => {
        const raw = evt.target?.result as string | undefined;
        if (!raw) { reject(new Error("Empty result")); return; }
        const img = new Image();
        img.onerror = () => reject(new Error("Image decode failed"));
        img.onload = () => {
          try {
            const MAX = 400;
            const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
            const scale = Math.min(1, MAX / longest);
            const w = Math.max(1, Math.round(img.naturalWidth * scale));
            const h = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) { resolve(raw); return; }
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/png"));
          } catch { resolve(raw); }
        };
        img.src = raw;
      };
      reader.readAsDataURL(file);
    });

  const handleLogoFile = async (file: File) => {
    try {
      const dataUrl = await compressLogoImage(file);
      setLogoUrlDraft(dataUrl);
      setLogoUrlInput("");
    } catch (err) {
      toast({ title: "Failed to load logo image", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  // Enumerate cameras on mount (labels may be blank until permission is granted)
  useEffect(() => {
    enumerateCameras();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()); };
  }, [cameraStream]);

  /**
   * Wire the live camera / screen-capture MediaStream into the <video>
   * element AFTER React mounts it.  Doing this synchronously inside
   * `startCamera` doesn't work: the <video> is conditionally rendered on
   * `cameraStream`, so on the first start the element doesn't exist yet
   * (videoRef.current is null) and the preview stays blank.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (cameraStream) {
      if (v.srcObject !== cameraStream) v.srcObject = cameraStream;
      // play() can reject if interrupted by another play/srcObject swap —
      // safe to ignore; autoPlay will handle it.
      v.play().catch(() => {});
    } else {
      v.srcObject = null;
    }
  }, [cameraStream]);

  /** Convert a blob: URL to a data URL so the broadcast window can load it. */
  const blobToDataUrl = (blobUrl: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1920;
        const scale = Math.min(1, MAX / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = blobUrl;
    });

  const sendCameraToScreen = () => {
    // Save current background so Cut/Stop can roll back to it
    if (screenState?.background?.type !== "camera") {
      prevBackgroundRef.current = screenState?.background ?? null;
    }
    updateScreen({
      data: {
        ...safeFullState(),
        isBlack: false,
        isClear: false,
        contentType: "custom_text" as const,
        background: {
          type: "camera",
          // For any non-fullscreen layout (PiP or side-by-side), value is the CSS
          // background that fills the area not covered by the camera. Fullscreen
          // ignores value (sentinel "camera").
          value: camLayout !== "fullscreen" && camLayout !== "quad" ? camSideBg : "camera",
          overlay: overlay[0],
          cameraLayout: camLayout,
          cameraShape: camShape,
          cameraPipSize: camPipSize,
          cameraBrightness: camBrightness,
          cameraContrast: camContrast,
          cameraSaturate: camSaturate,
          cameraMirror: camMirror,
          cameraBorderWidth: camBorderWidth,
          cameraBorderColor: camBorderColor,
          // Route the camera source: "__screen__" sentinel tells the broadcast
          // window to use getDisplayMedia() instead of getUserMedia(), so a
          // fullscreen / PiP / side layout can present a screen capture (not
          // just the quad/dual grid that already supported it).
          cameraDeviceId: (camLayout !== "quad" && camLayout !== "dual")
            ? (cameraSource === "screen" ? "__screen__" : selectedCameraId)
            : undefined,
          cameraDeviceIds: (camLayout === "quad" || camLayout === "dual") ? quadSlots.slice(0, camLayout === "dual" ? 2 : 4).filter(Boolean) : undefined,
        },
      }
    });
  };

  const startRecording = async () => {
    const result = await recStart();
    if (!result.ok && result.error && result.error !== "Permission denied" && result.error !== "Already recording or starting") {
      toast({ title: "Recording failed", description: result.error, variant: "destructive" });
    }
  };

  const stopRecording = () => recStop();
  const setRecIncludeMic = (v: boolean) => setIncludeMic(v);

  /**
   * Save the current screen background to prevBackgroundRef so a later "Cut Media" can restore it.
   * Skipped when the current background is already image/video — that means an earlier media is on
   * screen and we want to keep the ORIGINAL theme as the rollback target, not the previous photo.
   */
  const captureBackgroundForRollback = () => {
    const currentType = screenState?.background?.type;
    if (currentType !== "image" && currentType !== "video") {
      prevBackgroundRef.current = screenState?.background ?? null;
    }
  };

  const sendImageToScreen = async (url: string, fit: "cover" | "contain" | "fill" = "cover") => {
    if (!url) return;
    captureBackgroundForRollback();
    const resolved = url.startsWith("blob:") ? await blobToDataUrl(url).catch(() => url) : url;
    updateScreen({ data: { ...safeFullState(), isBlack: false, isClear: false, contentType: "image" as const, background: { type: "image", value: resolved, overlay: overlay[0], fit } } });
  };

  // ── Photo editor helpers ──────────────────────────────────────────────────
  const photoFilterString = `brightness(${photoEditBrightness}%) contrast(${photoEditContrast}%) saturate(${photoEditSaturate}%) hue-rotate(${photoEditHue}deg) sepia(${photoEditSepia}%) grayscale(${photoEditGrayscale}%) blur(${photoEditBlur}px)`;

  const PHOTO_TEXT_FONTS: Record<string, string> = {
    "Default": "'Arial', sans-serif",
    "Serif": "'Georgia', 'Times New Roman', serif",
    "Modern": "'Helvetica Neue', 'Segoe UI', sans-serif",
    "Elegant": "'Palatino Linotype', 'Book Antiqua', serif",
    "Bold": "'Impact', 'Arial Black', sans-serif",
    "Mono": "'Courier New', 'Lucida Console', monospace",
  };

  const drawTextOnCanvas = (ctx: CanvasRenderingContext2D, t: PhotoTextLayer, cW: number, cH: number) => {
    const scale = cW / 1920;
    const scaledSize = Math.max(12, Math.round(t.size * scale));
    const fontStack = PHOTO_TEXT_FONTS[t.fontFamily ?? "Default"] ?? PHOTO_TEXT_FONTS["Default"];
    ctx.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${scaledSize}px ${fontStack}`;
    ctx.textAlign = t.align;
    ctx.textBaseline = "middle";
    const displayText = t.uppercase ? t.text.toUpperCase() : t.text;
    const x = (t.px / 100) * cW;
    const y = (t.py / 100) * cH;
    if (t.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = Math.max(4, scaledSize * 0.12);
      ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    }
    const met = ctx.measureText(displayText);
    const tw = met.width;
    const pad = scaledSize * 0.25;
    if (t.bgHighlight && t.bgHighlightColor) {
      const bx = t.align === "center" ? x - tw / 2 - pad : t.align === "right" ? x - tw - pad : x - pad;
      ctx.fillStyle = t.bgHighlightColor;
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.fillRect(bx, y - scaledSize * 0.65, tw + pad * 2, scaledSize * 1.3);
    }
    if (t.gradient) {
      const sx = t.align === "center" ? x - tw / 2 : t.align === "right" ? x - tw : x;
      const grad = ctx.createLinearGradient(sx, y, sx + tw, y);
      grad.addColorStop(0, t.gc1); grad.addColorStop(1, t.gc2);
      ctx.fillStyle = grad;
    } else { ctx.fillStyle = t.color; }
    ctx.fillText(displayText, x, y);
    if (t.stroke && t.strokeColor) {
      ctx.strokeStyle = t.strokeColor;
      ctx.lineWidth = Math.max(1, scaledSize * 0.04);
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.strokeText(displayText, x, y);
    }
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  };

  const drawImgWithFit = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, fit: "cover" | "contain" | "fill") => {
    if (fit === "fill") {
      ctx.drawImage(img, x, y, w, h);
    } else if (fit === "contain") {
      const imgAR = img.naturalWidth / img.naturalHeight;
      const containerAR = w / h;
      let dw: number, dh: number;
      if (imgAR > containerAR) { dw = w; dh = w / imgAR; }
      else { dh = h; dw = h * imgAR; }
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    } else {
      const imgAR = img.naturalWidth / img.naturalHeight;
      const containerAR = w / h;
      let sw: number, sh: number, sx: number, sy: number;
      if (imgAR > containerAR) { sh = img.naturalHeight; sw = sh * containerAR; sx = (img.naturalWidth - sw) / 2; sy = 0; }
      else { sw = img.naturalWidth; sh = sw / containerAR; sx = 0; sy = (img.naturalHeight - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }
  };

  const renderPhotoCanvas = (overrideIncludeText?: boolean): Promise<string> => new Promise((resolve, reject) => {
    const includeText = overrideIncludeText !== undefined ? overrideIncludeText : photoIncludeText;
    const loadImg = (url: string): Promise<HTMLImageElement> => new Promise((res, rej) => {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => res(img); img.onerror = rej; img.src = url;
    });
    Promise.all([
      photoEditUrl ? loadImg(photoEditUrl) : Promise.resolve(null),
      photoMergeUrl ? loadImg(photoMergeUrl) : Promise.resolve(null),
    ]).then(([baseImg, mergeImg]) => {
      const cW = baseImg ? baseImg.naturalWidth : 1920;
      const cH = baseImg ? baseImg.naturalHeight : 1080;
      const canvas = document.createElement("canvas");
      canvas.width = cW; canvas.height = cH;
      const ctx = canvas.getContext("2d")!;
      if (!baseImg || photoUsePoster) {
        const hexes = photoPosterBg.match(/#[0-9a-fA-F]{6}/g) ?? ["#1e1b4b", "#0f0a2e"];
        if (hexes.length >= 2) {
          const grad = ctx.createLinearGradient(0, 0, cW, cH);
          hexes.forEach((h, i) => grad.addColorStop(i / Math.max(1, hexes.length - 1), h));
          ctx.fillStyle = grad;
        } else { ctx.fillStyle = hexes[0] ?? "#000"; }
        ctx.fillRect(0, 0, cW, cH);
      }
      if (photoMergeLayout === "side-by-side" && mergeImg) {
        const gapPx = Math.round((photoSideBySideGap / 100) * cW);
        const leftW = Math.round((photoSplitRatio / 100) * (cW - gapPx));
        const rightW = cW - gapPx - leftW;
        if (baseImg) { ctx.filter = photoFilterString; drawImgWithFit(ctx, baseImg, 0, 0, leftW, cH, photoLeftFit); ctx.filter = "none"; }
        if (gapPx > 0) { ctx.fillStyle = "#000"; ctx.fillRect(leftW, 0, gapPx, cH); }
        drawImgWithFit(ctx, mergeImg, leftW + gapPx, 0, rightW, cH, photoRightFit);
        if (photoSideBySideGap === 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(leftW, 0); ctx.lineTo(leftW, cH); ctx.stroke();
        }
      } else {
        if (baseImg) { ctx.filter = photoFilterString; ctx.drawImage(baseImg, 0, 0, cW, cH); ctx.filter = "none"; }
        if (mergeImg) {
          ctx.globalAlpha = photoMergeOpacity / 100;
          ctx.globalCompositeOperation = photoMergeBlend as GlobalCompositeOperation;
          ctx.drawImage(mergeImg, 0, 0, cW, cH);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
        }
      }
      if (includeText) photoTexts.forEach(t => drawTextOnCanvas(ctx, t, cW, cH));
      resolve(canvas.toDataURL("image/jpeg", 0.93));
    }).catch(reject);
  });

  const downloadEditedPhoto = () => {
    renderPhotoCanvas().then(dataUrl => {
      const a = document.createElement("a");
      a.href = dataUrl; a.download = "wf-photo-studio.jpg"; a.click();
    }).catch(() => toast({ title: "Export failed", variant: "destructive" }));
  };

  const sendEditedPhotoToScreen = () => {
    renderPhotoCanvas().then(dataUrl => {
      sendImageToScreen(dataUrl, "cover");
      toast({ title: "Photo sent to screen", description: "Edited photo is now on the presentation screen." });
    }).catch(() => toast({ title: "Export failed", variant: "destructive" }));
  };

  const resetPhotoFilters = () => {
    setPhotoEditBrightness(100); setPhotoEditContrast(100); setPhotoEditSaturate(100);
    setPhotoEditHue(0); setPhotoEditSepia(0); setPhotoEditGrayscale(0); setPhotoEditBlur(0);
  };

  const removeBackground = async () => {
    if (!photoEditUrl || !removeBgKey) {
      toast({ title: "API key required", description: "Enter your remove.bg API key in the Remove BG tab.", variant: "destructive" });
      return;
    }
    setBgRemoving(true);
    try {
      const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${BASE_PATH}/api/ai/remove-bg`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Remove-BG-Key": removeBgKey },
        body: JSON.stringify({ imageBase64: photoEditUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Unknown error" })) as { message?: string };
        throw new Error(err.message ?? "Failed");
      }
      const { resultBase64 } = await res.json() as { resultBase64: string };
      setPhotoEditUrl(resultBase64);
      toast({ title: "Background removed!", description: "The background has been stripped from your photo." });
    } catch (err) {
      toast({ title: "Background removal failed", description: err instanceof Error ? err.message : "Check your API key and try again.", variant: "destructive" });
    } finally {
      setBgRemoving(false);
    }
  };

  const sendVideoToScreen = (url: string, fit: "cover" | "contain" | "fill" = "cover", loop = true) => {
    if (!url) return;
    captureBackgroundForRollback();
    updateScreen({ data: { ...safeFullState(), isBlack: false, isClear: false, contentType: "video" as const, background: { type: "video", value: url, overlay: overlay[0], fit, loop } } });
  };

  /**
   * Stop the currently-presented uploaded media and restore the previous theme/background.
   * Falls back to a black screen if no previous background was captured (e.g. media was already
   * on screen before this tab session started).
   */
  const isMediaLive =
    screenState?.background?.type === "image" || screenState?.background?.type === "video";

  const cutMedia = () => {
    if (!isMediaLive) {
      toast({ title: "Nothing to cut", description: "No image or video is currently on the presentation screen." });
      return;
    }
    const prevBg = prevBackgroundRef.current;
    const defaultWpId = localStorage.getItem("wf-default-wallpaper") ?? "bokeh";
    const fallbackBg: Background = { type: "live_wallpaper", value: defaultWpId, overlay: 0 };
    updateScreen({ data: { ...safeFullState(), isBlack: false, isClear: false, background: (prevBg ?? fallbackBg) as Background } });
    prevBackgroundRef.current = null;
    toast({ title: "Media cut", description: prevBg ? "Presentation restored to the previous theme." : "Presentation restored to default wallpaper." });
  };

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        toast({ title: "Unsupported file", description: `${file.name} is not an image or video.`, variant: "destructive" });
        return;
      }
      const url = URL.createObjectURL(file);
      const id = `${Date.now()}-${Math.random()}`;
      setUploadedFiles(prev => [...prev, { id, name: file.name, url, type: isImage ? "image" : "video", size: formatBytes(file.size), fit: "cover", loop: true }]);
    });
  }, [toast]);

  const updateFile = (id: string, patch: Partial<UploadedFile>) =>
    setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.url.startsWith("blob:")) URL.revokeObjectURL(f.url);
      return prev.filter(x => x.id !== id);
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const isPip = camLayout.startsWith("pip-");
  const isSide = camLayout.startsWith("side-");

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary"><Video className="w-6 h-6" /></div>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Media & Broadcasting</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Camera, video, image backgrounds and broadcast output settings</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap w-32">Dark Overlay: {overlay[0]}%</label>
            <SliderWithButtons value={overlay} onValueChange={setOverlay} min={0} max={90} step={5} className="flex-1" />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); try { sessionStorage.setItem("wf-media-tab", v); } catch {} }}>
        <CollapsibleTabsBar
          collapsed={mediaTabsCollapsed}
          onToggle={() => setMediaTabsCollapsed((c) => !c)}
          activeLabel={MEDIA_TAB_LABELS[activeTab]}
        >
          <TabsList className="w-full flex-wrap h-auto gap-0.5">
            <TabsTrigger value="upload"           className="flex-1 gap-1.5 min-w-0"><Upload    className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Upload</span></TabsTrigger>
            <TabsTrigger value="photo-edit"       className="flex-1 gap-1.5 min-w-0"><SlidersHorizontal className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Photo Edit</span></TabsTrigger>
            <TabsTrigger value="camera-broadcast" className="flex-1 gap-1.5 min-w-0"><Tv        className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Camera & Broadcast</span></TabsTrigger>
            <TabsTrigger value="url"              className="flex-1 gap-1.5 min-w-0"><Video     className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">URL</span></TabsTrigger>
            <TabsTrigger value="icons"            className="flex-1 gap-1.5 min-w-0"><Sparkles  className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Icons</span></TabsTrigger>
            <TabsTrigger value="overlays"         className="flex-1 gap-1.5 min-w-0"><Layers3   className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Overlays</span></TabsTrigger>
          </TabsList>
        </CollapsibleTabsBar>

        {/* ── UPLOAD ── */}
        <TabsContent value="upload" className="mt-4 space-y-4">
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${draggingOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
            onClick={() => imageInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDraggingOver(true); }}
            onDragLeave={() => setDraggingOver(false)}
            onDrop={onDrop}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Drop images or videos here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse — JPG, PNG, GIF, WebP, MP4, WebM</p>
            <div className="flex justify-center gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); imageInputRef.current?.click(); }} className="gap-1.5">
                <FileImage className="w-4 h-4" /> Images
              </Button>
              <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); videoInputRef.current?.click(); }} className="gap-1.5">
                <FileVideo className="w-4 h-4" /> Videos
              </Button>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} />
            <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} />
          </div>

          <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
            Uploaded files are available for this browser session. Re-upload after refreshing the page.
          </div>

          {/* Cut Media — stops the current image/video on screen and restores the previous theme */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5" data-testid="cut-media-bar">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {isMediaLive
                  ? <>Currently presenting <span className="text-primary capitalize">{screenState?.background?.type}</span></>
                  : "No media on screen"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {isMediaLive
                  ? prevBackgroundRef.current
                    ? "Cut to restore the previous theme."
                    : "No previous theme captured — Cut will black the screen."
                  : "Send an uploaded image or video, then Cut to roll back."}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={cutMedia}
              disabled={!isMediaLive}
              className="gap-1.5 shrink-0"
              title="Stop the current media and restore the previous theme"
              data-testid="button-cut-media"
            >
              <Scissors className="w-3.5 h-3.5" /> Cut Media
            </Button>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {uploadedFiles.map(f => (
                <Card key={f.id} className="overflow-hidden">
                  <div className="relative aspect-video bg-black">
                    {f.type === "image"
                      ? <img src={f.url} alt={f.name} className={`w-full h-full ${f.fit === "contain" ? "object-contain" : f.fit === "fill" ? "object-fill" : "object-cover"}`} />
                      : <video src={f.url} className={`w-full h-full ${f.fit === "contain" ? "object-contain" : f.fit === "fill" ? "object-fill" : "object-cover"}`} muted playsInline />
                    }
                    <button onClick={() => removeFile(f.id)} className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80">
                      <X className="w-3 h-3" />
                    </button>
                    <Badge className="absolute bottom-1.5 left-1.5 text-[10px] py-0 bg-black/60 border-0 capitalize">{f.type}</Badge>
                  </div>
                  <CardContent className="p-2 space-y-2">
                    <p className="text-xs font-medium truncate" title={f.name}>{f.name}</p>
                    <div className="flex gap-1">
                      {(["cover", "contain", "fill"] as const).map(mode => (
                        <button key={mode} onClick={() => updateFile(f.id, { fit: mode })}
                          className={`flex-1 py-0.5 rounded text-[10px] border transition-colors capitalize ${f.fit === mode ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                          {mode}
                        </button>
                      ))}
                    </div>
                    {f.type === "video" && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Loop video</span>
                        <Switch checked={f.loop} onCheckedChange={v => updateFile(f.id, { loop: v })} className="scale-75 origin-right" />
                      </div>
                    )}
                    <Button size="sm" className="w-full gap-1.5 h-7 text-xs"
                      onClick={() => f.type === "image" ? sendImageToScreen(f.url, f.fit) : sendVideoToScreen(f.url, f.fit, f.loop)}>
                      <Cast className="w-3 h-3" /> Send to Screen
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {uploadedFiles.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">No files uploaded yet</div>}
        </TabsContent>

        {/* ── PHOTO EDIT ── */}
        <TabsContent value="photo-edit" className="mt-4 space-y-4">
          {/* Hidden file inputs */}
          <input ref={photoEditInputRef} type="file" accept="image/*" hidden onChange={e => {
            const f = e.target.files?.[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = ev => setPhotoEditUrl(ev.target?.result as string);
            reader.readAsDataURL(f); e.target.value = "";
          }} />
          <input ref={photoMergeRef} type="file" accept="image/*" hidden onChange={e => {
            const f = e.target.files?.[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = ev => setPhotoMergeUrl(ev.target?.result as string);
            reader.readAsDataURL(f); e.target.value = "";
          }} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="w-4 h-4" /> Photo Studio
              </CardTitle>
              <CardDescription>
                Filters, text overlays, poster backgrounds, image merging, and background removal — all in one place.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* ── Preview area ── */}
              {(() => {
                const hasContent = !!(photoEditUrl || photoUsePoster);
                const isSideBySide = photoMergeLayout === "side-by-side" && !!photoMergeUrl;
                return hasContent ? (
                  <div className="relative w-full rounded-xl overflow-hidden border border-border select-none"
                    style={{ aspectRatio: "16/9", background: (photoUsePoster || !photoEditUrl) ? photoPosterBg : "#000", cursor: isSideBySide ? "default" : "grab" }}
                    onPointerDown={e => {
                      if (isSideBySide) return;
                      photoPreviewDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startPX: photoImgObjPosX, startPY: photoImgObjPosY };
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={e => {
                      const d = photoPreviewDragRef.current;
                      if (!d.active) return;
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const dx = ((e.clientX - d.startX) / rect.width) * 100;
                      const dy = ((e.clientY - d.startY) / rect.height) * 100;
                      setPhotoImgObjPosX(Math.max(0, Math.min(100, d.startPX - dx)));
                      setPhotoImgObjPosY(Math.max(0, Math.min(100, d.startPY - dy)));
                    }}
                    onPointerUp={() => { photoPreviewDragRef.current.active = false; }}
                  >
                    {isSideBySide ? (
                      <>
                        {photoEditUrl && (
                          <img src={photoEditUrl} alt="left" className="absolute inset-y-0 left-0 h-full"
                            style={{ width: `${photoSplitRatio}%`, objectFit: photoLeftFit, filter: photoFilterString }} />
                        )}
                        <img src={photoMergeUrl!} alt="right" className="absolute inset-y-0 right-0 h-full"
                          style={{ width: `${100 - photoSplitRatio}%`, objectFit: photoRightFit, marginLeft: `${photoSideBySideGap}%` }} />
                        {photoSideBySideGap === 0
                          ? <div className="absolute inset-y-0 bg-white/15" style={{ left: `${photoSplitRatio}%`, width: "1px" }} />
                          : <div className="absolute inset-y-0 bg-black" style={{ left: `${photoSplitRatio}%`, width: `${photoSideBySideGap}%` }} />}
                      </>
                    ) : (
                      <>
                        {photoEditUrl && (
                          <img src={photoEditUrl} alt="editing preview" className="absolute inset-0 w-full h-full"
                            style={{ objectFit: "cover", objectPosition: `${photoImgObjPosX}% ${photoImgObjPosY}%`, filter: photoFilterString }} />
                        )}
                        {photoMergeUrl && (
                          <img src={photoMergeUrl} alt="overlay" className="absolute inset-0 w-full h-full"
                            style={{ objectFit: "cover", opacity: photoMergeOpacity / 100,
                              mixBlendMode: (photoMergeBlend === "source-over" ? "normal" : photoMergeBlend) as React.CSSProperties["mixBlendMode"] }} />
                        )}
                      </>
                    )}
                    {!isSideBySide && (
                      <div className="absolute bottom-2 right-2 text-[9px] text-white/50 bg-black/40 px-1.5 py-0.5 rounded pointer-events-none">drag to reposition</div>
                    )}
                    {photoTexts.map(t => (
                      <div key={t.id} className="absolute pointer-events-none select-none"
                        style={{
                          left: `${t.px}%`, top: `${t.py}%`,
                          transform: `translate(${t.align === "center" ? "-50%" : t.align === "right" ? "-100%" : "0"}, -50%)`,
                          fontSize: `${Math.max(10, Math.round(t.size / 25))}px`,
                          fontWeight: t.bold ? "bold" : "normal",
                          fontStyle: t.italic ? "italic" : "normal",
                          textShadow: t.shadow ? "0 2px 8px rgba(0,0,0,0.85),2px 2px 3px rgba(0,0,0,0.6)" : undefined,
                          whiteSpace: "nowrap",
                          ...(t.gradient
                            ? { background: `linear-gradient(to right,${t.gc1},${t.gc2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }
                            : { color: t.color }),
                        }}>
                        {t.text}
                      </div>
                    ))}
                    <button type="button"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={() => { setPhotoEditUrl(null); setPhotoUsePoster(false); setPhotoTexts([]); setPhotoMergeUrl(null); resetPhotoFilters(); }}
                      className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1 hover:bg-black/80 transition-colors z-10">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    onClick={() => photoEditInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (!f || !f.type.startsWith("image/")) return;
                      const reader = new FileReader();
                      reader.onload = ev => setPhotoEditUrl(ev.target?.result as string);
                      reader.readAsDataURL(f);
                    }}>
                    <ImageIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium">Drop an image here or click to browse</p>
                    <p className="text-sm text-muted-foreground mt-1">JPG, PNG, WebP, GIF</p>
                    <div className="flex gap-2 items-center justify-center mt-3">
                      <span className="text-xs text-muted-foreground">or</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setPhotoUsePoster(true); }}
                        className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/40 transition-colors">
                        Start with poster background
                      </button>
                    </div>
                    {uploadedFiles.filter(f => f.type === "image").length > 0 && (
                      <div className="mt-4 space-y-1.5">
                        <p className="text-xs text-muted-foreground">Or pick from your uploads:</p>
                        <div className="flex gap-2 flex-wrap justify-center">
                          {uploadedFiles.filter(f => f.type === "image").slice(0, 8).map(f => (
                            <button key={f.id} type="button" onClick={e => { e.stopPropagation(); setPhotoEditUrl(f.url); }}
                              className="w-12 h-12 rounded border border-border overflow-hidden hover:border-primary transition-colors shrink-0">
                              <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Sub-tabs ── */}
              <Tabs value={photoSubTab} onValueChange={v => setPhotoSubTab(v as "filters" | "text" | "merge" | "bg")}>
                <TabsList className="grid grid-cols-4 w-full h-auto">
                  <TabsTrigger value="filters" className="text-xs gap-1 py-1.5"><SlidersHorizontal className="w-3 h-3" />Filters</TabsTrigger>
                  <TabsTrigger value="text"    className="text-xs gap-1 py-1.5"><Type className="w-3 h-3" />Text</TabsTrigger>
                  <TabsTrigger value="merge"   className="text-xs gap-1 py-1.5"><Layers3 className="w-3 h-3" />Merge</TabsTrigger>
                  <TabsTrigger value="bg"      className="text-xs gap-1 py-1.5"><EyeOff className="w-3 h-3" />Remove BG</TabsTrigger>
                </TabsList>

                {/* ── FILTERS ── */}
                <TabsContent value="filters" className="mt-3 space-y-4">
                  {/* Poster background swatches */}
                  {(() => {
                    const POSTER_PRESETS = [
                      { label: "Deep Purple", value: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#0f0a2e 100%)" },
                      { label: "Royal Blue",  value: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#0c1f57 100%)" },
                      { label: "Forest",      value: "linear-gradient(135deg,#064e3b 0%,#065f46 50%,#022c22 100%)" },
                      { label: "Crimson",     value: "linear-gradient(135deg,#7f1d1d 0%,#991b1b 50%,#3b0a0a 100%)" },
                      { label: "Sunset",      value: "linear-gradient(135deg,#7c2d12 0%,#c2410c 50%,#78350f 100%)" },
                      { label: "Gold",        value: "linear-gradient(135deg,#78350f 0%,#b45309 50%,#451a03 100%)" },
                      { label: "Plum",        value: "linear-gradient(135deg,#3b0764 0%,#6b21a8 50%,#1e0533 100%)" },
                      { label: "Midnight",    value: "linear-gradient(135deg,#030712 0%,#111827 50%,#000 100%)" },
                      { label: "Teal",        value: "linear-gradient(135deg,#134e4a 0%,#0d9488 50%,#042f2e 100%)" },
                      { label: "Slate",       value: "linear-gradient(135deg,#1e293b 0%,#334155 50%,#0f172a 100%)" },
                    ];
                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium">Poster Background</label>
                          {photoEditUrl && (
                            <button type="button" onClick={() => setPhotoUsePoster(!photoUsePoster)}
                              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${photoUsePoster ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                              {photoUsePoster ? "BG On" : "BG Off"}
                            </button>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {POSTER_PRESETS.map(p => (
                            <button key={p.label} type="button" title={p.label}
                              onClick={() => { setPhotoPosterBg(p.value); setPhotoUsePoster(true); }}
                              className={`w-7 h-7 rounded-md border-2 transition-all hover:scale-110 ${photoPosterBg === p.value ? "border-primary ring-2 ring-primary/40" : "border-transparent"}`}
                              style={{ background: p.value }} />
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quick filter presets */}
                  {(() => {
                    const PHOTO_PRESETS = [
                      { label: "Original", b: 100, c: 100, s: 100, h: 0,   sep: 0,  g: 0,   bl: 0 },
                      { label: "Warm",     b: 108, c: 105, s: 115, h: 12,  sep: 20, g: 0,   bl: 0 },
                      { label: "Cool",     b: 100, c: 105, s: 85,  h: 200, sep: 0,  g: 0,   bl: 0 },
                      { label: "Vintage",  b: 95,  c: 88,  s: 78,  h: 0,   sep: 45, g: 0,   bl: 0 },
                      { label: "B & W",    b: 100, c: 115, s: 0,   h: 0,   sep: 0,  g: 100, bl: 0 },
                      { label: "Vivid",    b: 108, c: 130, s: 160, h: 0,   sep: 0,  g: 0,   bl: 0 },
                      { label: "Faded",    b: 115, c: 82,  s: 75,  h: 0,   sep: 12, g: 20,  bl: 0 },
                      { label: "Dramatic", b: 100, c: 155, s: 120, h: 0,   sep: 0,  g: 0,   bl: 0 },
                      { label: "Soft",     b: 115, c: 82,  s: 90,  h: 0,   sep: 0,  g: 0,   bl: 1 },
                      { label: "Sunset",   b: 108, c: 110, s: 130, h: 20,  sep: 15, g: 0,   bl: 0 },
                    ];
                    return (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Quick Presets</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {PHOTO_PRESETS.map(p => (
                            <button key={p.label} type="button"
                              onClick={() => { setPhotoEditBrightness(p.b); setPhotoEditContrast(p.c); setPhotoEditSaturate(p.s); setPhotoEditHue(p.h); setPhotoEditSepia(p.sep); setPhotoEditGrayscale(p.g); setPhotoEditBlur(p.bl); }}
                              className="px-2.5 py-1 rounded text-xs border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/50 transition-colors">
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Filter sliders */}
                  <div className="space-y-3">
                    {[
                      { label: "Brightness", value: photoEditBrightness, set: (v: number) => setPhotoEditBrightness(v), min: 0, max: 200, suffix: "%" },
                      { label: "Contrast",   value: photoEditContrast,   set: (v: number) => setPhotoEditContrast(v),   min: 0, max: 200, suffix: "%" },
                      { label: "Saturation", value: photoEditSaturate,   set: (v: number) => setPhotoEditSaturate(v),   min: 0, max: 200, suffix: "%" },
                      { label: "Hue Rotate", value: photoEditHue,        set: (v: number) => setPhotoEditHue(v),        min: 0, max: 360, suffix: "°" },
                      { label: "Sepia",      value: photoEditSepia,      set: (v: number) => setPhotoEditSepia(v),      min: 0, max: 100, suffix: "%" },
                      { label: "Grayscale",  value: photoEditGrayscale,  set: (v: number) => setPhotoEditGrayscale(v),  min: 0, max: 100, suffix: "%" },
                      { label: "Blur",       value: photoEditBlur,       set: (v: number) => setPhotoEditBlur(v),       min: 0, max: 20,  suffix: "px" },
                    ].map(ctrl => (
                      <div key={ctrl.label} className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-xs font-medium">{ctrl.label}</label>
                          <span className="text-xs text-muted-foreground">{ctrl.value}{ctrl.suffix}</span>
                        </div>
                        <SliderWithButtons min={ctrl.min} max={ctrl.max} step={1} value={[ctrl.value]} onValueChange={([v]) => ctrl.set(v)} />
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={resetPhotoFilters} className="gap-1.5 w-full">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                  </Button>
                </TabsContent>

                {/* ── TEXT & POSTER ── */}
                <TabsContent value="text" className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <textarea
                      placeholder="Your text here…"
                      value={photoTInput}
                      onChange={e => setPhotoTInput(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />

                    {/* Font family */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Font Family</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.keys(PHOTO_TEXT_FONTS).map(f => (
                          <button key={f} type="button" onClick={() => setPhotoTFont(f)}
                            className={`px-2.5 py-1 rounded text-xs border transition-colors ${photoTFont === f ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                            style={{ fontFamily: PHOTO_TEXT_FONTS[f] }}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-xs font-medium">Font Size</label>
                          <span className="text-xs text-muted-foreground">{photoTSize}px</span>
                        </div>
                        <SliderWithButtons min={18} max={300} step={2} value={[photoTSize]} onValueChange={([v]) => setPhotoTSize(v)} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-xs font-medium">Letter Spacing</label>
                          <span className="text-xs text-muted-foreground">{photoTLetterSpacing}px</span>
                        </div>
                        <SliderWithButtons min={-5} max={30} step={1} value={[photoTLetterSpacing]} onValueChange={([v]) => setPhotoTLetterSpacing(v)} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium">Text Color</label>
                      <div className="flex gap-1 items-center flex-wrap">
                        <input type="color" value={photoTColor} onChange={e => setPhotoTColor(e.target.value)}
                          className="h-7 w-9 rounded border border-input cursor-pointer flex-shrink-0" />
                        {["#ffffff","#000000","#ffd700","#f97316","#ef4444","#a78bfa"].map(c => (
                          <button key={c} type="button" onClick={() => setPhotoTColor(c)}
                            className={`w-5 h-5 rounded border-2 transition-all ${photoTColor === c ? "border-primary scale-110" : "border-transparent"}`}
                            style={{ background: c }} />
                        ))}
                      </div>
                    </div>

                    {/* Style toggles */}
                    <div className="flex gap-1.5 flex-wrap">
                      <button type="button" onClick={() => setPhotoTBold(!photoTBold)}
                        className={`px-3 py-1.5 rounded text-xs border font-bold transition-colors ${photoTBold ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>B</button>
                      <button type="button" onClick={() => setPhotoTItalic(!photoTItalic)}
                        className={`px-3 py-1.5 rounded text-xs border italic transition-colors ${photoTItalic ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>I</button>
                      <button type="button" onClick={() => setPhotoTUppercase(!photoTUppercase)}
                        className={`px-3 py-1.5 rounded text-xs border font-semibold tracking-wider transition-colors ${photoTUppercase ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>AA</button>
                      <button type="button" onClick={() => setPhotoTShadow(!photoTShadow)}
                        className={`px-3 py-1.5 rounded text-xs border transition-colors ${photoTShadow ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>Shadow</button>
                      {(["left","center","right"] as const).map(a => (
                        <button key={a} type="button" onClick={() => setPhotoTAlign(a)}
                          className={`px-3 py-1.5 rounded text-xs border transition-colors ${photoTAlign === a ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                          {a === "left" ? "←" : a === "right" ? "→" : "≡"}
                        </button>
                      ))}
                    </div>

                    {/* Stroke / Outline */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button type="button" onClick={() => setPhotoTStroke(!photoTStroke)}
                        className={`px-3 py-1 rounded text-xs border transition-colors ${photoTStroke ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                        Outline
                      </button>
                      {photoTStroke && (
                        <>
                          <span className="text-xs text-muted-foreground">Color:</span>
                          <input type="color" value={photoTStrokeColor} onChange={e => setPhotoTStrokeColor(e.target.value)}
                            className="h-7 w-9 rounded border border-input cursor-pointer" />
                        </>
                      )}
                      <button type="button" onClick={() => setPhotoTBgHighlight(!photoTBgHighlight)}
                        className={`px-3 py-1 rounded text-xs border transition-colors ${photoTBgHighlight ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                        Highlight
                      </button>
                      {photoTBgHighlight && (
                        <input type="color" value={photoTBgHighlightColor.startsWith("rgba") ? "#000000" : photoTBgHighlightColor}
                          onChange={e => setPhotoTBgHighlightColor(e.target.value)}
                          className="h-7 w-9 rounded border border-input cursor-pointer" />
                      )}
                    </div>

                    {/* Gradient text */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setPhotoTGradient(!photoTGradient)}
                          className={`px-3 py-1 rounded text-xs border transition-colors ${photoTGradient ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                          ✦ Gradient
                        </button>
                        {photoTGradient && <span className="text-xs text-muted-foreground">Pick two colors:</span>}
                      </div>
                      {photoTGradient && (
                        <div className="flex gap-2 items-center flex-wrap pl-1">
                          <input type="color" value={photoTGC1} onChange={e => setPhotoTGC1(e.target.value)} className="h-7 w-9 rounded border border-input cursor-pointer" />
                          <span className="text-muted-foreground text-xs">→</span>
                          <input type="color" value={photoTGC2} onChange={e => setPhotoTGC2(e.target.value)} className="h-7 w-9 rounded border border-input cursor-pointer" />
                          <div className="flex-1 h-5 rounded min-w-[40px]" style={{ background: `linear-gradient(to right,${photoTGC1},${photoTGC2})` }} />
                          {[["#fff","#f97316"],["#ffd700","#f97316"],["#a78bfa","#7c3aed"],["#38bdf8","#2563eb"],["#f9a8d4","#ec4899"],["#4ade80","#22c55e"]].map(([c1,c2]) => (
                            <button key={c1} type="button" onClick={() => { setPhotoTGC1(c1!); setPhotoTGC2(c2!); }}
                              className="w-7 h-5 rounded border border-transparent hover:border-primary transition-all"
                              style={{ background: `linear-gradient(to right,${c1},${c2})` }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Position picker */}
                    <div className="flex items-start gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Position</label>
                        <div className="grid grid-cols-3 gap-1 w-24">
                          {[
                            { label: "↖", px: 15, py: 22 }, { label: "↑", px: 50, py: 22 }, { label: "↗", px: 85, py: 22 },
                            { label: "←", px: 15, py: 50 }, { label: "●", px: 50, py: 50 }, { label: "→", px: 85, py: 50 },
                            { label: "↙", px: 15, py: 78 }, { label: "↓", px: 50, py: 78 }, { label: "↘", px: 85, py: 78 },
                          ].map(pos => (
                            <button key={pos.label} type="button"
                              onClick={() => { setPhotoTPx(pos.px); setPhotoTPy(pos.py); }}
                              className={`h-7 rounded text-xs border transition-colors ${photoTPx === pos.px && photoTPy === pos.py ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button size="sm" className="mt-5 flex-1 gap-1.5" onClick={() => {
                        if (!photoTInput.trim()) return;
                        setPhotoTexts(prev => [...prev, {
                          id: Date.now().toString(), text: photoTInput, size: photoTSize, color: photoTColor,
                          px: photoTPx, py: photoTPy, bold: photoTBold, italic: photoTItalic,
                          gradient: photoTGradient, gc1: photoTGC1, gc2: photoTGC2, shadow: photoTShadow, align: photoTAlign,
                          fontFamily: photoTFont, letterSpacing: photoTLetterSpacing,
                          stroke: photoTStroke, strokeColor: photoTStrokeColor,
                          bgHighlight: photoTBgHighlight, bgHighlightColor: photoTBgHighlightColor,
                          uppercase: photoTUppercase,
                        }]);
                      }}>
                        + Add Text Layer
                      </Button>
                    </div>
                  </div>

                  {/* Text layer list */}
                  {photoTexts.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">Text Layers ({photoTexts.length})</label>
                        <button type="button" onClick={() => setPhotoTexts([])} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">Clear all</button>
                      </div>
                      {photoTexts.map(t => (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/20">
                          <span className="flex-1 text-xs truncate"
                            style={{
                              fontWeight: t.bold ? "bold" : "normal", fontStyle: t.italic ? "italic" : "normal",
                              ...(t.gradient
                                ? { background: `linear-gradient(to right,${t.gc1},${t.gc2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
                                : { color: t.color }),
                            }}>
                            {t.text}
                          </span>
                          <button type="button" onClick={() => setPhotoTexts(prev => prev.filter(x => x.id !== t.id))}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── MERGE ── */}
                <TabsContent value="merge" className="mt-3 space-y-3">
                  {/* Layout toggle */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground shrink-0">Layout:</label>
                    {(["overlay","side-by-side"] as const).map(l => (
                      <button key={l} type="button" onClick={() => setPhotoMergeLayout(l)}
                        className={`px-3 py-1 rounded text-xs border transition-colors ${photoMergeLayout === l ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                        {l === "overlay" ? "Overlay" : "Side by Side"}
                      </button>
                    ))}
                  </div>

                  {!photoMergeUrl ? (
                    <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                      onClick={() => photoMergeRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        const f = e.dataTransfer.files[0];
                        if (!f || !f.type.startsWith("image/")) return;
                        const reader = new FileReader();
                        reader.onload = ev => setPhotoMergeUrl(ev.target?.result as string);
                        reader.readAsDataURL(f);
                      }}>
                      <Layers3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">{photoMergeLayout === "side-by-side" ? "Drop second image or click to browse" : "Drop overlay image or click to browse"}</p>
                    </div>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden border border-border h-24">
                      <img src={photoMergeUrl} alt="merge overlay" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setPhotoMergeUrl(null)}
                        className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1 hover:bg-black/80">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {photoMergeLayout === "side-by-side" && (
                    <div className="space-y-3">
                      {/* Split ratio */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-xs font-medium">Split</label>
                          <span className="text-xs text-muted-foreground">{photoSplitRatio}% / {100 - photoSplitRatio}%</span>
                        </div>
                        <SliderWithButtons min={10} max={90} step={5} value={[photoSplitRatio]} onValueChange={([v]) => setPhotoSplitRatio(v)} />
                      </div>
                      {/* Gap */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-xs font-medium">Gap</label>
                          <span className="text-xs text-muted-foreground">{photoSideBySideGap}%</span>
                        </div>
                        <SliderWithButtons min={0} max={10} step={1} value={[photoSideBySideGap]} onValueChange={([v]) => setPhotoSideBySideGap(v)} />
                      </div>
                      {/* Fit options */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Left Fit</label>
                          <div className="flex gap-1">
                            {(["cover","contain","fill"] as const).map(f => (
                              <button key={f} type="button" onClick={() => setPhotoLeftFit(f)}
                                className={`flex-1 py-1 rounded text-[10px] border transition-colors ${photoLeftFit === f ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Right Fit</label>
                          <div className="flex gap-1">
                            {(["cover","contain","fill"] as const).map(f => (
                              <button key={f} type="button" onClick={() => setPhotoRightFit(f)}
                                className={`flex-1 py-1 rounded text-[10px] border transition-colors ${photoRightFit === f ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {photoMergeLayout === "overlay" && (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-xs font-medium">Overlay Opacity</label>
                          <span className="text-xs text-muted-foreground">{photoMergeOpacity}%</span>
                        </div>
                        <SliderWithButtons min={0} max={100} step={5} value={[photoMergeOpacity]} onValueChange={([v]) => setPhotoMergeOpacity(v)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Blend Mode</label>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { value: "source-over", label: "Normal"     },
                            { value: "multiply",    label: "Multiply"   },
                            { value: "screen",      label: "Screen"     },
                            { value: "overlay",     label: "Overlay"    },
                            { value: "darken",      label: "Darken"     },
                            { value: "lighten",     label: "Lighten"    },
                            { value: "color-dodge", label: "Dodge"      },
                            { value: "color-burn",  label: "Burn"       },
                            { value: "hard-light",  label: "Hard Light" },
                            { value: "soft-light",  label: "Soft Light" },
                            { value: "difference",  label: "Difference" },
                            { value: "exclusion",   label: "Exclusion"  },
                            { value: "hue",         label: "Hue"        },
                            { value: "saturation",  label: "Saturation" },
                            { value: "color",       label: "Color"      },
                            { value: "luminosity",  label: "Luminosity" },
                          ].map(m => (
                            <button key={m.value} type="button" onClick={() => setPhotoMergeBlend(m.value)}
                              className={`py-1 rounded text-[10px] border transition-colors ${photoMergeBlend === m.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* ── REMOVE BG ── */}
                <TabsContent value="bg" className="mt-3 space-y-3">
                  <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 space-y-1.5">
                    <p className="text-sm font-medium">Background Removal</p>
                    <p className="text-xs text-muted-foreground">
                      Powered by <span className="font-medium">remove.bg</span> — get a free API key (50 images/month) at{" "}
                      <a href="https://www.remove.bg/api" target="_blank" rel="noopener noreferrer"
                        className="text-primary underline-offset-2 hover:underline">remove.bg/api</a>.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Your remove.bg API Key</label>
                    <Input type="password" placeholder="e.g. abc123xyz…"
                      value={removeBgKey} onChange={e => setRemoveBgKey(e.target.value)}
                      className="h-9 font-mono text-sm" />
                    <p className="text-[10px] text-muted-foreground">Stored locally on this device — only sent to remove.bg.</p>
                  </div>
                  <Button className="w-full gap-2"
                    disabled={!photoEditUrl || bgRemoving || !removeBgKey}
                    onClick={removeBackground}>
                    {bgRemoving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Removing background…</>
                      : <><EyeOff className="w-4 h-4" /> Remove Background</>}
                  </Button>
                  {!photoEditUrl && <p className="text-xs text-muted-foreground text-center">Load a photo first to remove its background.</p>}
                  {!removeBgKey && !!photoEditUrl && <p className="text-xs text-amber-500 text-center">Enter your API key above to enable this feature.</p>}
                </TabsContent>
              </Tabs>

              {/* ── Action buttons (always visible) ── */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                {/* Text visibility row */}
                {photoTexts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => setPhotoIncludeText(!photoIncludeText)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${photoIncludeText ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground"}`}>
                      {photoIncludeText ? "✓ Text included" : "✗ Text hidden"}
                    </button>
                    <button type="button" onClick={() => setPhotoTexts([])}
                      className="px-3 py-1.5 rounded text-xs border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors">
                      Clear all text
                    </button>
                    <span className="text-[10px] text-muted-foreground">{photoTexts.length} layer{photoTexts.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetPhotoFilters} className="gap-1.5 shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </Button>
                <Button variant="outline" size="sm" onClick={downloadEditedPhoto}
                  disabled={!photoEditUrl && !photoUsePoster} className="gap-1.5 shrink-0">
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
                <Button onClick={sendEditedPhotoToScreen}
                  disabled={!photoEditUrl && !photoUsePoster} className="flex-1 gap-1.5">
                  <Cast className="w-4 h-4" /> Send to Screen
                </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CAMERA & BROADCAST ── */}
        <TabsContent value="camera-broadcast" className="mt-4 space-y-6">

          {/* ── Camera Source Selection ── */}
          <Card>
            <CardHeader className="pb-0 pt-3 px-4">
              <button type="button" onClick={() => toggleCamSection("source")}
                aria-expanded={camSections.source}
                className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
                data-testid="button-cam-section-source">
                <CardTitle className="text-sm flex items-center gap-2"><Camera className="w-4 h-4" /> Camera Source <span className="text-[10px] font-normal text-muted-foreground capitalize">· {cameraSource}</span></CardTitle>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${camSections.source ? "rotate-180" : ""}`} />
              </button>
            </CardHeader>
            {camSections.source && (
            <CardContent className="space-y-4 pt-3">
              {/* Source type selector */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "device", label: "Device Camera", icon: <Camera className="w-4 h-4" /> },
                  { value: "screen", label: "Screen Capture", icon: <MonitorPlay className="w-4 h-4" /> },
                  { value: "ip",     label: "IP / Network",  icon: <Wifi className="w-4 h-4" /> },
                ] as const).map(src => (
                  <button key={src.value} type="button"
                    onClick={() => { setCameraSource(src.value); setCameraError(null); }}
                    className={`py-2.5 rounded-lg text-xs border transition-colors flex flex-col items-center gap-1.5 ${cameraSource === src.value ? "bg-primary/20 border-primary text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                    {src.icon}
                    {src.label}
                  </button>
                ))}
              </div>

              {/* Device camera: selector + controls */}
              {cameraSource === "device" && (
                <div className="space-y-4">
                  <div className="flex gap-2 items-center">
                    <Select value={selectedCameraId} onValueChange={switchCamera}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder={cameras.length === 0 ? "No cameras found — click Refresh" : "Select camera…"} />
                      </SelectTrigger>
                      <SelectContent>
                        {cameras.map((c, i) => (
                          <SelectItem key={c.deviceId || `cam-${i}`} value={c.deviceId || `cam-${i}`} className="text-xs">
                            {c.label || `Camera ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={enumerateCameras} title="Refresh camera list" className="h-8 w-8 p-0 shrink-0">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-2">
                    All video input devices appear here — webcams, HDMI capture cards, OBS Virtual Camera, Continuity Camera (iPhone), and more.
                  </p>
                </div>
              )}

              {/* Screen capture controls */}
              {cameraSource === "screen" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                    Capture any window or your entire screen. The browser will ask you to choose what to share.
                    Use "Send to Screen" to show it on the presentation display.
                  </p>
                  {!cameraStream ? (
                    <Button onClick={startScreenCapture} className="w-full gap-2">
                      <MonitorPlay className="w-4 h-4" /> Start Screen Capture
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={stopCamera} className="w-full gap-2">
                      <Square className="w-4 h-4" /> Stop Capture
                    </Button>
                  )}
                </div>
              )}

              {/* IP / Network camera */}
              {cameraSource === "ip" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                    Enter an HLS (.m3u8), MJPEG, or HTTP stream URL from an IP camera, NDI, or live encoder.
                    The stream is sent directly to the presentation screen as a video background.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="http://192.168.1.100/stream.m3u8"
                      value={ipCameraUrl}
                      onChange={e => setIpCameraUrl(e.target.value)}
                      className="flex-1 text-xs"
                    />
                  </div>
                  {ipCameraUrl && (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                      <video
                        ref={ipVideoRef}
                        src={ipCameraUrl}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <Button onClick={sendIpCameraToScreen} disabled={!ipCameraUrl} className="w-full gap-2">
                    <Cast className="w-4 h-4" /> Send IP Camera to Screen
                  </Button>
                </div>
              )}
            </CardContent>
            )}
          </Card>

          {/* ── Camera Preview + Controls ── */}
          {cameraSource !== "ip" && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {cameraSource === "screen" ? <MonitorPlay className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    {cameraSource === "screen" ? "Screen Capture Preview" : "Live Camera Preview"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border flex items-center justify-center relative">
                    {cameraStream
                      ? <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                          style={{
                            transform: camMirror ? "scaleX(-1)" : undefined,
                            filter: `brightness(${camBrightness}%) contrast(${camContrast}%) saturate(${camSaturate}%)`,
                          }}
                        />
                      : <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <CameraOff className="w-10 h-10" />
                          <span className="text-sm">
                            {cameraSource === "screen" ? "No screen capture active" : "Camera not started"}
                          </span>
                        </div>
                    }
                    {cameraStream && (
                      <div className="absolute top-2 left-2">
                        <Badge className="text-[10px] py-0 h-4 bg-red-600 border-0 flex items-center gap-1">
                          <Circle className="w-2 h-2 fill-current animate-pulse" /> LIVE
                        </Badge>
                      </div>
                    )}
                  </div>

                  {cameraError && <p className="text-destructive text-sm">{cameraError}</p>}

                  <div className="flex gap-2 flex-wrap">
                    {cameraSource === "device" && (
                      !cameraStream
                        ? <Button onClick={() => startCamera(selectedCameraId || undefined)} className="flex-1 gap-2">
                            <Play className="w-4 h-4" /> Start Camera
                          </Button>
                        : <Button variant="outline" onClick={stopCamera} className="flex-1 gap-2">
                            <Square className="w-4 h-4" /> Stop
                          </Button>
                    )}
                    <Button onClick={sendCameraToScreen} disabled={!cameraStream} className="flex-1 gap-2">
                      <Cast className="w-4 h-4" /> Send to Screen
                    </Button>
                    <Button variant="destructive" onClick={cutFeed} title="Stop camera and black the screen" className="gap-2 shrink-0">
                      <Scissors className="w-4 h-4" /> Cut
                    </Button>
                  </div>

                  {/* ── Inline Record & Broadcast ── */}
                  <div className="pt-3 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                        Record &amp; Broadcast
                      </div>
                      {recState === "recording" && (
                        <div className="flex items-center gap-1 text-xs font-medium text-red-400">
                          <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
                          {String(Math.floor(recDuration / 60)).padStart(2, "0")}:{String(recDuration % 60).padStart(2, "0")}
                        </div>
                      )}
                    </div>

                    {recState === "idle" ? (
                      <Button size="sm" onClick={startRecording} className="w-full gap-2 h-8 text-xs">
                        <Circle className="w-3 h-3 fill-red-500 text-red-500" /> Start Recording
                      </Button>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-red-500/10 border border-red-500/30">
                          <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse shrink-0" />
                          <span className="text-xs font-medium text-red-400 flex-1">Recording</span>
                          <span className="text-xs font-mono text-red-400 tabular-nums">
                            {String(Math.floor(recDuration / 60)).padStart(2, "0")}:{String(recDuration % 60).padStart(2, "0")}
                          </span>
                        </div>
                        <Button size="sm" variant="destructive" onClick={stopRecording} className="w-full gap-2 h-8 text-xs">
                          <StopCircle className="w-3.5 h-3.5" /> Stop Recording
                        </Button>
                      </div>
                    )}

                    {recDownloadUrl && (
                      <div className="flex items-center gap-1.5">
                        <a href={recDownloadUrl} download={`worship-${new Date().toISOString().slice(0,10)}.webm`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full gap-2 h-8 text-xs">
                            <Download className="w-3.5 h-3.5" /> Download Recording
                          </Button>
                        </a>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={clearDownload} title="Discard">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] text-muted-foreground">Include mic audio</p>
                      <Switch checked={recIncludeMic} onCheckedChange={setRecIncludeMic} disabled={recState === "recording"} className="scale-75 origin-right" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {/* Camera Layout */}
                <Card>
                  <CardHeader className="pb-0 pt-3 px-4">
                    <button type="button" onClick={() => toggleCamSection("layout")}
                      aria-expanded={camSections.layout}
                      className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
                      data-testid="button-cam-section-layout">
                      <CardTitle className="text-sm flex items-center gap-2"><Layers3 className="w-4 h-4" /> Camera Layout <span className="text-[10px] font-normal text-muted-foreground">· {camLayout}</span></CardTitle>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${camSections.layout ? "rotate-180" : ""}`} />
                    </button>
                  </CardHeader>
                  {camSections.layout && (
                  <CardContent className="space-y-4 pt-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Display Mode</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          { value: "fullscreen",       label: "Fullscreen" },
                          { value: "dual",             label: "⊟ 2-Cam Side" },
                          { value: "quad",             label: "⊞ 4-Cam Quad" },
                          { value: "pip-topright",     label: "PiP Top-Right" },
                          { value: "pip-topleft",      label: "PiP Top-Left" },
                          { value: "pip-bottomright",  label: "PiP Bottom-Right" },
                          { value: "pip-bottomleft",   label: "PiP Bottom-Left" },
                          { value: "side-left",        label: "Side-by-Side Left" },
                          { value: "side-right",       label: "Side-by-Side Right" },
                        ] as const).map(opt => (
                          <button key={opt.value} onClick={() => setCamLayout(opt.value)}
                            className={`py-1.5 rounded text-xs border transition-colors ${camLayout === opt.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Multi-cam slot pickers (dual or quad) */}
                      {(camLayout === "quad" || camLayout === "dual") && (
                        <div className="pt-2 border-t border-border/50 space-y-2">
                          <label className="text-sm font-medium">
                            {camLayout === "dual" ? "Camera Slots (1×2)" : "Camera Slots (2×2 Grid)"}
                          </label>
                          {(camLayout === "dual" ? [0, 1] : [0, 1, 2, 3]).map(i => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-12 shrink-0">Slot {i + 1}</span>
                              <select
                                value={quadSlots[i]}
                                onChange={e => {
                                  const n = [...quadSlots] as [string,string,string,string];
                                  n[i] = e.target.value;
                                  setQuadSlots(n);
                                }}
                                className="flex-1 h-8 rounded border border-input bg-background text-xs px-2 text-foreground"
                              >
                                <option value="">— None —</option>
                                <option value="__screen__">🖥 Screen Capture</option>
                                {cameras.map((d: MediaDeviceInfo) => (
                                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</option>
                                ))}
                              </select>
                              {quadSlots[i] === "__screen__" && (
                                <Button size="sm" variant="outline" className="shrink-0 h-8 px-2 gap-1 text-xs"
                                  title="Request screen capture for this slot on the broadcast window"
                                  onClick={() => {
                                    const ch = new BroadcastChannel("wf-broadcast-cmd");
                                    ch.postMessage({ type: "req-screen-capture", slot: i });
                                    ch.close();
                                    toast({ title: `Capture requested — Slot ${i + 1}`, description: "Click the prompt on the broadcast window to pick a screen." });
                                  }}>
                                  <MonitorPlay className="w-3.5 h-3.5" /> Capture
                                </Button>
                              )}
                            </div>
                          ))}
                          {cameras.length === 0 && (
                            <p className="text-[11px] text-muted-foreground">Grant camera access to see device list.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {isPip && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">PiP Shape</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {([
                              { value: "rect",    label: "Rectangle" },
                              { value: "rounded", label: "Rounded" },
                              { value: "circle",  label: "Circle" },
                            ] as const).map(opt => (
                              <button key={opt.value} onClick={() => setCamShape(opt.value)}
                                className={`py-1.5 rounded text-xs border transition-colors ${camShape === opt.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <label className="text-sm font-medium">PiP Size</label>
                            <span className="text-xs text-muted-foreground">{camPipSize}% of width</span>
                          </div>
                          <SliderWithButtons min={15} max={55} step={5} value={[camPipSize]} onValueChange={([v]) => setCamPipSize(v)} />
                        </div>
                      </>
                    )}

                    {(isSide || isPip) && (() => {
                      const presets: { label: string; value: string }[] = [
                        { label: "Indigo",   value: "linear-gradient(135deg,#1e1b4b 0%,#0f0a2e 100%)" },
                        { label: "Slate",    value: "linear-gradient(135deg,#1e293b 0%,#0f172a 100%)" },
                        { label: "Plum",     value: "linear-gradient(135deg,#3b0764 0%,#1e0533 100%)" },
                        { label: "Forest",   value: "linear-gradient(135deg,#064e3b 0%,#022c22 100%)" },
                        { label: "Crimson",  value: "linear-gradient(135deg,#7f1d1d 0%,#3b0a0a 100%)" },
                        { label: "Royal",    value: "linear-gradient(135deg,#1e3a8a 0%,#0c1f57 100%)" },
                        { label: "Sunset",   value: "linear-gradient(135deg,#c2410c 0%,#7c2d12 100%)" },
                        { label: "Teal",     value: "linear-gradient(135deg,#115e59 0%,#042f2e 100%)" },
                        { label: "Black",    value: "#000000" },
                        { label: "Charcoal", value: "#0a0a0a" },
                        { label: "Stone",    value: "#1c1917" },
                        { label: "White",    value: "#ffffff" },
                      ];
                      return (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <label className="text-sm font-medium">Camera Backdrop</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {presets.map(p => (
                              <button key={p.label} type="button" data-testid={`button-cam-side-bg-${p.label.toLowerCase()}`}
                                onClick={() => setCamSideBg(p.value)}
                                className={`h-9 rounded border transition-colors flex items-center justify-center ${camSideBg === p.value ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40"}`}
                                style={{ background: p.value }}>
                                <span className="text-[10px] font-medium" style={{ color: p.value === "#ffffff" ? "#000" : "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{p.label}</span>
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input type="color"
                              value={camSideBg.startsWith("#") ? camSideBg : "#1e1b4b"}
                              onChange={e => setCamSideBg(e.target.value)}
                              className="h-8 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5 shrink-0" />
                            <Input className="h-8 text-[11px] font-mono" value={camSideBg}
                              onChange={e => setCamSideBg(e.target.value)}
                              placeholder="#000 or linear-gradient(...)"
                              data-testid="input-cam-side-bg" />
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                  )}
                </Card>

                {/* Camera Adjustments */}
                <Card>
                  <CardHeader className="pb-0 pt-3 px-4">
                    <button type="button" onClick={() => toggleCamSection("adjust")}
                      aria-expanded={camSections.adjust}
                      className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
                      data-testid="button-cam-section-adjust">
                      <CardTitle className="text-sm flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Camera Adjustments
                        {(camBrightness !== 100 || camContrast !== 100 || camSaturate !== 100 || camMirror || camBorderWidth > 0) && (
                          <span className="text-[10px] font-normal text-amber-400">· customised</span>
                        )}
                      </CardTitle>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${camSections.adjust ? "rotate-180" : ""}`} />
                    </button>
                  </CardHeader>
                  {camSections.adjust && (
                  <CardContent className="space-y-4 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FlipHorizontal className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Mirror / Flip</p>
                          <p className="text-[11px] text-muted-foreground">Flip the camera horizontally</p>
                        </div>
                      </div>
                      <Switch checked={camMirror} onCheckedChange={setCamMirror} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium">Brightness</label>
                        <span className="text-xs text-muted-foreground">{camBrightness}%</span>
                      </div>
                      <SliderWithButtons min={50} max={200} step={5} value={[camBrightness]} onValueChange={([v]) => setCamBrightness(v)} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium">Contrast</label>
                        <span className="text-xs text-muted-foreground">{camContrast}%</span>
                      </div>
                      <SliderWithButtons min={50} max={200} step={5} value={[camContrast]} onValueChange={([v]) => setCamContrast(v)} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium">Saturation</label>
                        <span className="text-xs text-muted-foreground">{camSaturate}%</span>
                      </div>
                      <SliderWithButtons min={0} max={200} step={5} value={[camSaturate]} onValueChange={([v]) => setCamSaturate(v)} />
                    </div>

                    {(camBrightness !== 100 || camContrast !== 100 || camSaturate !== 100 || camMirror) && (
                      <Button size="sm" variant="outline" className="w-full gap-2"
                        onClick={() => { setCamBrightness(100); setCamContrast(100); setCamSaturate(100); setCamMirror(false); }}>
                        <RotateCcw className="w-3.5 h-3.5" /> Reset Adjustments
                      </Button>
                    )}

                    {/* Camera Border */}
                    <div className="pt-2 border-t border-border/50 space-y-3">
                      <label className="text-sm font-medium">Border</label>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <label className="text-xs text-muted-foreground">Border Width</label>
                          <span className="text-xs text-muted-foreground">{camBorderWidth}px</span>
                        </div>
                        <SliderWithButtons min={0} max={16} step={1} value={[camBorderWidth]} onValueChange={([v]) => setCamBorderWidth(v)} />
                      </div>
                      {camBorderWidth > 0 && (
                        <div className="flex items-center gap-2">
                          <input type="color" value={camBorderColor} onChange={e => setCamBorderColor(e.target.value)}
                            className="h-8 w-10 rounded border border-input bg-transparent p-0.5 cursor-pointer shrink-0" />
                          <Input className="h-8 text-xs font-mono" value={camBorderColor}
                            onChange={e => setCamBorderColor(e.target.value)} />
                        </div>
                      )}
                      {camBorderWidth > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {["#ffffff", "#000000", "#fbbf24", "#ef4444", "#3b82f6", "#22c55e"].map(c => (
                            <button key={c} onClick={() => setCamBorderColor(c)}
                              className={`w-6 h-6 rounded-full border-2 transition-all ${camBorderColor === c ? "border-primary scale-110" : "border-transparent"}`}
                              style={{ backgroundColor: c }} title={c} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Filter presets */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <label className="text-sm font-medium">Filter Presets</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([
                          { label: "Natural",    b: 100, c: 100, s: 100 },
                          { label: "Vivid",      b: 110, c: 115, s: 140 },
                          { label: "Warm",       b: 105, c: 105, s: 120 },
                          { label: "Cool",       b: 100, c: 100, s:  80 },
                          { label: "Cinematic",  b:  90, c: 130, s:  70 },
                          { label: "B&W",        b: 100, c: 110, s:   0 },
                        ]).map(p => (
                          <button key={p.label} type="button"
                            onClick={() => { setCamBrightness(p.b); setCamContrast(p.c); setCamSaturate(p.s); }}
                            className="py-1.5 rounded text-xs border border-border text-muted-foreground hover:bg-muted/40 transition-colors">
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ── Cast to Display ── */}
          <CastToDisplayCard />

          {/* ── Live Captions (AI / Web Speech) ── */}
          <LiveCaptionsCard />

          {/* ── Stream Destinations (YouTube / Facebook / Twitch / RTMP) ── */}
          <StreamDestinationsCard />

          {/* ── Broadcast Output (merged from former Broadcast tab) ── */}
          <div className="pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setBroadcastOpen(o => !o)}
              className="w-full flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity text-left group"
            >
              <MonitorSpeaker className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-xl font-semibold flex-1">Broadcast Output</h2>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${broadcastOpen ? "rotate-180" : ""}`} />
            </button>
            {broadcastOpen && <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MonitorSpeaker className="w-4 h-4" /> Display Selection</CardTitle>
                  <CardDescription>Choose which screen to open the broadcast window on</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isWindowManagementSupported ? (
                    <>
                      <Button variant="outline" className="w-full gap-2" onClick={detectScreens} disabled={permissionState === "requesting"}>
                        {permissionState === "requesting" ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting…</> : <><Monitor className="w-4 h-4" /> Detect Connected Displays</>}
                      </Button>
                      {permissionState === "denied" && <p className="text-destructive text-sm">Permission denied.</p>}
                      {screens.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">{screens.length} display{screens.length > 1 ? "s" : ""} found</p>
                          {screens.map((s: ScreenInfo, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                              <div className="flex items-center gap-3">
                                <Monitor className="w-5 h-5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{s.label}</p>
                                  <p className="text-xs text-muted-foreground">{s.width}×{s.height}{s.isPrimary ? " · Primary" : ""}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {s.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => openBroadcast(s)}>
                                  Open <ChevronRight className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {screens.length === 0 && permissionState === "granted" && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                          Only one display detected.
                        </div>
                      )}
                    </>
                  ) : (
                    <Button className="w-full gap-2" onClick={() => openBroadcast()}>
                      <MonitorSpeaker className="w-4 h-4" /> Open Broadcast Window
                    </Button>
                  )}
                  {screens.length > 0 && (
                    <Button className="w-full gap-2 mt-2" onClick={() => openBroadcast()}>
                      <MonitorSpeaker className="w-4 h-4" /> Open (let browser choose)
                    </Button>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Window Behaviour</CardTitle>
                    <CardDescription>Saved and applied when opening broadcast</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {[
                      { icon: <Maximize2 className="w-4 h-4" />, label: "Auto-fullscreen", desc: "Enter fullscreen when broadcast opens", key: "autoFullscreen" as const },
                      { icon: <EyeOff className="w-4 h-4" />, label: "Hide cursor", desc: "Hide mouse pointer on broadcast window", key: "hideCursor" as const },
                      { icon: <RotateCcw className="w-4 h-4" />, label: "Loop video", desc: "Loop video backgrounds automatically", key: "loopVideo" as const },
                    ].map(row => (
                      <div key={row.key} className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-muted-foreground">{row.icon}</div>
                          <div>
                            <p className="text-sm font-medium">{row.label}</p>
                            <p className="text-xs text-muted-foreground">{row.desc}</p>
                          </div>
                        </div>
                        <Switch checked={settings[row.key]} onCheckedChange={v => updateSettings({ [row.key]: v })} className="shrink-0 mt-0.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PictureInPicture2 className="w-4 h-4" /> Picture-in-Picture</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>Open the broadcast window, then hover at the top to reveal the control bar and click the PiP button.</p>
                    <ul className="text-xs list-disc list-inside space-y-1">
                      <li><strong className="text-foreground">Video/Camera</strong> — native video PiP (any browser)</li>
                      <li><strong className="text-foreground">Other</strong> — Document PiP (Chrome 116+)</li>
                    </ul>
                  </CardContent>
                </Card>

              </div>
            </div>}
          </div>

          {/* ── Live Studio ── */}
          <div className="pt-4 border-t border-border">
            <LiveStudioPanel />
          </div>

        </TabsContent>

        {/* ── URL ── */}
        {/* ── Icons & Flags ── */}
        <TabsContent value="icons" className="mt-4 space-y-4">
          {(() => {
            const ICON_PRESETS: { label: string; url: string; tags: string[] }[] = [
              { label: "Cross",        url: "https://api.iconify.design/mdi/cross.svg?color=%23ffffff",        tags: ["cross","christ","christian","worship"] },
              { label: "Cross Celtic", url: "https://api.iconify.design/game-icons/celtic-cross.svg?color=%23ffffff", tags: ["cross","celtic"] },
              { label: "Church",       url: "https://api.iconify.design/mdi/church.svg?color=%23ffffff",       tags: ["church","building"] },
              { label: "Bible",        url: "https://api.iconify.design/mdi/bible.svg?color=%23ffffff",        tags: ["bible","scripture","book"] },
              { label: "Praying Hands",url: "https://api.iconify.design/mdi/hands-pray.svg?color=%23ffffff",   tags: ["pray","prayer","hands"] },
              { label: "Dove",         url: "https://api.iconify.design/game-icons/dove.svg?color=%23ffffff",  tags: ["dove","spirit","peace"] },
              { label: "Crown",        url: "https://api.iconify.design/mdi/crown.svg?color=%23ffd700",        tags: ["crown","king","royal"] },
              { label: "Heart",        url: "https://api.iconify.design/mdi/heart.svg?color=%23ef4444",        tags: ["heart","love"] },
              { label: "Star",         url: "https://api.iconify.design/mdi/star.svg?color=%23facc15",         tags: ["star","shine"] },
              { label: "Star of David",url: "https://api.iconify.design/mdi/star-david.svg?color=%23facc15",   tags: ["star","david","jewish","israel"] },
              { label: "Flame",        url: "https://api.iconify.design/mdi/fire.svg?color=%23f97316",         tags: ["flame","fire","spirit"] },
              { label: "Sun",          url: "https://api.iconify.design/mdi/white-balance-sunny.svg?color=%23facc15", tags: ["sun","light","day"] },
              { label: "Music Note",   url: "https://api.iconify.design/mdi/music-note.svg?color=%23ffffff",   tags: ["music","note","song","worship"] },
              { label: "Microphone",   url: "https://api.iconify.design/mdi/microphone.svg?color=%23ffffff",   tags: ["mic","microphone","preach","speak"] },
              { label: "Hands Up",     url: "https://api.iconify.design/game-icons/praying.svg?color=%23ffffff", tags: ["hands","praise","worship"] },
              { label: "Olive Branch", url: "https://api.iconify.design/game-icons/olive-branch.svg?color=%2386efac", tags: ["olive","peace","branch"] },
              { label: "Anchor",       url: "https://api.iconify.design/mdi/anchor.svg?color=%23ffffff",       tags: ["anchor","hope"] },
              { label: "Lamb",         url: "https://api.iconify.design/game-icons/sheep.svg?color=%23ffffff", tags: ["lamb","sheep","christ"] },
              { label: "Lion",         url: "https://api.iconify.design/game-icons/lion.svg?color=%23facc15",  tags: ["lion","judah","king"] },
              { label: "Bread & Cup",  url: "https://api.iconify.design/mdi/bread-slice.svg?color=%23ffffff",  tags: ["bread","communion","cup"] },
              { label: "Globe",        url: "https://api.iconify.design/mdi/earth.svg?color=%23ffffff",        tags: ["globe","earth","world","missions"] },
              { label: "Hand of God",  url: "https://api.iconify.design/game-icons/hand.svg?color=%23ffffff",  tags: ["hand","god"] },
              { label: "Trumpet",      url: "https://api.iconify.design/mdi/bugle.svg?color=%23ffd700",        tags: ["trumpet","horn","sound"] },
              { label: "Candle",       url: "https://api.iconify.design/mdi/candle.svg?color=%23facc15",       tags: ["candle","light"] },
              { label: "Fish (Ichthys)",url: "https://api.iconify.design/mdi/fish.svg?color=%23ffffff",          tags: ["fish","ichthys","christian","symbol"] },
              { label: "Keys",          url: "https://api.iconify.design/mdi/key-variant.svg?color=%23ffd700",  tags: ["keys","kingdom","authority","peter"] },
              { label: "Shield",        url: "https://api.iconify.design/mdi/shield.svg?color=%234f86f7",       tags: ["shield","armor","faith","protection"] },
              { label: "Scroll",        url: "https://api.iconify.design/mdi/scroll-text.svg?color=%23ffd700",  tags: ["scroll","scripture","word","Torah"] },
              { label: "Water",         url: "https://api.iconify.design/mdi/water.svg?color=%2338bdf8",        tags: ["water","baptism","river","holy"] },
              { label: "Rainbow",       url: "https://api.iconify.design/mdi/rainbow.svg?color=%23ffffff",      tags: ["rainbow","promise","covenant","noah"] },
              { label: "Mountain",      url: "https://api.iconify.design/mdi/mountain-outline.svg?color=%23ffffff", tags: ["mountain","high","holy","transfiguration"] },
              { label: "Tree of Life",  url: "https://api.iconify.design/mdi/tree.svg?color=%2386efac",         tags: ["tree","life","garden","eden"] },
              { label: "Bell",          url: "https://api.iconify.design/mdi/bell.svg?color=%23ffd700",         tags: ["bell","call","summon","church"] },
              { label: "Book Open",     url: "https://api.iconify.design/mdi/book-open-variant.svg?color=%23ffffff", tags: ["book","bible","open","read","scripture"] },
              { label: "Door",          url: "https://api.iconify.design/mdi/door-open.svg?color=%23fbbf24",    tags: ["door","enter","salvation","way"] },
              { label: "Cloud",         url: "https://api.iconify.design/mdi/cloud.svg?color=%23e2e8f0",        tags: ["cloud","heaven","sky","rapture"] },
              { label: "Butterfly",     url: "https://api.iconify.design/mdi/butterfly-outline.svg?color=%23a78bfa", tags: ["butterfly","resurrection","new life","transformation"] },
              { label: "Flower",        url: "https://api.iconify.design/mdi/flower.svg?color=%23f9a8d4",       tags: ["flower","rose","beauty","creation"] },
              { label: "Gift",          url: "https://api.iconify.design/mdi/gift-outline.svg?color=%23f97316", tags: ["gift","talents","grace","giving"] },
              { label: "Healing Cross", url: "https://api.iconify.design/mdi/hospital-box.svg?color=%23ef4444", tags: ["healing","cross","health","miracle"] },
              { label: "Map Marker",    url: "https://api.iconify.design/mdi/map-marker.svg?color=%23ef4444",   tags: ["map","missions","place","location"] },
              { label: "Baby",          url: "https://api.iconify.design/mdi/baby.svg?color=%23ffffff",         tags: ["baby","birth","infant","dedication","child"] },
              { label: "Ring",          url: "https://api.iconify.design/mdi/ring.svg?color=%23ffd700",         tags: ["ring","wedding","marriage","covenant"] },
              { label: "Calendar",      url: "https://api.iconify.design/mdi/calendar.svg?color=%23ffffff",     tags: ["calendar","sabbath","date","schedule"] },
              { label: "Hourglass",     url: "https://api.iconify.design/mdi/timer-sand.svg?color=%23facc15",   tags: ["hourglass","time","eternity","wait"] },
              { label: "Lighthouse",    url: "https://api.iconify.design/mdi/lighthouse.svg?color=%23ffffff",   tags: ["lighthouse","light","guide","beacon"] },
              { label: "Alpha-Omega",   url: "https://api.iconify.design/mdi/infinity.svg?color=%23a78bfa",     tags: ["alpha","omega","eternal","infinite","god"] },
            ];

            const FLAG_PRESETS: { label: string; code: string }[] = [
              { label: "Australia",       code: "au" },
              { label: "Zimbabwe",        code: "zw" },
              { label: "United States",   code: "us" },
              { label: "United Kingdom",  code: "gb" },
              { label: "Canada",          code: "ca" },
              { label: "New Zealand",     code: "nz" },
              { label: "Ireland",         code: "ie" },
              { label: "South Africa",    code: "za" },
              { label: "Kenya",           code: "ke" },
              { label: "Uganda",          code: "ug" },
              { label: "Tanzania",        code: "tz" },
              { label: "Nigeria",         code: "ng" },
              { label: "Ghana",           code: "gh" },
              { label: "Ethiopia",        code: "et" },
              { label: "Rwanda",          code: "rw" },
              { label: "Botswana",        code: "bw" },
              { label: "Zambia",          code: "zm" },
              { label: "Malawi",          code: "mw" },
              { label: "Mozambique",      code: "mz" },
              { label: "Namibia",         code: "na" },
              { label: "Brazil",          code: "br" },
              { label: "Mexico",          code: "mx" },
              { label: "Argentina",       code: "ar" },
              { label: "Colombia",        code: "co" },
              { label: "Germany",         code: "de" },
              { label: "France",          code: "fr" },
              { label: "Spain",           code: "es" },
              { label: "Italy",           code: "it" },
              { label: "Netherlands",     code: "nl" },
              { label: "Sweden",          code: "se" },
              { label: "Norway",          code: "no" },
              { label: "India",           code: "in" },
              { label: "Philippines",     code: "ph" },
              { label: "Indonesia",       code: "id" },
              { label: "South Korea",     code: "kr" },
              { label: "Japan",           code: "jp" },
              { label: "China",           code: "cn" },
              { label: "Israel",          code: "il" },
              { label: "Egypt",           code: "eg" },
              { label: "United Arab Emirates", code: "ae" },
              { label: "DR Congo",           code: "cd" },
              { label: "Republic of Congo",  code: "cg" },
              { label: "Angola",             code: "ao" },
              { label: "Cameroon",           code: "cm" },
              { label: "Ivory Coast",        code: "ci" },
              { label: "Senegal",            code: "sn" },
              { label: "Morocco",            code: "ma" },
              { label: "Algeria",            code: "dz" },
              { label: "Tunisia",            code: "tn" },
              { label: "Somalia",            code: "so" },
              { label: "South Sudan",        code: "ss" },
              { label: "Lesotho",            code: "ls" },
              { label: "Eswatini",           code: "sz" },
              { label: "Madagascar",         code: "mg" },
              { label: "Mauritius",          code: "mu" },
              { label: "Sierra Leone",       code: "sl" },
              { label: "Liberia",            code: "lr" },
              { label: "Pakistan",           code: "pk" },
              { label: "Malaysia",           code: "my" },
              { label: "Singapore",          code: "sg" },
              { label: "Sri Lanka",          code: "lk" },
              { label: "Portugal",           code: "pt" },
              { label: "Greece",             code: "gr" },
              { label: "Poland",             code: "pl" },
              { label: "Ukraine",            code: "ua" },
              { label: "Jamaica",            code: "jm" },
              { label: "Haiti",              code: "ht" },
              { label: "Papua New Guinea",   code: "pg" },
              { label: "Fiji",               code: "fj" },
            ];

            const flagUrl     = (code: string) => `https://flagcdn.com/w320/${code}.png`;
            const flagHiResUrl = (code: string) => `https://flagcdn.com/w1280/${code}.png`;

            const q = iconSearch.trim().toLowerCase();
            const filteredIcons = q
              ? ICON_PRESETS.filter(p => p.label.toLowerCase().includes(q) || p.tags.some(t => t.includes(q)))
              : ICON_PRESETS;
            const filteredFlags = q
              ? FLAG_PRESETS.filter(p => p.label.toLowerCase().includes(q) || p.code.includes(q))
              : FLAG_PRESETS;

            const sendAsLogo = (url: string) => {
              setLogoUrlDraft(url);
              setLogoUrlInput(url);
              updateOverlay({ logoOverlayEnabled: true, logoUrl: url });
              toast({ title: "Sent to presentation screen", description: "Showing as logo overlay. Tweak position/size in Overlays → Logo Overlay." });
            };
            const sendAsBackground = (url: string) => {
              // Upgrade flagcdn URLs to high-resolution for fullscreen background use
              const hiRes = url.includes("flagcdn.com") ? url.replace(/\/w\d+\//, "/w1280/") : url;
              sendImageToScreen(hiRes, "contain");
              toast({ title: "Sent to presentation screen", description: "Showing as fullscreen background." });
            };
            const apply = (url: string) => {
              if (iconSendMode === "background") sendAsBackground(url);
              else sendAsLogo(url);
            };

            return (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="w-4 h-4" /> Icons & Country Flags
                      </CardTitle>
                      {screenState?.logoOverlayEnabled && <Badge className="text-[10px] py-0 h-4 bg-green-600 border-0">LIVE</Badge>}
                    </div>
                    <CardDescription>
                      Click any icon or flag to set it as the logo overlay and show it on screen instantly.
                      Use the <span className="font-medium">Overlays → Logo Overlay</span> card to adjust position, size, shape, and opacity.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Send-mode selector + search */}
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">When clicked, send to presentation screen as:</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            data-testid="button-send-mode-logo"
                            onClick={() => setIconSendMode("logo")}
                            className={`py-2 rounded text-xs border transition-colors flex items-center justify-center gap-1.5 ${iconSendMode === "logo" ? "bg-primary/20 border-primary text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Logo Overlay
                          </button>
                          <button
                            type="button"
                            data-testid="button-send-mode-background"
                            onClick={() => setIconSendMode("background")}
                            className={`py-2 rounded text-xs border transition-colors flex items-center justify-center gap-1.5 ${iconSendMode === "background" ? "bg-primary/20 border-primary text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                          >
                            <Maximize2 className="w-3.5 h-3.5" /> Fullscreen Background
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {iconSendMode === "logo"
                            ? "Small image overlay in the corner — content/verse remains visible behind it."
                            : "Replaces the current screen with the icon/flag at full size (centered, kept-aspect)."}
                        </p>
                      </div>
                      <Input
                        data-testid="input-icon-search"
                        placeholder="Search icons or flags (e.g. cross, dove, australia, zw)…"
                        value={iconSearch}
                        onChange={e => setIconSearch(e.target.value)}
                        className="h-9"
                        aria-label="Search icons and flags"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> Icons <span className="text-xs font-normal text-muted-foreground">({filteredIcons.length})</span></h3>
                      </div>
                      {filteredIcons.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No icons match "{q}".</p>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                          {filteredIcons.map(p => (
                            <button
                              key={p.label}
                              type="button"
                              data-testid={`button-icon-${p.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                              title={p.label}
                              onClick={() => apply(p.url)}
                              className={`group aspect-square rounded-lg border transition-all flex flex-col items-center justify-center gap-1 p-1.5 bg-muted/30 hover:bg-muted/60 hover:scale-[1.03] ${screenState?.logoUrl === p.url ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
                            >
                              <img src={p.url} alt={p.label} className="h-7 w-7 object-contain" loading="lazy" />
                              <span className="text-[9px] text-muted-foreground group-hover:text-foreground truncate max-w-full leading-tight">{p.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-1.5">🌍 Country Flags <span className="text-xs font-normal text-muted-foreground">({filteredFlags.length})</span></h3>
                      </div>
                      {filteredFlags.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No flags match "{q}".</p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {filteredFlags.map(p => {
                            const url = flagUrl(p.code);
                            const logoUrl = flagHiResUrl(p.code);
                            return (
                              <button
                                key={p.code}
                                type="button"
                                data-testid={`button-flag-${p.code}`}
                                title={p.label}
                                onClick={() => iconSendMode === "logo" ? sendAsLogo(logoUrl) : sendAsBackground(url)}
                                className={`group rounded-lg border overflow-hidden transition-all flex flex-col items-center justify-center gap-1 p-2 bg-muted/30 hover:bg-muted/60 hover:scale-[1.02] ${screenState?.logoUrl === url ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
                              >
                                <img src={url} alt={p.label} className="h-7 w-auto object-contain rounded shadow-sm" loading="lazy" />
                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground truncate max-w-full leading-tight">{p.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground bg-muted/30 rounded px-3 py-2">
                      Tip: Switch the mode above to send icons/flags as a fullscreen background instead of a logo overlay.
                      Use the <span className="font-medium">Overlays</span> tab to fine-tune logo placement and styling, or to hide the logo.
                    </p>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="url" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Video className="w-4 h-4" /> Video from URL</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="https://example.com/background.mp4" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="flex-1" />
                <Button variant="outline" onClick={() => { if (fileVideoRef.current && videoUrl) { fileVideoRef.current.src = videoUrl; fileVideoRef.current.play().catch(() => {}); } }}>Preview</Button>
              </div>
              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                <video ref={fileVideoRef} className="w-full h-full object-cover" loop muted playsInline />
              </div>
              <Button onClick={() => sendVideoToScreen(videoUrl)} disabled={!videoUrl} className="w-full gap-2"><Cast className="w-4 h-4" /> Send Video</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Image from URL</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="https://example.com/background.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              {imageUrl && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                </div>
              )}
              <Button onClick={() => sendImageToScreen(imageUrl)} disabled={!imageUrl} className="w-full gap-2"><Cast className="w-4 h-4" /> Send Image</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── OVERLAYS ── */}
        <TabsContent value="overlays" className="mt-4 space-y-4">

          {/* Presenter Lower-Third */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base"><User className="w-4 h-4" /> Presenter Lower-Third</CardTitle>
                <div className="flex items-center gap-2">
                  <SectionChevron section="lt" />
                  {screenState?.lowerThirdEnabled && <Badge className="text-[10px] py-0 h-4 bg-green-600 border-0">LIVE</Badge>}
                  <Switch
                    checked={screenState?.lowerThirdEnabled ?? false}
                    onCheckedChange={v => {
                      if (v) {
                        updateOverlay({
                          lowerThirdEnabled: true,
                          lowerThirdName: ltName || undefined,
                          lowerThirdTitle: ltTitleText || undefined,
                          lowerThirdPosition: ltPosition,
                          lowerThirdStyle: ltStyle,
                          lowerThirdNameColor: ltNameColor,
                          lowerThirdTitleColor: ltTitleColor,
                          lowerThirdBgColor: ltBgColor,
                          lowerThirdAccentColor: ltAccentColor,
                          lowerThirdNameSize: ltNameSize,
                          lowerThirdTitleSize: ltTitleSize,
                        });
                      } else {
                        updateOverlay({ lowerThirdEnabled: false });
                      }
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4" hidden={!openOverlays.has("lt")}>
              {/* Name + Title */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Name</label>
                  <Input value={ltName} onChange={e => setLtName(e.target.value)} placeholder="Pastor John Smith" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Title / Role</label>
                  <Input value={ltTitleText} onChange={e => setLtTitleText(e.target.value)} placeholder="Lead Pastor" />
                </div>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Position</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["bottom-left", "bottom-center", "bottom-right"] as const).map(pos => (
                    <button key={pos} onClick={() => setLtPosition(pos)}
                      className={`py-1.5 rounded text-xs transition-colors border ${ltPosition === pos ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {pos === "bottom-left" ? "Bottom Left" : pos === "bottom-center" ? "Center" : "Bottom Right"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Style</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["modern", "classic", "gradient", "minimal"] as const).map(sty => (
                    <button key={sty} onClick={() => setLtStyle(sty)}
                      className={`py-1.5 rounded text-xs capitalize transition-colors border ${ltStyle === sty ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {sty}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ltStyle === "modern" && "Semi-transparent background with accent left border"}
                  {ltStyle === "classic" && "Solid dark background with top divider line"}
                  {ltStyle === "gradient" && "Gradient fade from solid to transparent"}
                  {ltStyle === "minimal" && "Text only with drop shadow, no background"}
                </p>
              </div>

              {/* Colors */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Colors</label>
                <div className="grid grid-cols-2 gap-2">
                  <ColorInput label="Name Color" value={ltNameColor} onChange={setLtNameColor} />
                  <ColorInput label="Title Color" value={ltTitleColor} onChange={setLtTitleColor} />
                  {ltStyle !== "minimal" && (
                    <>
                      <ColorInput label="Background" value={ltBgColor} onChange={setLtBgColor} />
                      <ColorInput label={ltStyle === "modern" ? "Accent Border" : ltStyle === "gradient" ? "Gradient Base" : "Top Line"} value={ltAccentColor} onChange={setLtAccentColor} />
                    </>
                  )}
                </div>
              </div>

              {/* Font sizes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Name Size</label>
                    <span className="text-xs text-muted-foreground">{ltNameSize}px</span>
                  </div>
                  <SliderWithButtons min={14} max={48} step={1} value={[ltNameSize]} onValueChange={([v]) => setLtNameSize(v)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Title Size</label>
                    <span className="text-xs text-muted-foreground">{ltTitleSize}px</span>
                  </div>
                  <SliderWithButtons min={9} max={28} step={1} value={[ltTitleSize]} onValueChange={([v]) => setLtTitleSize(v)} />
                </div>
              </div>

              {/* Auto-hide */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Auto-hide after</label>
                  <span className="text-xs text-muted-foreground" data-testid="text-lt-autodismiss-label">
                    {ltAutoDismissSec === 0 ? "Off (manual hide)" : `${ltAutoDismissSec}s`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <SliderWithButtons data-testid="slider-lt-autodismiss" className="flex-1" min={0} max={60} step={1} value={[ltAutoDismissSec]} onValueChange={([v]) => setLtAutoDismissSec(v)} />
                  <Input
                    data-testid="input-lt-autodismiss"
                    type="number"
                    min={0}
                    max={60}
                    value={ltAutoDismissSec}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setLtAutoDismissSec(isNaN(n) ? 0 : Math.max(0, Math.min(60, n)));
                    }}
                    className="h-8 w-16 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 gap-2"
                  data-testid="button-lt-show"
                  onClick={() => updateOverlay({
                    lowerThirdEnabled: true,
                    lowerThirdName: ltName || undefined,
                    lowerThirdTitle: ltTitleText || undefined,
                    lowerThirdPosition: ltPosition,
                    lowerThirdStyle: ltStyle,
                    lowerThirdNameColor: ltNameColor,
                    lowerThirdTitleColor: ltTitleColor,
                    lowerThirdBgColor: ltBgColor,
                    lowerThirdAccentColor: ltAccentColor,
                    lowerThirdNameSize: ltNameSize,
                    lowerThirdTitleSize: ltTitleSize,
                    lowerThirdAutoDismissSec: ltAutoDismissSec,
                  })}
                  disabled={!ltName}
                >
                  <Cast className="w-4 h-4" /> Show Lower Third
                </Button>
                {screenState?.lowerThirdEnabled && (
                  <Button variant="outline" className="gap-2" onClick={() => updateOverlay({ lowerThirdEnabled: false })}>
                    Hide
                  </Button>
                )}
              </div>

              {screenState?.lowerThirdEnabled && screenState.lowerThirdName && (
                <div className="text-xs bg-green-500/10 border border-green-500/20 rounded px-3 py-2 text-green-400">
                  Now showing: <strong>{screenState.lowerThirdName}</strong>
                  {screenState.lowerThirdTitle && ` — ${screenState.lowerThirdTitle}`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clock Overlay */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base"><Clock className="w-4 h-4" /> Clock Overlay</CardTitle>
                <div className="flex items-center gap-2">
                  <SectionChevron section="clock" />
                  {screenState?.clockOverlayEnabled && <Badge className="text-[10px] py-0 h-4 bg-green-600 border-0">LIVE</Badge>}
                  <Switch checked={screenState?.clockOverlayEnabled ?? false} onCheckedChange={v => updateOverlay({ clockOverlayEnabled: v })} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4" hidden={!openOverlays.has("clock")}>
              {/* Position */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Position</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map(pos => (
                    <button key={pos} onClick={() => updateOverlay({ clockPosition: pos })}
                      className={`py-1.5 rounded text-xs transition-colors border capitalize ${(screenState?.clockPosition ?? "top-right") === pos ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {pos.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Time Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "digital", label: "Digital — HH:MM:SS" },
                    { value: "clean",   label: "Clean — HH:MM" },
                  ] as const).map(s => (
                    <button key={s.value} onClick={() => updateOverlay({ clockStyle: s.value })}
                      className={`py-1.5 rounded text-xs transition-colors border ${(screenState?.clockStyle ?? "digital") === s.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date toggle + format */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Show Date</label>
                  <Switch
                    checked={screenState?.clockShowDate ?? false}
                    onCheckedChange={v => updateOverlay({ clockShowDate: v })}
                  />
                </div>
                {(screenState?.clockShowDate ?? false) && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { value: "long",    label: "Monday, May 5" },
                      { value: "short",   label: "May 5, 2025" },
                      { value: "numeric", label: "5/5/2025" },
                    ] as const).map(d => (
                      <button key={d.value} onClick={() => updateOverlay({ clockDateFormat: d.value })}
                        className={`py-1.5 rounded text-[10px] border transition-colors ${(screenState?.clockDateFormat ?? "long") === d.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Show seconds toggle (only relevant for digital) */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Show Seconds</label>
                <Switch
                  checked={screenState?.clockShowSeconds ?? true}
                  onCheckedChange={v => updateOverlay({ clockShowSeconds: v })}
                />
              </div>

              {/* Font size + color */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Font Size</label>
                    <span className="text-xs text-muted-foreground">{screenState?.clockFontSize ?? 16}px</span>
                  </div>
                  <SliderWithButtons min={10} max={40} step={1} value={[screenState?.clockFontSize ?? 16]}
                    onValueChange={([v]) => updateOverlay({ clockFontSize: v })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Text Color</label>
                  <div className="flex gap-1.5 items-center">
                    <input type="color" value="#ffffff"
                      onChange={e => updateOverlay({ clockColor: e.target.value })}
                      className="h-8 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5" />
                    <Input className="h-8 text-xs font-mono"
                      value={screenState?.clockColor ?? "rgba(255,255,255,0.92)"}
                      onChange={e => updateOverlay({ clockColor: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* ── Background customization ── */}
              <div className="pt-2 border-t border-border/50 space-y-3">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Background</label>

                {/* Bg color preset + custom */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Color</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[
                      { v: "transparent",       label: "None",   swatch: "transparent" },
                      { v: "rgba(0,0,0,0.32)",  label: "Dark",   swatch: "rgba(0,0,0,0.32)" },
                      { v: "rgba(0,0,0,0.52)",  label: "Dark+",  swatch: "rgba(0,0,0,0.52)" },
                      { v: "rgba(0,0,0,0.85)",  label: "Solid",  swatch: "rgba(0,0,0,0.85)" },
                      { v: "rgba(255,255,255,0.18)", label: "Light",  swatch: "rgba(255,255,255,0.4)" },
                      { v: "rgba(180,30,30,0.7)",    label: "Accent", swatch: "rgba(180,30,30,0.85)" },
                    ].map(p => (
                      <button key={p.v} onClick={() => updateOverlay({ clockBgColor: p.v })}
                        className={`h-8 rounded border transition-colors flex flex-col items-center justify-center gap-0.5 ${(screenState?.clockBgColor ?? "rgba(0,0,0,0.52)") === p.v ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40"}`}
                        style={{ background: p.swatch === "transparent" ? "repeating-conic-gradient(#666 0% 25%, #999 0% 50%) 50% / 8px 8px" : p.swatch }}>
                        <span className="text-[9px]" style={{ color: p.v.includes("255,255,255") || p.swatch === "transparent" ? "#000" : "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <Input className="h-7 text-[11px] font-mono"
                    value={screenState?.clockBgColor ?? "rgba(0,0,0,0.52)"}
                    onChange={e => updateOverlay({ clockBgColor: e.target.value })}
                    placeholder="rgba(0,0,0,0.52)" />
                </div>

                {/* Bg opacity */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Opacity</label>
                    <span className="text-xs text-muted-foreground">{screenState?.clockBgOpacity ?? 100}%</span>
                  </div>
                  <SliderWithButtons min={0} max={100} step={5} value={[screenState?.clockBgOpacity ?? 100]}
                    onValueChange={([v]) => updateOverlay({ clockBgOpacity: v })} />
                </div>

                {/* Radius + padding */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Corner Radius</label>
                      <span className="text-xs text-muted-foreground">{screenState?.clockBgRadius ?? 6}px</span>
                    </div>
                    <SliderWithButtons min={0} max={32} step={1} value={[screenState?.clockBgRadius ?? 6]}
                      onValueChange={([v]) => updateOverlay({ clockBgRadius: v })} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Padding</label>
                      <span className="text-xs text-muted-foreground">{screenState?.clockBgPadding ?? 13}px</span>
                    </div>
                    <SliderWithButtons min={2} max={32} step={1} value={[screenState?.clockBgPadding ?? 13]}
                      onValueChange={([v]) => updateOverlay({ clockBgPadding: v })} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Overlay */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="w-4 h-4" /> Logo Overlay</CardTitle>
                <div className="flex items-center gap-2">
                  <SectionChevron section="logo" />
                  {screenState?.logoOverlayEnabled && <Badge className="text-[10px] py-0 h-4 bg-green-600 border-0">LIVE</Badge>}
                  <Switch
                    checked={screenState?.logoOverlayEnabled ?? false}
                    onCheckedChange={v => updateOverlay({ logoOverlayEnabled: v })}
                    disabled={!screenState?.logoUrl && !logoUrlDraft}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4" hidden={!openOverlays.has("logo")}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Logo Image</label>
                <input ref={logoFileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); e.target.value = ""; }} />
                <div className="flex gap-2 items-start">
                  {logoUrlDraft && (
                    <div className="relative shrink-0">
                      <img src={logoUrlDraft} alt="logo preview" className="h-16 w-auto max-w-[120px] object-contain rounded border border-border bg-checkerboard" />
                      <button onClick={() => { setLogoUrlDraft(""); setLogoUrlInput(""); }}
                        className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <Button size="sm" variant="outline" className="w-full gap-2 h-8 text-xs" onClick={() => logoFileInputRef.current?.click()}>
                      <Upload className="w-3.5 h-3.5" /> Upload image
                    </Button>
                    <div className="flex gap-1.5">
                      <Input className="h-8 text-xs" placeholder="or paste URL…" value={logoUrlInput} onChange={e => setLogoUrlInput(e.target.value)}
                        onBlur={() => { if (logoUrlInput) setLogoUrlDraft(logoUrlInput); }}
                        onKeyDown={e => { if (e.key === "Enter" && logoUrlInput) setLogoUrlDraft(logoUrlInput); }} />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground bg-muted/20 rounded px-2 py-1.5">
                Looking for ready-made icons or country flags? Open the <span className="font-medium text-foreground">Icons</span> tab.
              </p>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Position</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    ["top-left","Top Left"],["top-right","Top Right"],["center","Center"],
                    ["bottom-left","Bot Left"],["bottom-right","Bot Right"],
                  ] as const).map(([pos, label]) => (
                    <button key={pos} onClick={() => setLogoPosDraft(pos as typeof logoPosDraft)}
                      className={`py-1.5 rounded text-xs transition-colors border ${logoPosDraft === pos ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Size</label>
                    <span className="text-xs text-muted-foreground">{logoSizeDraft}%</span>
                  </div>
                  <SliderWithButtons min={5} max={40} step={1} value={[logoSizeDraft]} onValueChange={([v]) => setLogoSizeDraft(v)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Opacity</label>
                    <span className="text-xs text-muted-foreground">{logoOpacityDraft}%</span>
                  </div>
                  <SliderWithButtons min={10} max={100} step={5} value={[logoOpacityDraft]} onValueChange={([v]) => setLogoOpacityDraft(v)} />
                </div>
              </div>

              {/* ── Shape selector ── */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Shape</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {([
                    { v: "rect" as const,    label: "Square",  Icon: Square },
                    { v: "rounded" as const, label: "Rounded", Icon: Square },
                    { v: "circle" as const,  label: "Circle",  Icon: Circle },
                    { v: "hex" as const,     label: "Hex",     Icon: Hexagon },
                    { v: "shield" as const,  label: "Shield",  Icon: Shield },
                  ]).map(s => (
                    <button key={s.v} onClick={() => setLogoShapeDraft(s.v)}
                      className={`flex flex-col items-center gap-1 py-2 rounded text-[10px] border transition-colors ${logoShapeDraft === s.v ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      <s.Icon className={`w-4 h-4 ${s.v === "rounded" ? "rounded-md" : ""}`} />
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Circle/hex/shield crop the image to that shape.</p>
              </div>

              {/* ── Companion text ── */}
              <div className="pt-2 border-t border-border/50 space-y-3">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" /> Companion Text (Optional)
                </label>
                <Input className="h-8 text-xs"
                  placeholder="e.g. Phiri Worship Centre"
                  value={logoTextDraft}
                  onChange={e => setLogoTextDraft(e.target.value)} />

                {logoTextDraft && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Text Position</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([
                          { v: "right" as const, label: "Right" },
                          { v: "left"  as const, label: "Left"  },
                          { v: "below" as const, label: "Below" },
                          { v: "above" as const, label: "Above" },
                        ]).map(p => (
                          <button key={p.v} onClick={() => setLogoTextPositionDraft(p.v)}
                            className={`py-1.5 rounded text-[11px] border transition-colors ${logoTextPositionDraft === p.v ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium">Text Size</label>
                          <span className="text-xs text-muted-foreground">{logoTextSizeDraft}px</span>
                        </div>
                        <SliderWithButtons min={8} max={48} step={1} value={[logoTextSizeDraft]} onValueChange={([v]) => setLogoTextSizeDraft(v)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Text Color</label>
                        <div className="flex gap-1.5 items-center">
                          <input type="color" value={logoTextColorDraft.startsWith("#") ? logoTextColorDraft : "#ffffff"}
                            onChange={e => setLogoTextColorDraft(e.target.value)}
                            className="h-8 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5" />
                          <Input className="h-8 text-xs font-mono" value={logoTextColorDraft} onChange={e => setLogoTextColorDraft(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Font Weight</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([
                          { v: "400" as const, label: "Regular" },
                          { v: "500" as const, label: "Medium" },
                          { v: "600" as const, label: "Semibold" },
                          { v: "700" as const, label: "Bold" },
                        ]).map(w => (
                          <button key={w.v} onClick={() => setLogoTextWeightDraft(w.v)}
                            className={`py-1.5 rounded text-[10px] border transition-colors ${logoTextWeightDraft === w.v ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                            {w.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 gap-2"
                  onClick={() => updateOverlay({
                    logoOverlayEnabled: true,
                    logoUrl: logoUrlDraft || undefined,
                    logoPosition: logoPosDraft,
                    logoSize: logoSizeDraft,
                    logoOpacity: logoOpacityDraft,
                    logoShape: logoShapeDraft,
                    logoText: logoTextDraft || undefined,
                    logoTextColor: logoTextColorDraft,
                    logoTextSize: logoTextSizeDraft,
                    logoTextPosition: logoTextPositionDraft,
                    logoTextWeight: logoTextWeightDraft,
                  })}
                  disabled={!logoUrlDraft}
                >
                  <Cast className="w-4 h-4" /> Show Logo
                </Button>
                {screenState?.logoOverlayEnabled && (
                  <Button variant="outline" className="gap-2" onClick={() => updateOverlay({ logoOverlayEnabled: false })}>
                    Hide
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Standalone Text Overlay */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base"><FileImage className="w-4 h-4" /> Text Overlay</CardTitle>
                <div className="flex items-center gap-2">
                  <SectionChevron section="to" />
                  {screenState?.textOverlayEnabled && <Badge className="text-[10px] py-0 h-4 bg-green-600 border-0">LIVE</Badge>}
                  <Switch
                    checked={screenState?.textOverlayEnabled ?? false}
                    onCheckedChange={v => updateOverlay({ textOverlayEnabled: v })}
                    disabled={!toContent}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4" hidden={!openOverlays.has("to")}>
              {/* Text content */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Text</label>
                <textarea rows={3}
                  data-testid="textarea-to-content"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Type overlay text here…"
                  value={toContent}
                  onChange={e => setToContent(e.target.value)}
                />
              </div>

              {/* Position — 3×3 grid */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Position</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["top-left","top-center","top-right","center-left","center","center-right","bottom-left","bottom-center","bottom-right"] as const).map(pos => (
                    <button key={pos} onClick={() => setToPosition(pos)}
                      className={`py-1 rounded text-[10px] leading-tight transition-colors border ${toPosition === pos ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {pos.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font family + size */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Font Family</label>
                  <Select value={toFontFamily} onValueChange={setToFontFamily}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit" className="text-xs">Default</SelectItem>
                      <SelectItem value="Inter, sans-serif" className="text-xs">Inter</SelectItem>
                      <SelectItem value="Arial, sans-serif" className="text-xs">Arial</SelectItem>
                      <SelectItem value="Georgia, serif" className="text-xs">Georgia</SelectItem>
                      <SelectItem value="'Times New Roman', serif" className="text-xs">Times New Roman</SelectItem>
                      <SelectItem value="'Courier New', monospace" className="text-xs">Courier New</SelectItem>
                      <SelectItem value="Impact, sans-serif" className="text-xs">Impact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Font Size</label>
                    <span className="text-xs text-muted-foreground">{toFontSize}px</span>
                  </div>
                  <SliderWithButtons min={12} max={120} step={2} value={[toFontSize]} onValueChange={([v]) => setToFontSize(v)} />
                </div>
              </div>

              {/* Color + background */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Text Color</label>
                  <div className="flex gap-1.5 items-center">
                    <input type="color" value={toColor} onChange={e => setToColor(e.target.value)} className="h-8 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5" />
                    <Input className="h-8 text-xs font-mono" value={toColor} onChange={e => setToColor(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Background</label>
                  <Select value={toBg} onValueChange={setToBg}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      <SelectItem value="rgba(0,0,0,0.55)" className="text-xs">Dark 55%</SelectItem>
                      <SelectItem value="rgba(0,0,0,0.75)" className="text-xs">Dark 75%</SelectItem>
                      <SelectItem value="rgba(0,0,0,0.9)" className="text-xs">Dark 90%</SelectItem>
                      <SelectItem value="rgba(255,255,255,0.15)" className="text-xs">Light 15%</SelectItem>
                      <SelectItem value="rgba(255,255,255,0.35)" className="text-xs">Light 35%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Style toggles row */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Bold */}
                <button onClick={() => setToBold(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${toBold ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                  <Bold className="w-3.5 h-3.5" /> Bold
                </button>
                {/* Italic */}
                <button onClick={() => setToItalic(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${toItalic ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                  <Italic className="w-3.5 h-3.5" /> Italic
                </button>
                {/* Shadow */}
                <button onClick={() => setToShadow(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${toShadow ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                  Shadow
                </button>
                {/* Align */}
                <div className="flex gap-0.5 ml-auto">
                  {([
                    { value: "left" as const,   icon: <AlignLeft   className="w-3.5 h-3.5" /> },
                    { value: "center" as const, icon: <AlignCenter className="w-3.5 h-3.5" /> },
                    { value: "right" as const,  icon: <AlignRight  className="w-3.5 h-3.5" /> },
                  ]).map(a => (
                    <button key={a.value} onClick={() => setToAlign(a.value)}
                      className={`p-1.5 rounded border transition-colors ${toAlign === a.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {a.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Advanced styling ── */}
              <div className="pt-2 border-t border-border/50 space-y-3">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Advanced
                </label>

                {/* Animation */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Animation</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {([
                      { v: "none"     as const, label: "None"  },
                      { v: "fade_in"  as const, label: "Fade"  },
                      { v: "slide_up" as const, label: "Slide" },
                      { v: "glow"     as const, label: "Glow"  },
                      { v: "pulse"    as const, label: "Pulse" },
                    ]).map(a => (
                      <button key={a.v} onClick={() => setToAnimation(a.v)}
                        className={`py-1.5 rounded text-[10px] border transition-colors ${toAnimation === a.v ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity + max width */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Opacity</label>
                      <span className="text-xs text-muted-foreground">{toOpacity}%</span>
                    </div>
                    <SliderWithButtons min={20} max={100} step={5} value={[toOpacity]} onValueChange={([v]) => setToOpacity(v)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Max Width</label>
                      <span className="text-xs text-muted-foreground">{toMaxWidth}%</span>
                    </div>
                    <SliderWithButtons min={20} max={95} step={5} value={[toMaxWidth]} onValueChange={([v]) => setToMaxWidth(v)} />
                  </div>
                </div>

                {/* Padding + radius */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Padding</label>
                      <span className="text-xs text-muted-foreground">{toPadding}px</span>
                    </div>
                    <SliderWithButtons min={0} max={40} step={1} value={[toPadding]} onValueChange={([v]) => setToPadding(v)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Corner Radius</label>
                      <span className="text-xs text-muted-foreground">{toRadius}px</span>
                    </div>
                    <SliderWithButtons min={0} max={40} step={1} value={[toRadius]} onValueChange={([v]) => setToRadius(v)} />
                  </div>
                </div>

                {/* Letter spacing */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Letter Spacing</label>
                    <span className="text-xs text-muted-foreground">{(toLetterSpacing / 100).toFixed(2)}em</span>
                  </div>
                  <SliderWithButtons min={-5} max={30} step={1} value={[toLetterSpacing]} onValueChange={([v]) => setToLetterSpacing(v)} />
                </div>

                {/* Border */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Border Width</label>
                      <span className="text-xs text-muted-foreground">{toBorderWidth}px</span>
                    </div>
                    <SliderWithButtons min={0} max={8} step={1} value={[toBorderWidth]} onValueChange={([v]) => setToBorderWidth(v)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Border Color</label>
                    <div className="flex gap-1.5 items-center">
                      <input type="color" value={toBorderColor.startsWith("#") ? toBorderColor : "#ffffff"} onChange={e => setToBorderColor(e.target.value)} className="h-8 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5" />
                      <Input className="h-8 text-xs font-mono" value={toBorderColor} onChange={e => setToBorderColor(e.target.value)} disabled={toBorderWidth === 0} />
                    </div>
                  </div>
                </div>

                {/* Auto-hide */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Auto-hide after</label>
                    <span className="text-xs text-muted-foreground" data-testid="text-to-autodismiss-label">
                      {toAutoDismissSec === 0 ? "Off (manual hide)" : `${toAutoDismissSec}s`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SliderWithButtons data-testid="slider-to-autodismiss" className="flex-1" min={0} max={60} step={1} value={[toAutoDismissSec]} onValueChange={([v]) => setToAutoDismissSec(v)} />
                    <Input
                      data-testid="input-to-autodismiss"
                      type="number"
                      min={0}
                      max={60}
                      value={toAutoDismissSec}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        setToAutoDismissSec(isNaN(n) ? 0 : Math.max(0, Math.min(60, n)));
                      }}
                      className="h-8 w-16 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1 gap-2"
                  data-testid="button-to-show"
                  onClick={() => updateOverlay({
                    textOverlayEnabled: true,
                    textOverlayContent: toContent || undefined,
                    textOverlayPosition: toPosition,
                    textOverlayFontSize: toFontSize,
                    textOverlayColor: toColor,
                    textOverlayBg: toBg,
                    textOverlayBold: toBold,
                    textOverlayItalic: toItalic,
                    textOverlayAlign: toAlign,
                    textOverlayFontFamily: toFontFamily,
                    textOverlayShadow: toShadow,
                    textOverlayOpacity: toOpacity,
                    textOverlayPadding: toPadding,
                    textOverlayRadius: toRadius,
                    textOverlayLetterSpacing: toLetterSpacing,
                    textOverlayAnimation: toAnimation,
                    textOverlayMaxWidth: toMaxWidth,
                    textOverlayBorderColor: toBorderColor,
                    textOverlayBorderWidth: toBorderWidth,
                    textOverlayAutoDismissSec: toAutoDismissSec,
                  })}
                  disabled={!toContent}
                >
                  <Cast className="w-4 h-4" /> Show Text
                </Button>
                {screenState?.textOverlayEnabled && (
                  <Button variant="outline" className="gap-2" onClick={() => updateOverlay({ textOverlayEnabled: false })}>
                    Hide
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Stopwatch / Countdown Timer ── */}
          {(() => {
            const startedAtMs = screenState?.timerStartedAt ? Date.parse(screenState.timerStartedAt) : NaN;
            const isRunning = !isNaN(startedAtMs);
            const serverEnabled = screenState?.timerEnabled ?? false;
            const serverMode = screenState?.timerMode ?? "stopwatch";
            const accumulated = screenState?.timerAccumulatedMs ?? 0;
            // re-read timerTick to keep the live preview ticking
            void timerTick;
            // Only show live elapsed when the timer is enabled AND the active mode matches what the user is editing.
            // Otherwise the preview should reflect the draft duration cleanly (so switching mode resets the readout).
            const showLive = serverEnabled && serverMode === timerModeDraft;
            const elapsedMs = showLive
              ? accumulated + (isRunning ? Math.max(0, Date.now() - startedAtMs) : 0)
              : 0;
            // A fresh start clears any stale accumulated time from a previous run/mode.
            const isFreshStart = !isRunning && (!serverEnabled || serverMode !== timerModeDraft || accumulated === 0);
            const totalDurationSec = (timerDurationMinDraft * 60) + timerDurationSecDraft;
            const previewMs = timerModeDraft === "countdown" ? Math.max(0, totalDurationSec * 1000 - elapsedMs) : elapsedMs;
            const previewSec = Math.floor(previewMs / 1000);
            const ph = Math.floor(previewSec / 3600);
            const pm = Math.floor((previewSec % 3600) / 60);
            const ps = previewSec % 60;
            const previewStr = ph > 0
              ? `${ph}:${String(pm).padStart(2, "0")}:${String(ps).padStart(2, "0")}`
              : `${String(pm).padStart(2, "0")}:${String(ps).padStart(2, "0")}`;

            const start = () => {
              updateOverlay({
                timerEnabled: true,
                timerMode: timerModeDraft,
                timerStartedAt: new Date().toISOString(),
                timerAccumulatedMs: isFreshStart ? 0 : accumulated,
                timerDurationSec: totalDurationSec || 300,
                timerPosition: timerPositionDraft,
                timerFontSize: timerFontSizeDraft,
                timerColor: timerColorDraft,
                timerBgColor: timerBgColorDraft,
                timerLabel: timerLabelDraft || undefined,
                timerWarningSec: timerWarningSecDraft,
              });
            };
            const pause = () => {
              if (!isRunning) return;
              updateOverlay({
                timerStartedAt: "",
                timerAccumulatedMs: elapsedMs,
              });
            };
            const reset = () => {
              updateOverlay({
                timerStartedAt: "",
                timerAccumulatedMs: 0,
              });
            };
            const restartFresh = () => {
              updateOverlay({
                timerEnabled: true,
                timerMode: timerModeDraft,
                timerStartedAt: new Date().toISOString(),
                timerAccumulatedMs: 0,
                timerDurationSec: totalDurationSec || 300,
                timerPosition: timerPositionDraft,
                timerFontSize: timerFontSizeDraft,
                timerColor: timerColorDraft,
                timerBgColor: timerBgColorDraft,
                timerLabel: timerLabelDraft || undefined,
                timerWarningSec: timerWarningSecDraft,
              });
            };

            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base"><TimerIcon className="w-4 h-4" /> Timer / Stopwatch</CardTitle>
                    <div className="flex items-center gap-2">
                      <SectionChevron section="timer" />
                      {serverEnabled && isRunning && <Badge className="text-[10px] py-0 h-4 bg-emerald-600 border-0 animate-pulse">RUNNING</Badge>}
                      {serverEnabled && !isRunning && accumulated > 0 && <Badge className="text-[10px] py-0 h-4 bg-amber-600 border-0">PAUSED</Badge>}
                      <Switch
                        checked={serverEnabled}
                        onCheckedChange={v => updateOverlay({
                          timerEnabled: v,
                          // Always clear running state when toggling — keeps server coherent.
                          timerStartedAt: "",
                          timerAccumulatedMs: 0,
                        })}
                      />
                    </div>
                  </div>
                  <CardDescription className="text-xs">Stopwatch counts up. Countdown counts down then turns red.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4" hidden={!openOverlays.has("timer")}>
                  {/* Live preview readout */}
                  <div className="flex items-center justify-center py-3 rounded-md border border-border bg-muted/30">
                    <div className="text-3xl font-mono font-bold tabular-nums tracking-wider"
                      style={{ color: previewMs < 10000 && timerModeDraft === "countdown" ? "#ef4444" : previewMs < timerWarningSecDraft * 1000 && timerModeDraft === "countdown" ? "#f59e0b" : undefined }}>
                      {previewStr}
                    </div>
                  </div>

                  {/* Mode */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { v: "stopwatch" as const, label: "Stopwatch" },
                        { v: "countdown" as const, label: "Countdown" },
                      ]).map(m => (
                        <button key={m.v} onClick={() => setTimerModeDraft(m.v)}
                          className={`py-2 rounded text-xs transition-colors border ${timerModeDraft === m.v ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration (countdown only) */}
                  {timerModeDraft === "countdown" && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Duration</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input type="number" min={0} max={180} value={timerDurationMinDraft}
                            onChange={e => setTimerDurationMinDraft(Math.max(0, Math.min(180, parseInt(e.target.value || "0", 10))))}
                            className="h-8 text-sm text-center" />
                          <div className="text-[10px] text-center text-muted-foreground mt-0.5">min</div>
                        </div>
                        <div className="flex-1">
                          <Input type="number" min={0} max={59} value={timerDurationSecDraft}
                            onChange={e => setTimerDurationSecDraft(Math.max(0, Math.min(59, parseInt(e.target.value || "0", 10))))}
                            className="h-8 text-sm text-center" />
                          <div className="text-[10px] text-center text-muted-foreground mt-0.5">sec</div>
                        </div>
                        <div className="flex flex-col gap-1 pl-2">
                          {[1, 5, 10, 15, 30].map(min => (
                            <button key={min} onClick={() => { setTimerDurationMinDraft(min); setTimerDurationSecDraft(0); }}
                              className="px-2 py-0.5 rounded text-[10px] border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
                              {min}m
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Position */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Position</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["top-left","top-center","top-right","bottom-left","center","bottom-right","bottom-center"] as const).filter(p => p !== "bottom-center" || true).slice(0, 7).map(pos => (
                        pos === "center" ? (
                          <button key={pos} onClick={() => setTimerPositionDraft(pos)}
                            className={`py-1 rounded text-[10px] leading-tight transition-colors border ${timerPositionDraft === pos ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                            Center
                          </button>
                        ) : (
                          <button key={pos} onClick={() => setTimerPositionDraft(pos)}
                            className={`py-1 rounded text-[10px] leading-tight transition-colors border ${timerPositionDraft === pos ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                            {pos.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </button>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Label */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Label (optional)</label>
                    <Input className="h-8 text-xs" placeholder="e.g. Worship Set, Sermon" value={timerLabelDraft}
                      onChange={e => setTimerLabelDraft(e.target.value)} />
                  </div>

                  {/* Font size + color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium">Size</label>
                        <span className="text-xs text-muted-foreground">{timerFontSizeDraft}px</span>
                      </div>
                      <SliderWithButtons min={24} max={140} step={2} value={[timerFontSizeDraft]} onValueChange={([v]) => setTimerFontSizeDraft(v)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Text Color</label>
                      <div className="flex gap-1.5 items-center">
                        <input type="color" value={timerColorDraft.startsWith("#") ? timerColorDraft : "#ffffff"}
                          onChange={e => setTimerColorDraft(e.target.value)}
                          className="h-8 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5" />
                        <Input className="h-8 text-xs font-mono" value={timerColorDraft}
                          onChange={e => setTimerColorDraft(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Background + warning seconds (countdown only) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Background</label>
                      <Select value={timerBgColorDraft} onValueChange={setTimerBgColorDraft}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transparent" className="text-xs">None</SelectItem>
                          <SelectItem value="rgba(0,0,0,0.4)" className="text-xs">Dark 40%</SelectItem>
                          <SelectItem value="rgba(0,0,0,0.6)" className="text-xs">Dark 60%</SelectItem>
                          <SelectItem value="rgba(0,0,0,0.85)" className="text-xs">Solid Dark</SelectItem>
                          <SelectItem value="rgba(255,255,255,0.15)" className="text-xs">Light 15%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {timerModeDraft === "countdown" && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium">Warn at</label>
                          <span className="text-xs text-muted-foreground">{timerWarningSecDraft}s</span>
                        </div>
                        <SliderWithButtons min={5} max={300} step={5} value={[timerWarningSecDraft]} onValueChange={([v]) => setTimerWarningSecDraft(v)} />
                      </div>
                    )}
                  </div>

                  {/* Warning + critical color pickers (countdown only) */}
                  {timerModeDraft === "countdown" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Warning Color</label>
                        <div className="flex gap-1.5 items-center">
                          <input type="color"
                            value={(screenState?.timerWarningColor ?? "#fbbf24").startsWith("#") ? (screenState?.timerWarningColor ?? "#fbbf24") : "#fbbf24"}
                            onChange={e => updateOverlay({ timerWarningColor: e.target.value })}
                            className="h-8 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5" />
                          <Input className="h-8 text-xs font-mono"
                            value={screenState?.timerWarningColor ?? "#fbbf24"}
                            onChange={e => updateOverlay({ timerWarningColor: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Critical Color</label>
                        <div className="flex gap-1.5 items-center">
                          <input type="color"
                            value={(screenState?.timerCriticalColor ?? "#ef4444").startsWith("#") ? (screenState?.timerCriticalColor ?? "#ef4444") : "#ef4444"}
                            onChange={e => updateOverlay({ timerCriticalColor: e.target.value })}
                            className="h-8 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5" />
                          <Input className="h-8 text-xs font-mono"
                            value={screenState?.timerCriticalColor ?? "#ef4444"}
                            onChange={e => updateOverlay({ timerCriticalColor: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transport controls */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    {!isRunning ? (
                      <Button className="flex-1 gap-2" onClick={start}>
                        <Play className="w-4 h-4" /> {isFreshStart ? "Start" : "Resume"}
                      </Button>
                    ) : (
                      <Button className="flex-1 gap-2" variant="secondary" onClick={pause}>
                        <Pause className="w-4 h-4" /> Pause
                      </Button>
                    )}
                    <Button variant="outline" className="gap-2" onClick={reset} disabled={!isRunning && accumulated === 0}>
                      <RotateCcw className="w-4 h-4" /> Reset
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={restartFresh}>
                      <RotateCw className="w-4 h-4" /> Restart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* ─── Scripture Labels (book name + verse reference) ─── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><FileImage className="w-4 h-4" /> Scripture Labels</CardTitle>
                  <CardDescription className="text-xs">Customize the book-name pill on top and the verse reference pill on the bottom</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <SectionChevron section="bible-labels" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5" hidden={!openOverlays.has("bible-labels")}>
              {(() => {
                const presetSizes = [16, 20, 24, 28, 36, 48, 64];
                const bgPresets = [
                  { v: "transparent",       label: "None",   swatch: "transparent" },
                  { v: "rgba(0,0,0,0.32)",  label: "Dark",   swatch: "rgba(0,0,0,0.32)" },
                  { v: "rgba(0,0,0,0.55)",  label: "Dark+",  swatch: "rgba(0,0,0,0.55)" },
                  { v: "rgba(0,0,0,0.85)",  label: "Solid",  swatch: "rgba(0,0,0,0.85)" },
                  { v: "rgba(255,255,255,0.18)", label: "Light",  swatch: "rgba(255,255,255,0.4)" },
                  { v: "rgba(180,30,30,0.7)",    label: "Accent", swatch: "rgba(180,30,30,0.85)" },
                ];
                return (
                  <>
                    {/* ━━━ Book Name (top) ━━━ */}
                    <div className="space-y-3 rounded-md border border-border/60 p-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Book Name (top)</label>
                        <Switch
                          data-testid="switch-bible-book-show"
                          checked={screenState?.bibleBookShow ?? true}
                          onCheckedChange={v => updateOverlay({ bibleBookShow: v })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <label className="text-sm font-medium">Font Size</label>
                            <span className="text-xs text-muted-foreground">{screenState?.bibleBookFontSize ?? 28}px</span>
                          </div>
                          <SliderWithButtons data-testid="slider-bible-book-size" min={12} max={96} step={1}
                            value={[screenState?.bibleBookFontSize ?? 28]}
                            onValueChange={([v]) => updateOverlay({ bibleBookFontSize: v })} />
                          <div className="flex flex-wrap gap-1 pt-1">
                            {presetSizes.map(s => (
                              <button key={s} type="button"
                                onClick={() => updateOverlay({ bibleBookFontSize: s })}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${(screenState?.bibleBookFontSize ?? 28) === s ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
                              >{s}</button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <ColorInput label="Text Color"
                            value={screenState?.bibleBookColor ?? "#ffffff"}
                            onChange={v => updateOverlay({ bibleBookColor: v })} />
                          <div className="flex items-center gap-2 pt-1">
                            <label className="text-[11px] text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                              <Switch className="scale-75" checked={screenState?.bibleBookBold ?? true}
                                onCheckedChange={v => updateOverlay({ bibleBookBold: v })} /> Bold
                            </label>
                            <label className="text-[11px] text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                              <Switch className="scale-75" checked={screenState?.bibleBookUppercase ?? true}
                                onCheckedChange={v => updateOverlay({ bibleBookUppercase: v })} /> UPPER
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground">Background</label>
                        <div className="grid grid-cols-6 gap-1.5">
                          {bgPresets.map(p => (
                            <button key={p.v} type="button" onClick={() => updateOverlay({ bibleBookBgColor: p.v })}
                              className={`h-7 rounded border transition-colors flex items-center justify-center ${(screenState?.bibleBookBgColor ?? "rgba(0,0,0,0.52)") === p.v ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40"}`}
                              style={{ background: p.swatch === "transparent" ? "repeating-conic-gradient(#666 0% 25%, #999 0% 50%) 50% / 6px 6px" : p.swatch }}>
                              <span className="text-[9px]" style={{ color: p.v.includes("255,255,255") || p.swatch === "transparent" ? "#000" : "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{p.label}</span>
                            </button>
                          ))}
                        </div>
                        <Input className="h-7 text-[11px] font-mono mt-1"
                          value={screenState?.bibleBookBgColor ?? "rgba(0,0,0,0.52)"}
                          onChange={e => updateOverlay({ bibleBookBgColor: e.target.value })} />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <label className="text-[11px] font-medium">Padding</label>
                            <span className="text-[10px] text-muted-foreground">{screenState?.bibleBookPadding ?? 10}px</span>
                          </div>
                          <SliderWithButtons min={2} max={40} step={1} value={[screenState?.bibleBookPadding ?? 10]}
                            onValueChange={([v]) => updateOverlay({ bibleBookPadding: v })} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <label className="text-[11px] font-medium">Radius</label>
                            <span className="text-[10px] text-muted-foreground">{screenState?.bibleBookRadius ?? 6}px</span>
                          </div>
                          <SliderWithButtons min={0} max={32} step={1} value={[screenState?.bibleBookRadius ?? 6]}
                            onValueChange={([v]) => updateOverlay({ bibleBookRadius: v })} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <label className="text-[11px] font-medium">Spacing</label>
                            <span className="text-[10px] text-muted-foreground">0.{String(screenState?.bibleBookLetterSpacing ?? 18).padStart(2, "0")}em</span>
                          </div>
                          <SliderWithButtons min={0} max={40} step={1} value={[screenState?.bibleBookLetterSpacing ?? 18]}
                            onValueChange={([v]) => updateOverlay({ bibleBookLetterSpacing: v })} />
                        </div>
                      </div>
                    </div>

                    {/* ━━━ Verse Reference (bottom) ━━━ */}
                    <div className="space-y-3 rounded-md border border-border/60 p-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verse Reference (bottom)</label>
                        <Switch
                          data-testid="switch-bible-ref-show"
                          checked={screenState?.bibleRefShow ?? true}
                          onCheckedChange={v => updateOverlay({ bibleRefShow: v })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <label className="text-sm font-medium">Font Size</label>
                            <span className="text-xs text-muted-foreground">{screenState?.bibleRefFontSize ?? 28}px</span>
                          </div>
                          <SliderWithButtons data-testid="slider-bible-ref-size" min={12} max={96} step={1}
                            value={[screenState?.bibleRefFontSize ?? 28]}
                            onValueChange={([v]) => updateOverlay({ bibleRefFontSize: v })} />
                          <div className="flex flex-wrap gap-1 pt-1">
                            {presetSizes.map(s => (
                              <button key={s} type="button"
                                onClick={() => updateOverlay({ bibleRefFontSize: s })}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${(screenState?.bibleRefFontSize ?? 28) === s ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
                              >{s}</button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <ColorInput label="Text Color"
                            value={screenState?.bibleRefColor ?? "#ffffff"}
                            onChange={v => updateOverlay({ bibleRefColor: v })} />
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <label className="text-[11px] text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                              <Switch className="scale-75" checked={screenState?.bibleRefBold ?? true}
                                onCheckedChange={v => updateOverlay({ bibleRefBold: v })} /> Bold
                            </label>
                            <label className="text-[11px] text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                              <Switch className="scale-75" checked={screenState?.bibleRefUppercase ?? false}
                                onCheckedChange={v => updateOverlay({ bibleRefUppercase: v })} /> UPPER
                            </label>
                            <label className="text-[11px] text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                              <Switch className="scale-75" checked={screenState?.bibleRefShowTranslation ?? true}
                                onCheckedChange={v => updateOverlay({ bibleRefShowTranslation: v })} /> Show abbr
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground">Background</label>
                        <div className="grid grid-cols-6 gap-1.5">
                          {bgPresets.map(p => (
                            <button key={p.v} type="button" onClick={() => updateOverlay({ bibleRefBgColor: p.v })}
                              className={`h-7 rounded border transition-colors flex items-center justify-center ${(screenState?.bibleRefBgColor ?? "rgba(0,0,0,0.55)") === p.v ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40"}`}
                              style={{ background: p.swatch === "transparent" ? "repeating-conic-gradient(#666 0% 25%, #999 0% 50%) 50% / 6px 6px" : p.swatch }}>
                              <span className="text-[9px]" style={{ color: p.v.includes("255,255,255") || p.swatch === "transparent" ? "#000" : "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{p.label}</span>
                            </button>
                          ))}
                        </div>
                        <Input className="h-7 text-[11px] font-mono mt-1"
                          value={screenState?.bibleRefBgColor ?? "rgba(0,0,0,0.55)"}
                          onChange={e => updateOverlay({ bibleRefBgColor: e.target.value })} />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <label className="text-[11px] font-medium">Padding</label>
                            <span className="text-[10px] text-muted-foreground">{screenState?.bibleRefPadding ?? 10}px</span>
                          </div>
                          <SliderWithButtons min={2} max={40} step={1} value={[screenState?.bibleRefPadding ?? 10]}
                            onValueChange={([v]) => updateOverlay({ bibleRefPadding: v })} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <label className="text-[11px] font-medium">Radius</label>
                            <span className="text-[10px] text-muted-foreground">{screenState?.bibleRefRadius ?? 6}px</span>
                          </div>
                          <SliderWithButtons min={0} max={32} step={1} value={[screenState?.bibleRefRadius ?? 6]}
                            onValueChange={([v]) => updateOverlay({ bibleRefRadius: v })} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <label className="text-[11px] font-medium">Spacing</label>
                            <span className="text-[10px] text-muted-foreground">0.{String(screenState?.bibleRefLetterSpacing ?? 4).padStart(2, "0")}em</span>
                          </div>
                          <SliderWithButtons min={0} max={40} step={1} value={[screenState?.bibleRefLetterSpacing ?? 4]}
                            onValueChange={([v]) => updateOverlay({ bibleRefLetterSpacing: v })} />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Scrolling Ticker */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Scrolling Ticker</CardTitle>
                  <CardDescription className="text-xs">News-style scrolling text bar at the bottom</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <SectionChevron section="ticker" />
                  {screenState?.tickerEnabled && (
                    <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Live</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3" hidden={!openOverlays.has("ticker")}>
              <div>
                <label className="text-xs font-medium text-foreground">Ticker text</label>
                <Input
                  value={tickerTextDraft}
                  onChange={(e) => setTickerTextDraft(e.target.value)}
                  placeholder="Welcome to our service today!"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ColorInput label="Text color" value={tickerColorDraft} onChange={setTickerColorDraft} />
                <ColorInput label="Background" value={tickerBgColorDraft} onChange={setTickerBgColorDraft} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground">Font size: {tickerFontSizeDraft}px</label>
                  <SliderWithButtons value={[tickerFontSizeDraft]} min={12} max={48} step={1}
                    onValueChange={(v) => setTickerFontSizeDraft(v[0])} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Speed: {tickerSpeedDraft}s/loop</label>
                  <SliderWithButtons value={[tickerSpeedDraft]} min={5} max={60} step={1}
                    onValueChange={(v) => setTickerSpeedDraft(v[0])} className="mt-1.5" />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground">Divider character</label>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {["✦", "•", "★", "◆", "●", "—", "|", "♦"].map(d => (
                    <button key={d} onClick={() => setTickerDividerDraft(d)}
                      className={`w-8 h-8 rounded border text-sm transition-colors ${tickerDividerDraft === d ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {d}
                    </button>
                  ))}
                  <Input value={tickerDividerDraft} onChange={e => setTickerDividerDraft(e.target.value.slice(0, 3))}
                    className="w-16 h-8 text-center" maxLength={3} />
                </div>
              </div>

              {/* Live preview — scrollable, no animation */}
              <div className="rounded-md overflow-hidden border border-border" style={{ background: "#0b0b0b" }}>
                <div style={{ background: tickerBgColorDraft, padding: "8px 12px", overflowX: "auto", whiteSpace: "nowrap" }}
                  className="[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-black/20 [&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-thumb]:rounded-full">
                  <span style={{ color: tickerColorDraft, fontSize: `${tickerFontSizeDraft}px` }}>
                    {tickerTextDraft || "Welcome to our service today!"}
                    <span style={{ margin: "0 2em", opacity: 0.6 }}>{tickerDividerDraft}</span>
                    {tickerTextDraft || "Welcome to our service today!"}
                    <span style={{ margin: "0 2em", opacity: 0.6 }}>{tickerDividerDraft}</span>
                    {tickerTextDraft || "Welcome to our service today!"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 gap-2" disabled={!tickerTextDraft.trim()}
                  onClick={() => updateScreen({ data: {
                    ...safeFullState(),
                    tickerEnabled: true,
                    tickerText: tickerTextDraft.trim(),
                    tickerSpeed: tickerSpeedDraft,
                    tickerDivider: tickerDividerDraft,
                    tickerColor: tickerColorDraft,
                    tickerBgColor: tickerBgColorDraft,
                    tickerFontSize: tickerFontSizeDraft,
                  }})}>
                  <Cast className="w-4 h-4" /> Show Ticker
                </Button>
                {screenState?.tickerEnabled && (
                  <Button variant="outline" className="gap-2"
                    onClick={() => updateScreen({ data: { ...safeFullState(), tickerEnabled: false } })}>
                    Hide
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Scoreboard Overlay ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base"><Trophy className="w-4 h-4 text-yellow-400" /> Scoreboard</CardTitle>
                <div className="flex items-center gap-2">
                  <SectionChevron section="scoreboard" />
                  {screenState?.scoreboardEnabled && <Badge className="text-[10px] py-0 h-4 bg-green-600 border-0">LIVE</Badge>}
                  <Switch
                    checked={screenState?.scoreboardEnabled ?? false}
                    onCheckedChange={v => updateOverlay({ scoreboardEnabled: v,
                      scoreboardTeamA: sbTeamA, scoreboardTeamB: sbTeamB,
                      scoreboardScoreA: sbScoreA, scoreboardScoreB: sbScoreB,
                      scoreboardStyle: sbStyle, scoreboardPosition: sbPosition,
                      scoreboardAccentA: sbAccentA, scoreboardAccentB: sbAccentB,
                    } as Parameters<typeof updateOverlay>[0])}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4" hidden={!openOverlays.has("scoreboard")}>
              {/* Team rows */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: sbAccentA }} />
                    Team A
                  </label>
                  <div className="flex gap-2">
                    <Input value={sbTeamA} onChange={e => setSbTeamA(e.target.value)} placeholder="Home" className="flex-1" />
                    <input type="color" value={sbAccentA} onChange={e => setSbAccentA(e.target.value)}
                      className="h-9 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setSbScoreA(Math.max(0, sbScoreA - 1))} className="w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="flex-1 text-center text-2xl font-bold tabular-nums">{sbScoreA}</span>
                    <button onClick={() => setSbScoreA(sbScoreA + 1)} className="w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: sbAccentB }} />
                    Team B
                  </label>
                  <div className="flex gap-2">
                    <Input value={sbTeamB} onChange={e => setSbTeamB(e.target.value)} placeholder="Away" className="flex-1" />
                    <input type="color" value={sbAccentB} onChange={e => setSbAccentB(e.target.value)}
                      className="h-9 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setSbScoreB(Math.max(0, sbScoreB - 1))} className="w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="flex-1 text-center text-2xl font-bold tabular-nums">{sbScoreB}</span>
                    <button onClick={() => setSbScoreB(sbScoreB + 1)} className="w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted/40 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>

              {/* Style */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["modern", "classic", "minimal"] as const).map(s => (
                    <button key={s} onClick={() => setSbStyle(s)}
                      className={`py-1.5 rounded text-xs capitalize transition-colors border ${sbStyle === s ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Position</label>
                <div className="grid grid-cols-5 gap-1">
                  {(["top-left","top-center","top-right","bottom-left","bottom-right"] as const).map((p, i) => (
                    <button key={p} onClick={() => setSbPosition(p)}
                      className={`py-2 rounded text-base transition-colors border ${sbPosition === p ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {["↖","↑","↗","↙","↘"][i]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={() => updateOverlay({
                  scoreboardEnabled: true,
                  scoreboardTeamA: sbTeamA, scoreboardTeamB: sbTeamB,
                  scoreboardScoreA: sbScoreA, scoreboardScoreB: sbScoreB,
                  scoreboardStyle: sbStyle, scoreboardPosition: sbPosition,
                  scoreboardAccentA: sbAccentA, scoreboardAccentB: sbAccentB,
                } as Parameters<typeof updateOverlay>[0])}>
                  <Trophy className="w-4 h-4" /> Show Scoreboard
                </Button>
                {screenState?.scoreboardEnabled && (
                  <Button variant="outline" className="gap-2"
                    onClick={() => updateOverlay({ scoreboardEnabled: false } as Parameters<typeof updateOverlay>[0])}>
                    Hide
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── URL Overlay ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base"><Globe className="w-4 h-4" /> URL Overlay</CardTitle>
                <div className="flex items-center gap-2">
                  <SectionChevron section="url-overlay" />
                  {screenState?.urlOverlayEnabled && <Badge className="text-[10px] py-0 h-4 bg-green-600 border-0">LIVE</Badge>}
                  <Switch
                    checked={screenState?.urlOverlayEnabled ?? false}
                    onCheckedChange={v => updateOverlay({
                      urlOverlayEnabled: v, urlOverlayUrl: urlOvUrl,
                      urlOverlayPosition: urlOvPosition, urlOverlayWidth: urlOvWidth,
                      urlOverlayHeight: urlOvHeight, urlOverlayOpacity: urlOvOpacity,
                    } as Parameters<typeof updateOverlay>[0])}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4" hidden={!openOverlays.has("url-overlay")}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">URL</label>
                <Input value={urlOvUrl} onChange={e => setUrlOvUrl(e.target.value)} placeholder="https://…" />
                <p className="text-xs text-muted-foreground">Some sites block embedding (X-Frame-Options). Works best with your own content.</p>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Position</label>
                <div className="grid grid-cols-5 gap-1">
                  {(["top-left","top-center","top-right","bottom-left","bottom-right"] as const).map((p, i) => (
                    <button key={p} onClick={() => setUrlOvPosition(p)}
                      className={`py-2 rounded text-base transition-colors border ${urlOvPosition === p ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {["↖","↑","↗","↙","↘"][i]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground">Width: {urlOvWidth}vw</label>
                  <SliderWithButtons value={[urlOvWidth]} min={10} max={80} step={5}
                    onValueChange={([v]) => setUrlOvWidth(v)} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Height: {urlOvHeight}vh</label>
                  <SliderWithButtons value={[urlOvHeight]} min={10} max={80} step={5}
                    onValueChange={([v]) => setUrlOvHeight(v)} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Opacity: {urlOvOpacity}%</label>
                  <SliderWithButtons value={[urlOvOpacity]} min={10} max={100} step={5}
                    onValueChange={([v]) => setUrlOvOpacity(v)} className="mt-1.5" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 gap-2" disabled={!urlOvUrl.trim()} onClick={() => updateOverlay({
                  urlOverlayEnabled: true, urlOverlayUrl: urlOvUrl,
                  urlOverlayPosition: urlOvPosition, urlOverlayWidth: urlOvWidth,
                  urlOverlayHeight: urlOvHeight, urlOverlayOpacity: urlOvOpacity,
                } as Parameters<typeof updateOverlay>[0])}>
                  <Globe className="w-4 h-4" /> Show URL Overlay
                </Button>
                {screenState?.urlOverlayEnabled && (
                  <Button variant="outline" className="gap-2"
                    onClick={() => updateOverlay({ urlOverlayEnabled: false } as Parameters<typeof updateOverlay>[0])}>
                    Hide
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}
