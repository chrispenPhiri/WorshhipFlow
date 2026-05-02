import { useEffect, useRef, useState } from "react";
import { useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { Maximize2, Minimize2 } from "lucide-react";
import { LiveWallpaperLayer } from "@/components/live-wallpaper";

const ANIMATION_STYLES = `
@keyframes wf-fade-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wf-glow {
  0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.15); }
  50%       { text-shadow: 0 0 40px rgba(255,255,255,0.9), 0 0 100px rgba(255,255,255,0.4); }
}
@keyframes wf-float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-12px); }
}
@keyframes wf-ticker {
  from { transform: translateX(100vw); }
  to   { transform: translateX(-100%); }
}
`;

function getAnimationClass(animation: string | undefined) {
  if (!animation || animation === "none") return {};
  if (animation === "fade_in")
    return { animation: "wf-fade-in 0.8s ease-out forwards" };
  if (animation === "glow")
    return { animation: "wf-glow 3s ease-in-out infinite" };
  if (animation === "float")
    return { animation: "wf-float 4s ease-in-out infinite" };
  return {};
}

function BackgroundLayer({ background, cameraStream }: {
  background?: { type: string; value: string; overlay?: number } | null;
  cameraStream: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (background?.type === "video" && videoRef.current && background.value) {
      videoRef.current.src = background.value;
      videoRef.current.play().catch(() => {});
    }
  }, [background?.type, background?.value]);

  useEffect(() => {
    if (cameraRef.current && cameraStream) {
      cameraRef.current.srcObject = cameraStream;
      cameraRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  if (!background) return <div className="absolute inset-0 bg-black" />;

  const overlay = background.overlay ?? 0;
  const overlayStyle = overlay > 0
    ? { background: `rgba(0,0,0,${overlay / 100})` }
    : undefined;

  if (background.type === "color") {
    return (
      <div className="absolute inset-0" style={{ backgroundColor: background.value || "#000000" }} />
    );
  }

  if (background.type === "gradient") {
    return (
      <div className="absolute inset-0" style={{ background: background.value || "linear-gradient(135deg,#1e1b4b,#000)" }} />
    );
  }

  if (background.type === "image" && background.value) {
    return (
      <div className="absolute inset-0">
        <img
          src={background.value}
          alt=""
          className="w-full h-full object-cover"
        />
        {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
      </div>
    );
  }

  if (background.type === "video" && background.value) {
    return (
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
        {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
      </div>
    );
  }

  if (background.type === "camera") {
    return (
      <div className="absolute inset-0 bg-black">
        {cameraStream && (
          <video
            ref={cameraRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
        )}
        {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
      </div>
    );
  }

  if (background.type === "live_wallpaper" && background.value) {
    return (
      <LiveWallpaperLayer wallpaperId={background.value} overlay={overlay} />
    );
  }

  return <div className="absolute inset-0 bg-black" />;
}

export default function BroadcastPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentKey, setContentKey] = useState(0);
  const prevContentRef = useRef<string>("");

  const { data: screenState } = useGetScreenState({
    query: {
      queryKey: getGetScreenStateQueryKey(),
      refetchInterval: 500,
    },
  });

  const currentContent = screenState?.content ?? "";
  const currentTitle = screenState?.title ?? "";

  useEffect(() => {
    const id = `${currentTitle}::${currentContent}`;
    if (id !== prevContentRef.current) {
      prevContentRef.current = id;
      setContentKey((k) => k + 1);
    }
  }, [currentTitle, currentContent]);

  useEffect(() => {
    if (screenState?.background?.type === "camera" && !cameraStream) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => setCameraStream(stream))
        .catch((err) => console.warn("Camera access denied:", err));
    } else if (screenState?.background?.type !== "camera" && cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  }, [screenState?.background?.type]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const textStyle = screenState?.textStyle;
  const bg = screenState?.background;

  const contentStyle: React.CSSProperties = textStyle
    ? {
        fontFamily: textStyle.fontFamily,
        fontSize: `${textStyle.fontSize}px`,
        color: textStyle.textColor,
        fontWeight: textStyle.bold ? "bold" : "normal",
        fontStyle: textStyle.italic ? "italic" : "normal",
        textAlign: textStyle.alignment as "left" | "center" | "right",
        lineHeight: 1.3,
        ...getAnimationClass(textStyle.animation),
      }
    : { color: "#ffffff", fontSize: "64px", textAlign: "center" };

  const showContent =
    screenState &&
    !screenState.isBlack &&
    !screenState.isClear &&
    screenState.content;

  const tickerSpeed = 20;

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-black select-none"
    >
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />

      {/* Background */}
      <BackgroundLayer background={bg} cameraStream={cameraStream} />

      {/* Black screen overlay */}
      {screenState?.isBlack && (
        <div className="absolute inset-0 bg-black z-40" />
      )}

      {/* Content */}
      {showContent && (
        <div
          key={contentKey}
          className="absolute inset-0 z-20 flex items-center justify-center p-16"
        >
          <div style={contentStyle} className="max-w-5xl w-full whitespace-pre-wrap drop-shadow-lg">
            {screenState.content}
          </div>
        </div>
      )}

      {/* Reference/title bar (small, top-left, semi-transparent) */}
      {showContent && screenState?.title && (
        <div className="absolute top-4 left-6 z-30 text-white/40 text-sm font-light tracking-wide">
          {screenState.title}
        </div>
      )}

      {/* Ticker */}
      {screenState?.tickerEnabled && screenState.tickerText && (
        <div
          className="absolute bottom-0 left-0 right-0 z-30 flex items-center overflow-hidden"
          style={{ height: "48px", background: "rgba(0,0,0,0.75)", borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 500,
              letterSpacing: "0.02em",
              animation: `wf-ticker ${tickerSpeed}s linear infinite`,
            }}
          >
            {screenState.tickerText}
            &nbsp;&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;&nbsp;
            {screenState.tickerText}
          </div>
        </div>
      )}

      {/* Fullscreen toggle button (visible on hover) */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-50 p-2 rounded-md bg-black/50 text-white/60 hover:text-white hover:bg-black/80 transition-all opacity-0 hover:opacity-100 focus:opacity-100"
        style={{ backdropFilter: "blur(4px)" }}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>

      {/* Idle state watermark when nothing is on screen */}
      {(!screenState || (screenState.isClear && !screenState.isBlack)) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-white/10 text-2xl font-light tracking-widest uppercase">
            WorshipFlow
          </div>
        </div>
      )}
    </div>
  );
}
