import { useEffect, useRef, useState, useCallback } from "react";
import { useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { Maximize2, Minimize2, PictureInPicture2, PictureInPicture, Settings, X, EyeOff, Eye, RotateCcw } from "lucide-react";
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
@keyframes wf-controls-fade {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function getAnimationStyle(animation: string | undefined): React.CSSProperties {
  if (!animation || animation === "none") return {};
  if (animation === "fade_in") return { animation: "wf-fade-in 0.8s ease-out forwards" };
  if (animation === "glow") return { animation: "wf-glow 3s ease-in-out infinite" };
  if (animation === "float") return { animation: "wf-float 4s ease-in-out infinite" };
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
  const overlayStyle = overlay > 0 ? { background: `rgba(0,0,0,${overlay / 100})` } : undefined;

  if (background.type === "color")
    return <div className="absolute inset-0" style={{ backgroundColor: background.value || "#000000" }} />;

  if (background.type === "gradient")
    return <div className="absolute inset-0" style={{ background: background.value || "linear-gradient(135deg,#1e1b4b,#000)" }} />;

  if (background.type === "image" && background.value)
    return (
      <div className="absolute inset-0">
        <img src={background.value} alt="" className="w-full h-full object-cover" />
        {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
      </div>
    );

  if (background.type === "video" && background.value)
    return (
      <div className="absolute inset-0">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay loop muted playsInline />
        {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
      </div>
    );

  if (background.type === "camera")
    return (
      <div className="absolute inset-0 bg-black">
        {cameraStream && (
          <video ref={cameraRef} className="w-full h-full object-cover" autoPlay muted playsInline />
        )}
        {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
      </div>
    );

  if (background.type === "live_wallpaper" && background.value)
    return <LiveWallpaperLayer wallpaperId={background.value} overlay={overlay} />;

  return <div className="absolute inset-0 bg-black" />;
}

// ────────────────────────────────────────────────
// PiP using Document Picture-in-Picture API
// ────────────────────────────────────────────────
function usePip(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [pipWin, setPipWin] = useState<Window | null>(null);
  const [pipSupported] = useState(() => "documentPictureInPicture" in window);

  const openPip = useCallback(async () => {
    if (!pipSupported) return;
    try {
      const pip = await (window as any).documentPictureInPicture.requestWindow({
        width: 480,
        height: 270,
        disallowReturnToOpener: false,
      });

      // Copy stylesheets into pip window
      [...document.styleSheets].forEach((sheet) => {
        try {
          const cssRules = [...(sheet.cssRules || [])].map((r) => r.cssText).join("");
          const style = pip.document.createElement("style");
          style.textContent = cssRules;
          pip.document.head.appendChild(style);
        } catch {}
      });

      // Copy linked stylesheets
      [...document.querySelectorAll('link[rel="stylesheet"]')].forEach((el) => {
        pip.document.head.appendChild(el.cloneNode());
      });

      pip.document.documentElement.style.cssText = "width:100%;height:100%;overflow:hidden;background:#000;";
      pip.document.body.style.cssText = "margin:0;padding:0;width:100%;height:100%;";

      // Move broadcast container into pip, restore on close
      if (containerRef.current) {
        pip.document.body.appendChild(containerRef.current);
        pip.addEventListener("pagehide", () => {
          document.body.appendChild(containerRef.current!);
          setPipWin(null);
        });
      }

      setPipWin(pip);
    } catch (err) {
      console.warn("Document PiP failed:", err);
    }
  }, [pipSupported, containerRef]);

  const closePip = useCallback(() => {
    pipWin?.close();
    setPipWin(null);
  }, [pipWin]);

  return { pipSupported, pipWin, openPip, closePip };
}

// ────────────────────────────────────────────────
// Video-element PiP (fallback when bg is video/camera)
// ────────────────────────────────────────────────
async function requestVideoPip(containerEl: HTMLElement) {
  const vid = containerEl.querySelector("video");
  if (vid && document.pictureInPictureEnabled) {
    try {
      await vid.requestPictureInPicture();
      return true;
    } catch {}
  }
  return false;
}

export default function BroadcastPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hideCursor, setHideCursor] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const prevContentRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { pipSupported, pipWin, openPip, closePip } = usePip(containerRef);

  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 500 },
  });

  // Read URL params (set by the launcher hook)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fullscreen") === "1") {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
    if (params.get("hidecursor") === "1") {
      setHideCursor(true);
    }
  }, []);

  // Animate content changes
  const currentContent = screenState?.content ?? "";
  const currentTitle = screenState?.title ?? "";
  useEffect(() => {
    const id = `${currentTitle}::${currentContent}`;
    if (id !== prevContentRef.current) {
      prevContentRef.current = id;
      setContentKey((k) => k + 1);
    }
  }, [currentTitle, currentContent]);

  // Camera management
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

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto-show controls on mouse move, hide after 3s
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handlePip = async () => {
    if (pipWin) { closePip(); return; }
    // Try video PiP first (works when bg is camera/video)
    if (containerRef.current) {
      const done = await requestVideoPip(containerRef.current);
      if (done) return;
    }
    // Fall back to Document PiP
    if (pipSupported) openPip();
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
        ...getAnimationStyle(textStyle.animation),
      }
    : { color: "#ffffff", fontSize: "64px", textAlign: "center" };

  const showContent = screenState && !screenState.isBlack && !screenState.isClear && screenState.content;
  const hasPip = pipSupported || document.pictureInPictureEnabled;

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-black select-none"
      style={{ cursor: hideCursor ? "none" : "default" }}
      onMouseMove={handleMouseMove}
    >
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />

      {/* Background */}
      <BackgroundLayer background={bg} cameraStream={cameraStream} />

      {/* Black screen overlay */}
      {screenState?.isBlack && <div className="absolute inset-0 bg-black z-40" />}

      {/* Content */}
      {showContent && (
        <div key={contentKey} className="absolute inset-0 z-20 flex items-center justify-center p-16">
          <div style={contentStyle} className="max-w-5xl w-full whitespace-pre-wrap drop-shadow-lg">
            {screenState.content}
          </div>
        </div>
      )}

      {/* Reference/title label */}
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
              animation: `wf-ticker 20s linear infinite`,
            }}
          >
            {screenState.tickerText}&nbsp;&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;&nbsp;{screenState.tickerText}
          </div>
        </div>
      )}

      {/* Control bar — appears on mouse move */}
      <div
        className="absolute top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          opacity: showControls || showSettings ? 1 : 0,
          pointerEvents: showControls || showSettings ? "auto" : "none",
          animation: showControls ? "wf-controls-fade 0.2s ease-out" : undefined,
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 gap-3"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
        >
          {/* Left: screen info */}
          <div className="text-white/50 text-xs font-mono">
            WorshipFlow Broadcast
            {screenState?.title ? ` · ${screenState.title}` : ""}
          </div>

          {/* Right: control buttons */}
          <div className="flex items-center gap-1">
            {/* Cursor lock */}
            <ControlBtn
              title={hideCursor ? "Show cursor" : "Hide cursor"}
              onClick={() => setHideCursor((v) => !v)}
              active={hideCursor}
            >
              {hideCursor ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </ControlBtn>

            {/* PiP */}
            {hasPip && (
              <ControlBtn title={pipWin ? "Exit PiP" : "Picture-in-Picture"} onClick={handlePip} active={!!pipWin}>
                {pipWin ? <PictureInPicture className="w-4 h-4" /> : <PictureInPicture2 className="w-4 h-4" />}
              </ControlBtn>
            )}

            {/* Settings */}
            <ControlBtn title="Settings" onClick={() => setShowSettings((v) => !v)} active={showSettings}>
              <Settings className="w-4 h-4" />
            </ControlBtn>

            {/* Fullscreen */}
            <ControlBtn title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </ControlBtn>
          </div>
        </div>

        {/* Settings drawer */}
        {showSettings && (
          <div
            className="mx-4 mb-2 rounded-xl p-4 text-sm"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-white">Broadcast Settings</span>
              <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-white/80">
              <SettingRow label="Background type" value={bg?.type ?? "—"} />
              <SettingRow label="Content type" value={screenState?.contentType ?? "—"} />
              <SettingRow label="Font" value={textStyle?.fontFamily ?? "—"} />
              <SettingRow label="Font size" value={textStyle?.fontSize ? `${textStyle.fontSize}px` : "—"} />
              <SettingRow label="Animation" value={textStyle?.animation ?? "—"} />
              <SettingRow label="Ticker" value={screenState?.tickerEnabled ? "On" : "Off"} />
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
              <PillBtn
                active={hideCursor}
                onClick={() => setHideCursor((v) => !v)}
                icon={hideCursor ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              >
                {hideCursor ? "Show cursor" : "Hide cursor"}
              </PillBtn>
              {hasPip && (
                <PillBtn
                  active={!!pipWin}
                  onClick={handlePip}
                  icon={<PictureInPicture2 className="w-3 h-3" />}
                >
                  {pipWin ? "Exit PiP" : "PiP float"}
                </PillBtn>
              )}
              <PillBtn onClick={toggleFullscreen} icon={<Maximize2 className="w-3 h-3" />}>
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </PillBtn>
              <PillBtn
                onClick={() => window.location.reload()}
                icon={<RotateCcw className="w-3 h-3" />}
              >
                Reload
              </PillBtn>
            </div>

            {/* PiP note */}
            {!hasPip && (
              <p className="mt-3 text-xs text-white/40">
                Picture-in-Picture is not supported in this browser. Use Chrome for PiP support.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Idle watermark */}
      {(!screenState || (screenState.isClear && !screenState.isBlack)) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-white/10 text-2xl font-light tracking-widest uppercase">WorshipFlow</div>
        </div>
      )}
    </div>
  );
}

function ControlBtn({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg transition-all ${
        active
          ? "bg-primary/80 text-white"
          : "bg-black/50 text-white/70 hover:text-white hover:bg-black/80"
      }`}
      style={{ backdropFilter: "blur(4px)" }}
    >
      {children}
    </button>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-white capitalize">{value}</span>
    </div>
  );
}

function PillBtn({
  children,
  onClick,
  icon,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        active
          ? "bg-primary/80 text-white border-primary/60"
          : "bg-white/10 text-white/80 hover:bg-white/20 border-white/10"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
