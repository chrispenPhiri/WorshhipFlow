import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera, Video, Image, Cast, CameraOff, Play, Square,
  MonitorSpeaker, Monitor, Settings2, Loader2, CheckCircle2,
  PictureInPicture2, Maximize2, EyeOff, RotateCcw, ChevronRight
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useBroadcast, type ScreenInfo } from "@/hooks/use-broadcast";

export default function MediaPage() {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileVideoRef = useRef<HTMLVideoElement>(null);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState([0]);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 2000 },
  });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  const {
    screens,
    permissionState,
    settings,
    updateSettings,
    detectScreens,
    openBroadcast,
    isWindowManagementSupported,
  } = useBroadcast();

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop()); };
  }, [cameraStream]);

  const base = screenState ?? {
    isBlack: false, isClear: false, contentType: "none" as const,
    textStyle: { fontFamily: "Inter", fontSize: 64, textColor: "#ffffff", bold: false, italic: false, alignment: "center" as const, animation: "none" as const },
  };

  const sendCameraToScreen = () => updateScreen({ data: { ...base, isBlack: false, isClear: false, contentType: "custom_text", background: { type: "camera", value: "camera", overlay: overlay[0] } } });
  const sendImageToScreen = () => { if (!imageUrl) return; updateScreen({ data: { ...base, isBlack: false, isClear: false, background: { type: "image", value: imageUrl, overlay: overlay[0] } } }); };
  const sendVideoToScreen = () => { if (!videoUrl) return; updateScreen({ data: { ...base, isBlack: false, isClear: false, contentType: "video", background: { type: "video", value: videoUrl, overlay: overlay[0] } } }); };

  const handleDetectScreens = async () => { await detectScreens(); };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <Video className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media & Broadcasting</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Camera, video, image backgrounds and broadcast output settings</p>
        </div>
      </div>

      {/* Dark overlay (shared across tabs) */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap w-32">Dark Overlay: {overlay[0]}%</label>
            <Slider value={overlay} onValueChange={setOverlay} min={0} max={90} step={5} className="flex-1" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="camera">
        <TabsList className="w-full">
          <TabsTrigger value="camera" className="flex-1 gap-2"><Camera className="w-4 h-4" /> Camera</TabsTrigger>
          <TabsTrigger value="video" className="flex-1 gap-2"><Video className="w-4 h-4" /> Video</TabsTrigger>
          <TabsTrigger value="image" className="flex-1 gap-2"><Image className="w-4 h-4" /> Image</TabsTrigger>
          <TabsTrigger value="broadcast" className="flex-1 gap-2"><Settings2 className="w-4 h-4" /> Broadcast Settings</TabsTrigger>
        </TabsList>

        {/* ── CAMERA ── */}
        <TabsContent value="camera" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="w-4 h-4" /> Live Camera Feed</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border flex items-center justify-center">
                  {cameraStream
                    ? <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center gap-3 text-muted-foreground"><CameraOff className="w-10 h-10" /><span className="text-sm">Camera not started</span></div>
                  }
                </div>
                {cameraError && <p className="text-destructive text-sm">{cameraError}</p>}
                <div className="flex gap-2">
                  {!cameraStream
                    ? <Button onClick={startCamera} className="flex-1 gap-2"><Play className="w-4 h-4" /> Start Camera</Button>
                    : <Button variant="outline" onClick={stopCamera} className="flex-1 gap-2"><Square className="w-4 h-4" /> Stop Camera</Button>
                  }
                  <Button onClick={sendCameraToScreen} disabled={!cameraStream} className="flex-1 gap-2"><Cast className="w-4 h-4" /> Send to Screen</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>How It Works</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>1. Click <strong className="text-foreground">Start Camera</strong> to access your webcam.</p>
                <p>2. Preview the feed in the box on the left.</p>
                <p>3. Click <strong className="text-foreground">Send to Screen</strong> to set it as the live background.</p>
                <p>4. Open the Broadcast Window on your projector — it shows the camera feed full-screen.</p>
                <p>5. You can still send Bible verses or songs on top of the camera background.</p>
                <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <p className="text-foreground font-medium">Tip</p>
                  <p className="mt-1">The broadcast window polls for changes every 500ms so text updates appear almost instantly on screen.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── VIDEO ── */}
        <TabsContent value="video" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Video className="w-4 h-4" /> Video Background</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Video URL</label>
                <div className="flex gap-2">
                  <Input placeholder="https://example.com/background.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="flex-1" />
                  <Button variant="outline" onClick={() => { if (fileVideoRef.current && videoUrl) { fileVideoRef.current.src = videoUrl; fileVideoRef.current.play().catch(() => {}); } }}>Preview</Button>
                </div>
                <p className="text-xs text-muted-foreground">Paste a direct link to an .mp4 or .webm video file</p>
              </div>
              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                <video ref={fileVideoRef} className="w-full h-full object-cover" loop muted playsInline />
              </div>
              <Button onClick={sendVideoToScreen} disabled={!videoUrl} className="w-full gap-2"><Cast className="w-4 h-4" /> Send Video to Screen</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── IMAGE ── */}
        <TabsContent value="image" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Image className="w-4 h-4" /> Image Background</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Image URL</label>
                <Input placeholder="https://example.com/background.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                <p className="text-xs text-muted-foreground">Paste a direct link to an image (.jpg, .png, .webp)</p>
              </div>
              {imageUrl && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
              <Button onClick={sendImageToScreen} disabled={!imageUrl} className="w-full gap-2"><Cast className="w-4 h-4" /> Send Image to Screen</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BROADCAST SETTINGS ── */}
        <TabsContent value="broadcast" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">

            {/* Screen / Display selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MonitorSpeaker className="w-4 h-4" /> Display Selection</CardTitle>
                <CardDescription>Choose which screen to open the broadcast window on</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isWindowManagementSupported ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleDetectScreens}
                      disabled={permissionState === "requesting"}
                    >
                      {permissionState === "requesting"
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting displays…</>
                        : <><Monitor className="w-4 h-4" /> Detect Connected Displays</>
                      }
                    </Button>

                    {permissionState === "denied" && (
                      <p className="text-destructive text-sm">Permission denied. Allow "Window Management" in browser settings.</p>
                    )}

                    {screens.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{screens.length} display{screens.length > 1 ? "s" : ""} found</p>
                        {screens.map((s: ScreenInfo, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:border-primary/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <Monitor className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{s.label}</p>
                                <p className="text-xs text-muted-foreground">{s.width}×{s.height}{s.isPrimary ? " · Primary" : ""}{s.isInternal ? " · Built-in" : ""}</p>
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
                        Only one display detected. Connect a second monitor or projector and re-detect.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-sm text-amber-200">
                      Multi-screen support requires Chrome 100+ with the Window Management API. In other browsers, the broadcast window opens in a new tab.
                    </div>
                    <Button className="w-full gap-2" onClick={() => openBroadcast()}>
                      <MonitorSpeaker className="w-4 h-4" /> Open Broadcast Window
                    </Button>
                  </div>
                )}

                {screens.length > 0 && (
                  <Button className="w-full gap-2 mt-2" onClick={() => openBroadcast()}>
                    <MonitorSpeaker className="w-4 h-4" /> Open (let browser choose)
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Broadcast behaviour settings */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Window Behaviour</CardTitle>
                  <CardDescription>Saved automatically — applied when opening broadcast</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <SettingRow
                    icon={<Maximize2 className="w-4 h-4" />}
                    label="Auto-fullscreen"
                    description="Enter fullscreen immediately when the broadcast window opens"
                    checked={settings.autoFullscreen}
                    onCheckedChange={(v) => updateSettings({ autoFullscreen: v })}
                  />
                  <SettingRow
                    icon={<EyeOff className="w-4 h-4" />}
                    label="Hide cursor"
                    description="Hide mouse pointer on the broadcast window for a clean projection"
                    checked={settings.hideCursor}
                    onCheckedChange={(v) => updateSettings({ hideCursor: v })}
                  />
                  <SettingRow
                    icon={<RotateCcw className="w-4 h-4" />}
                    label="Loop video"
                    description="Automatically loop video backgrounds when they reach the end"
                    checked={settings.loopVideo}
                    onCheckedChange={(v) => updateSettings({ loopVideo: v })}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><PictureInPicture2 className="w-4 h-4" /> Picture-in-Picture</CardTitle>
                  <CardDescription>Float the broadcast output as a mini overlay</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Open the broadcast window first, then hover near the top of the window to reveal the control bar. Click the PiP button to float a mini version on top of all other windows.</p>
                  <ul className="space-y-1 list-disc list-inside text-xs">
                    <li><strong className="text-foreground">Video/Camera background</strong> — uses native video PiP (any browser)</li>
                    <li><strong className="text-foreground">Other backgrounds</strong> — uses Document PiP (Chrome 116+)</li>
                  </ul>
                  <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <p className="text-foreground font-medium">Useful for operators</p>
                    <p className="mt-1">Keep the PiP window floating while you browse songs or Bible verses — you always see what's live on the projector.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingRow({ icon, label, description, checked, onCheckedChange }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0 mt-0.5" />
    </div>
  );
}
