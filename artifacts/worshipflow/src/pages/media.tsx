import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera, Video, Image, Cast, CameraOff, Play, Square,
  MonitorSpeaker, Monitor, Settings2, Loader2, CheckCircle2,
  PictureInPicture2, Maximize2, EyeOff, RotateCcw, ChevronRight,
  Upload, X, FileImage, FileVideo, User, Clock, Scissors, RefreshCw, Layers3
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBroadcast, type ScreenInfo } from "@/hooks/use-broadcast";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
  size: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [overlay, setOverlay] = useState([0]);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [draggingOver, setDraggingOver] = useState(false);

  // Lower-third state (local draft before sending)
  const [ltName, setLtName] = useState("");
  const [ltTitleText, setLtTitleText] = useState("");
  const [ltPosition, setLtPosition] = useState<"bottom-left" | "bottom-center" | "bottom-right">("bottom-left");
  const [ltStyle, setLtStyle] = useState<"modern" | "classic" | "gradient" | "minimal">("modern");

  const { toast } = useToast();

  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 2000 },
  });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  const {
    screens, permissionState, settings, updateSettings,
    detectScreens, openBroadcast, isWindowManagementSupported,
  } = useBroadcast();

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(f => {
        if (f.url.startsWith("blob:")) URL.revokeObjectURL(f.url);
      });
    };
  }, [uploadedFiles]);

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
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" },
        audio: false,
      };
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
  };

  const switchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    await startCamera(deviceId);
  };

  const cutFeed = () => {
    stopCamera();
    updateScreen({ data: { isBlack: true, isClear: false, contentType: (screenState?.contentType ?? "none") as "none" | "verse" | "song" | "custom_text" | "image" | "video" } });
    toast({ title: "Feed cut", description: "Camera stopped and screen blacked out." });
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
    lowerThirdEnabled: screenState?.lowerThirdEnabled ?? false,
    lowerThirdName: screenState?.lowerThirdName ?? undefined,
    lowerThirdTitle: screenState?.lowerThirdTitle ?? undefined,
    lowerThirdPosition: (screenState?.lowerThirdPosition ?? "bottom-left") as "bottom-left" | "bottom-center" | "bottom-right",
    lowerThirdStyle: (screenState?.lowerThirdStyle ?? "modern") as "modern" | "classic" | "gradient" | "minimal",
    clockOverlayEnabled: screenState?.clockOverlayEnabled ?? false,
    clockPosition: (screenState?.clockPosition ?? "top-right") as "top-left" | "top-right" | "bottom-left" | "bottom-right",
    clockStyle: (screenState?.clockStyle ?? "digital") as "digital" | "clean",
  });

  const updateOverlay = (patch: Partial<ReturnType<typeof safeFullState>>) =>
    updateScreen({ data: { ...safeFullState(), ...patch } });

  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()); };
  }, [cameraStream]);

  const base = screenState ?? { isBlack: false, isClear: false, contentType: "none" as const };

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

  const sendCameraToScreen = () => updateScreen({ data: { ...base, isBlack: false, isClear: false, contentType: "custom_text" as const, background: { type: "camera", value: "camera", overlay: overlay[0] } } });

  const sendImageToScreen = async (url: string) => {
    if (!url) return;
    // Convert blob URLs to data URLs so they work in the broadcast window
    const resolved = url.startsWith("blob:") ? await blobToDataUrl(url).catch(() => url) : url;
    updateScreen({ data: { ...base, isBlack: false, isClear: false, contentType: "image" as const, background: { type: "image", value: resolved, overlay: overlay[0] } } });
  };

  const sendVideoToScreen = (url: string) => { if (!url) return; updateScreen({ data: { ...base, isBlack: false, isClear: false, contentType: "video" as const, background: { type: "video", value: url, overlay: overlay[0] } } }); };

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
      setUploadedFiles(prev => [...prev, {
        id,
        name: file.name,
        url,
        type: isImage ? "image" : "video",
        size: formatBytes(file.size),
      }]);
    });
  }, [toast]);

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
            <Slider value={overlay} onValueChange={setOverlay} min={0} max={90} step={5} className="flex-1" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="upload">
        <TabsList className="w-full flex-wrap h-auto gap-0.5">
          <TabsTrigger value="upload" className="flex-1 gap-1.5 min-w-0"><Upload className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Upload</span></TabsTrigger>
          <TabsTrigger value="camera" className="flex-1 gap-1.5 min-w-0"><Camera className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Camera</span></TabsTrigger>
          <TabsTrigger value="url" className="flex-1 gap-1.5 min-w-0"><Video className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">URL</span></TabsTrigger>
          <TabsTrigger value="overlays" className="flex-1 gap-1.5 min-w-0"><Layers3 className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Overlays</span></TabsTrigger>
          <TabsTrigger value="broadcast" className="flex-1 gap-1.5 min-w-0"><Settings2 className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Broadcast</span></TabsTrigger>
        </TabsList>

        {/* ── UPLOAD ── */}
        <TabsContent value="upload" className="mt-4 space-y-4">
          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              draggingOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            onClick={() => imageInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDraggingOver(true); }}
            onDragLeave={() => setDraggingOver(false)}
            onDrop={onDrop}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Drop images or videos here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse — JPG, PNG, GIF, WebP, MP4, WebM</p>
            <div className="flex justify-center gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={e => { e.stopPropagation(); imageInputRef.current?.click(); }}
                className="gap-1.5"
              >
                <FileImage className="w-4 h-4" /> Images
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={e => { e.stopPropagation(); videoInputRef.current?.click(); }}
                className="gap-1.5"
              >
                <FileVideo className="w-4 h-4" /> Videos
              </Button>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => handleFileUpload(e.target.files)}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={e => handleFileUpload(e.target.files)}
            />
          </div>

          <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
            Uploaded files are available for this browser session. Re-upload after refreshing the page.
          </div>

          {/* Uploaded file grid */}
          {uploadedFiles.length > 0 && (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {uploadedFiles.map(f => (
                <Card key={f.id} className="overflow-hidden">
                  <div className="relative aspect-video bg-black">
                    {f.type === "image" ? (
                      <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                    ) : (
                      <video src={f.url} className="w-full h-full object-cover" muted playsInline />
                    )}
                    <button
                      onClick={() => removeFile(f.id)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <Badge className="absolute bottom-1.5 left-1.5 text-[10px] py-0 bg-black/60 border-0 capitalize">
                      {f.type}
                    </Badge>
                  </div>
                  <CardContent className="p-2 space-y-1.5">
                    <p className="text-xs font-medium truncate" title={f.name}>{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.size}</p>
                    <Button
                      size="sm"
                      className="w-full gap-1.5 h-7 text-xs"
                      onClick={() => f.type === "image" ? sendImageToScreen(f.url) : sendVideoToScreen(f.url)}
                    >
                      <Cast className="w-3 h-3" /> Send to Screen
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {uploadedFiles.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No files uploaded yet
            </div>
          )}
        </TabsContent>

        {/* ── CAMERA ── */}
        <TabsContent value="camera" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Camera className="w-4 h-4" /> Live Camera Feed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera device selector (shows after permission granted) */}
                {cameras.length > 0 && (
                  <div className="flex gap-2 items-center">
                    <Select value={selectedCameraId} onValueChange={switchCamera} disabled={cameras.length <= 1}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Select camera…" />
                      </SelectTrigger>
                      <SelectContent>
                        {cameras.map((c, i) => (
                          <SelectItem key={c.deviceId} value={c.deviceId} className="text-xs">
                            {c.label || `Camera ${i + 1}`}
                          </SelectItem>
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
                  <Button
                    variant="destructive"
                    onClick={cutFeed}
                    title="Stop camera and black the screen immediately"
                    className="gap-2 shrink-0"
                  >
                    <Scissors className="w-4 h-4" /> Cut
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tips</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>1. Click <strong className="text-foreground">Start Camera</strong> to access your webcam.</p>
                <p>2. A device selector appears if multiple cameras are detected — use it to switch between them.</p>
                <p>3. Click <strong className="text-foreground">Send to Screen</strong> to use the camera feed as a live background.</p>
                <p>4. Press <strong className="text-destructive/90">Cut</strong> to instantly stop the camera and black out the presentation screen.</p>
                <p>5. Bible verses or songs can be displayed on top of the camera background.</p>
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
            <CardHeader><CardTitle className="flex items-center gap-2"><Image className="w-4 h-4" /> Image from URL</CardTitle></CardHeader>
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
            </div>
          </div>
        </TabsContent>

        {/* ── OVERLAYS ── */}
        <TabsContent value="overlays" className="mt-4 space-y-4">

          {/* Presenter Lower-Third */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4" /> Presenter Lower-Third
                </CardTitle>
                <div className="flex items-center gap-2">
                  {screenState?.lowerThirdEnabled && (
                    <Badge className="text-[10px] py-0 h-4 bg-green-600 border-0">LIVE</Badge>
                  )}
                  <Switch
                    checked={screenState?.lowerThirdEnabled ?? false}
                    onCheckedChange={v => updateOverlay({ lowerThirdEnabled: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={ltName}
                    onChange={e => setLtName(e.target.value)}
                    placeholder="Pastor John Smith"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Title / Role</label>
                  <Input
                    value={ltTitleText}
                    onChange={e => setLtTitleText(e.target.value)}
                    placeholder="Lead Pastor"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Position</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["bottom-left", "bottom-center", "bottom-right"] as const).map(pos => (
                    <button
                      key={pos}
                      onClick={() => setLtPosition(pos)}
                      className={`py-1.5 rounded text-xs transition-colors border ${ltPosition === pos ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                    >
                      {pos === "bottom-left" ? "Bottom Left" : pos === "bottom-center" ? "Center" : "Bottom Right"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Style</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["modern", "classic", "gradient", "minimal"] as const).map(sty => (
                    <button
                      key={sty}
                      onClick={() => setLtStyle(sty)}
                      className={`py-1.5 rounded text-xs capitalize transition-colors border ${ltStyle === sty ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                    >
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

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => updateOverlay({
                    lowerThirdEnabled: true,
                    lowerThirdName: ltName || undefined,
                    lowerThirdTitle: ltTitleText || undefined,
                    lowerThirdPosition: ltPosition,
                    lowerThirdStyle: ltStyle,
                  })}
                  disabled={!ltName}
                >
                  <Cast className="w-4 h-4" /> Show Lower Third
                </Button>
                {screenState?.lowerThirdEnabled && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => updateOverlay({ lowerThirdEnabled: false })}
                  >
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4" /> Clock Overlay
                </CardTitle>
                <div className="flex items-center gap-2">
                  {screenState?.clockOverlayEnabled && (
                    <Badge className="text-[10px] py-0 h-4 bg-green-600 border-0">LIVE</Badge>
                  )}
                  <Switch
                    checked={screenState?.clockOverlayEnabled ?? false}
                    onCheckedChange={v => updateOverlay({ clockOverlayEnabled: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Position</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map(pos => (
                    <button
                      key={pos}
                      onClick={() => updateOverlay({ clockPosition: pos })}
                      className={`py-1.5 rounded text-xs transition-colors border capitalize ${(screenState?.clockPosition ?? "top-right") === pos ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                    >
                      {pos.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "digital", label: "Digital — HH:MM:SS" },
                    { value: "clean",   label: "Clean — HH:MM" },
                  ] as const).map(s => (
                    <button
                      key={s.value}
                      onClick={() => updateOverlay({ clockStyle: s.value })}
                      className={`py-1.5 rounded text-xs transition-colors border ${(screenState?.clockStyle ?? "digital") === s.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}
