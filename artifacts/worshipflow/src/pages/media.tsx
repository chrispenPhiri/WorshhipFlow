import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Video, Image, Cast, CameraOff, ExternalLink, Play, Square } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream]);

  const base = screenState ?? {
    isBlack: false,
    isClear: false,
    contentType: "none" as const,
    textStyle: { fontFamily: "Inter", fontSize: 64, textColor: "#ffffff", accentColor: "#f59e0b", bold: false, italic: false, alignment: "center" as const, animation: "none" as const },
  };

  const sendCameraToScreen = () => {
    updateScreen({
      data: {
        ...base,
        isBlack: false,
        isClear: false,
        contentType: "custom_text",
        background: { type: "camera", value: "camera", overlay: overlay[0] },
      },
    });
  };

  const sendImageToScreen = () => {
    if (!imageUrl) return;
    updateScreen({
      data: {
        ...base,
        isBlack: false,
        isClear: false,
        background: { type: "image", value: imageUrl, overlay: overlay[0] },
      },
    });
  };

  const sendVideoToScreen = () => {
    if (!videoUrl) return;
    updateScreen({
      data: {
        ...base,
        isBlack: false,
        isClear: false,
        contentType: "video",
        background: { type: "video", value: videoUrl, overlay: overlay[0] },
      },
    });
  };

  const openBroadcastWindow = () => {
    window.open(window.location.origin + import.meta.env.BASE_URL + "broadcast", "_blank", "noopener");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Media & Broadcasting</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Camera, video, and image backgrounds for live presentation</p>
          </div>
        </div>
        <Button variant="outline" onClick={openBroadcastWindow} className="gap-2">
          <ExternalLink className="w-4 h-4" />
          Open Broadcast Window
        </Button>
      </div>

      {/* Overlay slider (shared) */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap w-28">Dark Overlay: {overlay[0]}%</label>
            <Slider
              value={overlay}
              onValueChange={setOverlay}
              min={0}
              max={90}
              step={5}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="camera">
        <TabsList className="w-full">
          <TabsTrigger value="camera" className="flex-1 gap-2"><Camera className="w-4 h-4" /> Camera</TabsTrigger>
          <TabsTrigger value="video" className="flex-1 gap-2"><Video className="w-4 h-4" /> Video</TabsTrigger>
          <TabsTrigger value="image" className="flex-1 gap-2"><Image className="w-4 h-4" /> Image</TabsTrigger>
        </TabsList>

        {/* Camera tab */}
        <TabsContent value="camera" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Live Camera Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border flex items-center justify-center relative">
                  {cameraStream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <CameraOff className="w-10 h-10" />
                      <span className="text-sm">Camera not started</span>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <p className="text-destructive text-sm">{cameraError}</p>
                )}

                <div className="flex gap-2">
                  {!cameraStream ? (
                    <Button onClick={startCamera} className="flex-1 gap-2">
                      <Play className="w-4 h-4" /> Start Camera
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={stopCamera} className="flex-1 gap-2">
                      <Square className="w-4 h-4" /> Stop Camera
                    </Button>
                  )}
                  <Button
                    onClick={sendCameraToScreen}
                    disabled={!cameraStream}
                    className="flex-1 gap-2"
                  >
                    <Cast className="w-4 h-4" /> Send to Screen
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>1. Click <strong className="text-foreground">Start Camera</strong> to access your webcam.</p>
                <p>2. Preview the feed in the box on the left.</p>
                <p>3. Click <strong className="text-foreground">Send to Screen</strong> to set it as the live background.</p>
                <p>4. Open the <strong className="text-foreground">Broadcast Window</strong> on your secondary display — it will show the camera feed full-screen.</p>
                <p>5. You can still send text (Bible verses, songs) on top of the camera background.</p>
                <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <p className="text-foreground font-medium">Broadcasting Tip</p>
                  <p className="mt-1">Open the Broadcast Window on your projector screen. It polls for changes every 500ms so updates appear almost instantly.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Video tab */}
        <TabsContent value="video" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-4 h-4" /> Video Background
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Video URL</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/background.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={() => {
                    if (fileVideoRef.current && videoUrl) {
                      fileVideoRef.current.src = videoUrl;
                      fileVideoRef.current.play().catch(() => {});
                    }
                  }}>Preview</Button>
                </div>
                <p className="text-xs text-muted-foreground">Paste a direct link to an .mp4 or .webm video file</p>
              </div>

              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                <video
                  ref={fileVideoRef}
                  className="w-full h-full object-cover"
                  loop
                  muted
                  playsInline
                />
              </div>

              <Button onClick={sendVideoToScreen} disabled={!videoUrl} className="w-full gap-2">
                <Cast className="w-4 h-4" /> Send Video to Screen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Image tab */}
        <TabsContent value="image" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-4 h-4" /> Image Background
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Image URL</label>
                <Input
                  placeholder="https://example.com/background.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Paste a direct link to an image (.jpg, .png, .webp)</p>
              </div>

              {imageUrl && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}

              <Button onClick={sendImageToScreen} disabled={!imageUrl} className="w-full gap-2">
                <Cast className="w-4 h-4" /> Send Image to Screen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
