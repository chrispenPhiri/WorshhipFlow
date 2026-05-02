import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SliderWithButtons } from "@/components/slider-with-buttons";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey, type Background } from "@workspace/api-client-react";
import { useRecording, startRecording as recStart, stopRecording as recStop, setIncludeMic, clearDownload } from "@/lib/recording";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera, Video, Image as ImageIcon, Cast, CameraOff, Play, Square,
  MonitorSpeaker, Monitor, Settings2, Loader2, CheckCircle2,
  PictureInPicture2, Maximize2, EyeOff, RotateCcw, ChevronRight, ChevronDown,
  Upload, X, FileImage, FileVideo, User, Clock, Scissors, RefreshCw, Layers3,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Circle, StopCircle, Download, Radio,
  Timer as TimerIcon, Pause, RotateCw, Hexagon, Shield, Type, Sparkles
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBroadcast, type ScreenInfo } from "@/hooks/use-broadcast";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
  size: string;
  fit: "cover" | "contain" | "fill";
  loop: boolean;
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

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

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
  const [camLayout, setCamLayout] = useState<"fullscreen" | "pip-topright" | "pip-topleft" | "pip-bottomright" | "pip-bottomleft" | "side-left" | "side-right">("fullscreen");
  const [camShape, setCamShape] = useState<"rect" | "circle" | "rounded">("rect");
  const [camPipSize, setCamPipSize] = useState(30);
  // Side-by-side: CSS background applied to the OTHER (text) half so it isn't pure black.
  // Stored on background.value when type=camera + side layout.
  const [camSideBg, setCamSideBg] = useState<string>("linear-gradient(135deg,#1e1b4b 0%,#0f0a2e 100%)");

  // Previous background — saved before camera goes live so Cut/Stop can roll back
  const prevBackgroundRef = useRef<{ type: string; value: string; overlay?: number; fit?: "cover" | "contain" | "fill"; loop?: boolean; cameraLayout?: string; cameraShape?: string; cameraPipSize?: number } | null>(null);

  // Recording — module-level state survives navigation
  const recording = useRecording();
  const recState = recording.state;
  const recDuration = recording.duration;
  const recDownloadUrl = recording.downloadUrl;
  const recIncludeMic = recording.includeMic;

  // Active tab — persisted across navigation via sessionStorage
  const [activeTab, setActiveTab] = useState<string>(() => {
    try { return sessionStorage.getItem("wf-media-tab") || "upload"; } catch { return "upload"; }
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
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
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
      updateScreen({
        data: {
          ...safeFullState(),
          isBlack: false,
          isClear: !prevBg,
          background: (prevBg ?? { type: "color", value: "#000000" }) as Background,
        }
      });
      prevBackgroundRef.current = null;
      toast({ title: "Camera stopped", description: "Presentation screen reverted to previous background." });
    }
  };

  const switchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    await startCamera(deviceId);
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

  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()); };
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
          // For side-by-side, value is the CSS background of the non-camera half so it
          // matches the theme instead of going pure black. For other layouts it's a
          // sentinel ("camera") that BackgroundLayer ignores.
          value: camLayout.startsWith("side-") ? camSideBg : "camera",
          overlay: overlay[0],
          cameraLayout: camLayout,
          cameraShape: camShape,
          cameraPipSize: camPipSize,
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

  const sendImageToScreen = async (url: string, fit: "cover" | "contain" | "fill" = "cover") => {
    if (!url) return;
    const resolved = url.startsWith("blob:") ? await blobToDataUrl(url).catch(() => url) : url;
    updateScreen({ data: { ...safeFullState(), isBlack: false, isClear: false, contentType: "image" as const, background: { type: "image", value: resolved, overlay: overlay[0], fit } } });
  };

  const sendVideoToScreen = (url: string, fit: "cover" | "contain" | "fill" = "cover", loop = true) => {
    if (!url) return;
    updateScreen({ data: { ...safeFullState(), isBlack: false, isClear: false, contentType: "video" as const, background: { type: "video", value: url, overlay: overlay[0], fit, loop } } });
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
          <h1 className="text-3xl font-bold tracking-tight">Media & Broadcasting</h1>
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
        <TabsList className="w-full flex-wrap h-auto gap-0.5">
          <TabsTrigger value="upload"    className="flex-1 gap-1.5 min-w-0"><Upload   className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Upload</span></TabsTrigger>
          <TabsTrigger value="camera"    className="flex-1 gap-1.5 min-w-0"><Camera   className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Camera</span></TabsTrigger>
          <TabsTrigger value="url"       className="flex-1 gap-1.5 min-w-0"><Video    className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">URL</span></TabsTrigger>
          <TabsTrigger value="overlays"  className="flex-1 gap-1.5 min-w-0"><Layers3  className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Overlays</span></TabsTrigger>
          <TabsTrigger value="broadcast" className="flex-1 gap-1.5 min-w-0"><Settings2 className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Broadcast</span></TabsTrigger>
        </TabsList>

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

        {/* ── CAMERA ── */}
        <TabsContent value="camera" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Camera className="w-4 h-4" /> Live Camera Feed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cameras.length > 0 && (
                  <div className="flex gap-2 items-center">
                    <Select value={selectedCameraId} onValueChange={switchCamera} disabled={cameras.length <= 1}>
                      <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Select camera…" /></SelectTrigger>
                      <SelectContent>
                        {cameras.map((c, i) => (
                          <SelectItem key={c.deviceId} value={c.deviceId} className="text-xs">{c.label || `Camera ${i + 1}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={enumerateCameras} title="Refresh list" className="h-8 w-8 p-0 shrink-0">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                {cameras.length === 0 && !cameraStream && (
                  <p className="text-xs text-muted-foreground">Start the camera to see available devices.</p>
                )}

                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border flex items-center justify-center">
                  {cameraStream
                    ? <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center gap-3 text-muted-foreground"><CameraOff className="w-10 h-10" /><span className="text-sm">Camera not started</span></div>
                  }
                </div>

                {cameraError && <p className="text-destructive text-sm">{cameraError}</p>}

                <div className="flex gap-2">
                  {!cameraStream
                    ? <Button onClick={() => startCamera(selectedCameraId || undefined)} className="flex-1 gap-2"><Play className="w-4 h-4" /> Start Camera</Button>
                    : <Button variant="outline" onClick={stopCamera} className="flex-1 gap-2"><Square className="w-4 h-4" /> Stop</Button>
                  }
                  <Button onClick={sendCameraToScreen} disabled={!cameraStream} className="flex-1 gap-2">
                    <Cast className="w-4 h-4" /> Send to Screen
                  </Button>
                  <Button variant="destructive" onClick={cutFeed} title="Stop camera and black the screen" className="gap-2 shrink-0">
                    <Scissors className="w-4 h-4" /> Cut
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Camera Layout</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Layout mode */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Display Mode</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { value: "fullscreen",       label: "Fullscreen" },
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
                </div>

                {/* Shape — only for PiP */}
                {isPip && (
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
                )}

                {/* PiP size */}
                {isPip && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">PiP Size</label>
                      <span className="text-xs text-muted-foreground">{camPipSize}% of width</span>
                    </div>
                    <SliderWithButtons min={15} max={55} step={5} value={[camPipSize]} onValueChange={([v]) => setCamPipSize(v)} />
                  </div>
                )}

                {/* Side-by-side: pick the bg for the text-side panel so it matches the theme */}
                {isSide && (() => {
                  const presets: { label: string; value: string }[] = [
                    { label: "Indigo",  value: "linear-gradient(135deg,#1e1b4b 0%,#0f0a2e 100%)" },
                    { label: "Slate",   value: "linear-gradient(135deg,#1e293b 0%,#0f172a 100%)" },
                    { label: "Plum",    value: "linear-gradient(135deg,#3b0764 0%,#1e0533 100%)" },
                    { label: "Forest",  value: "linear-gradient(135deg,#064e3b 0%,#022c22 100%)" },
                    { label: "Crimson", value: "linear-gradient(135deg,#7f1d1d 0%,#3b0a0a 100%)" },
                    { label: "Black",   value: "#000000" },
                    { label: "Charcoal",value: "#0a0a0a" },
                    { label: "White",   value: "#ffffff" },
                  ];
                  return (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <label className="text-sm font-medium">Text-Side Background</label>
                      <p className="text-[11px] text-muted-foreground">Color or gradient shown behind the text panel (the half without the camera).</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {presets.map(p => (
                          <button
                            key={p.label}
                            type="button"
                            data-testid={`button-cam-side-bg-${p.label.toLowerCase()}`}
                            onClick={() => setCamSideBg(p.value)}
                            className={`h-9 rounded border transition-colors flex items-center justify-center ${camSideBg === p.value ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40"}`}
                            style={{ background: p.value }}
                          >
                            <span className="text-[10px] font-medium" style={{ color: p.value === "#ffffff" ? "#000" : "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{p.label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={camSideBg.startsWith("#") ? camSideBg : "#1e1b4b"}
                          onChange={e => setCamSideBg(e.target.value)}
                          className="h-8 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5 shrink-0"
                        />
                        <Input
                          className="h-8 text-[11px] font-mono"
                          value={camSideBg}
                          onChange={e => setCamSideBg(e.target.value)}
                          placeholder="#000 or linear-gradient(...)"
                          data-testid="input-cam-side-bg"
                        />
                      </div>
                    </div>
                  );
                })()}

                {(isPip || isSide) && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                    {isSide
                      ? "Camera occupies half the screen. The other half uses your chosen background and shows content/overlays normally."
                      : "Camera appears as an overlay in the chosen corner. Content and other overlays show normally beneath it."
                    }
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── URL ── */}
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

        {/* ── BROADCAST SETTINGS ── */}
        <TabsContent value="broadcast" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
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

              {/* ── Recording ── */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2"><Radio className="w-4 h-4" /> Record &amp; Broadcast</CardTitle>
                    {recState === "recording" && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                        <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500 animate-pulse" />
                        {String(Math.floor(recDuration / 60)).padStart(2, "0")}:{String(recDuration % 60).padStart(2, "0")}
                      </div>
                    )}
                  </div>
                  <CardDescription>Record the presentation screen as a video file, or capture with OBS</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recState === "idle" ? (
                    <Button onClick={startRecording} className="w-full gap-2">
                      <Circle className="w-3.5 h-3.5 fill-red-500 text-red-500" /> Start Recording
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                        <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500 animate-pulse" />
                        <span className="text-sm font-medium text-red-400">Recording</span>
                        <span className="ml-auto text-sm font-mono text-red-400 tabular-nums">
                          {String(Math.floor(recDuration / 60)).padStart(2, "0")}:{String(recDuration % 60).padStart(2, "0")}
                        </span>
                      </div>
                      <Button variant="destructive" onClick={stopRecording} className="w-full gap-2">
                        <StopCircle className="w-4 h-4" /> Stop Recording
                      </Button>
                    </div>
                  )}
                  {recDownloadUrl && (
                    <div className="flex items-center gap-2">
                      <a href={recDownloadUrl} download={`worship-${new Date().toISOString().slice(0,10)}.webm`} className="flex-1">
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="w-4 h-4" /> Download Recording
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" onClick={clearDownload} title="Discard">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div>
                      <p className="text-xs font-medium text-foreground">Include microphone audio</p>
                      <p className="text-[11px] text-muted-foreground">Mix your microphone with the captured display audio</p>
                    </div>
                    <Switch checked={recIncludeMic} onCheckedChange={setRecIncludeMic} disabled={recState === "recording"} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Clicking "Start Recording" prompts you to pick the broadcast window or display. Recording continues even if you switch tabs.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
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

              {/* Live preview */}
              <div className="rounded-md overflow-hidden border border-border" style={{ background: "#0b0b0b" }}>
                <div style={{ background: tickerBgColorDraft, padding: "8px 0", overflow: "hidden", whiteSpace: "nowrap" }}>
                  <div style={{ display: "inline-block", color: tickerColorDraft, fontSize: `${tickerFontSizeDraft}px`, paddingLeft: "100%", animation: `wf-ticker ${tickerSpeedDraft}s linear infinite` }}>
                    {tickerTextDraft || "Welcome to our service today!"}
                    <span style={{ margin: "0 2em", opacity: 0.6 }}>{tickerDividerDraft}</span>
                    {tickerTextDraft || "Welcome to our service today!"}
                    <span style={{ margin: "0 2em", opacity: 0.6 }}>{tickerDividerDraft}</span>
                    {tickerTextDraft || "Welcome to our service today!"}
                  </div>
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

        </TabsContent>
      </Tabs>
    </div>
  );
}
