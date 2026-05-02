import { useEffect, useRef, useState } from "react";
import { useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { LiveWallpaperLayer } from "@/components/live-wallpaper";

const CHANNEL_NAME = "wf-broadcast-cmd";

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
        {cameraStream && <video ref={cameraRef} className="w-full h-full object-cover" autoPlay muted playsInline />}
        {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
      </div>
    );

  if (background.type === "live_wallpaper" && background.value)
    return <LiveWallpaperLayer wallpaperId={background.value} overlay={overlay} />;

  return <div className="absolute inset-0 bg-black" />;
}

export default function BroadcastPage() {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hideCursor, setHideCursor] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const prevContentRef = useRef<string>("");
  const pipWinRef = useRef<Window | null>(null);

  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 500 },
  });

  // Apply URL params set by the launcher
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fullscreen") === "1") {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
    if (params.get("hidecursor") === "1") setHideCursor(true);
  }, []);

  // Listen for remote commands from the control screen
  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = async (e) => {
      const cmd = e.data;
      if (!cmd?.type) return;
      switch (cmd.type) {
        case "fullscreen":
          document.documentElement.requestFullscreen?.().catch(() => {});
          break;
        case "exit_fullscreen":
          if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
          break;
        case "toggle_fullscreen":
          if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
          else document.documentElement.requestFullscreen?.().catch(() => {});
          break;
        case "hide_cursor":
          setHideCursor(true);
          break;
        case "show_cursor":
          setHideCursor(false);
          break;
        case "toggle_cursor":
          setHideCursor(v => !v);
          break;
        case "reload":
          window.location.reload();
          break;
        case "pip_open":
          if ("documentPictureInPicture" in window) {
            try {
              const pip = await (window as any).documentPictureInPicture.requestWindow({ width: 480, height: 270 });
              pipWinRef.current = pip;
            } catch {}
          }
          break;
        case "pip_close":
          pipWinRef.current?.close();
          break;
      }
    };
    return () => ch.close();
  }, []);

  // Animate on content change
  const currentContent = screenState?.content ?? "";
  const currentTitle = screenState?.title ?? "";
  useEffect(() => {
    const id = `${currentTitle}::${currentContent}`;
    if (id !== prevContentRef.current) { prevContentRef.current = id; setContentKey(k => k + 1); }
  }, [currentTitle, currentContent]);

  // Camera lifecycle
  useEffect(() => {
    if (screenState?.background?.type === "camera" && !cameraStream) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => setCameraStream(stream))
        .catch(() => {});
    } else if (screenState?.background?.type !== "camera" && cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  }, [screenState?.background?.type]);

  const textStyle = screenState?.textStyle;
  const bg = screenState?.background;
  const layout = screenState?.layout;

  const vAlign = layout?.verticalAlign ?? "center";
  const hAlign = layout?.horizontalAlign ?? "center";
  const paddingX = layout?.paddingX ?? 8;
  const paddingY = layout?.paddingY ?? 8;
  const textScale = layout?.textScale ?? 1;
  const textWidthPct = layout?.textWidthPct ?? 100;

  const flexJustify = vAlign === "top" ? "flex-start" : vAlign === "bottom" ? "flex-end" : "center";
  const flexAlign = hAlign === "left" ? "flex-start" : hAlign === "right" ? "flex-end" : "center";
  const textAlignValue = hAlign === "left" ? "left" : hAlign === "right" ? "right" : (textStyle?.alignment ?? "center");

  const contentStyle: React.CSSProperties = textStyle
    ? {
        fontFamily: textStyle.fontFamily,
        fontSize: `${textStyle.fontSize * textScale}px`,
        color: textStyle.textColor,
        fontWeight: textStyle.bold ? "bold" : "normal",
        fontStyle: textStyle.italic ? "italic" : "normal",
        textAlign: textAlignValue as "left" | "center" | "right",
        lineHeight: 1.3,
        ...getAnimationStyle(textStyle.animation),
      }
    : { color: "#ffffff", fontSize: `${64 * textScale}px`, textAlign: "center" };

  const showContent = screenState && !screenState.isBlack && !screenState.isClear && screenState.content;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black select-none"
      style={{ cursor: hideCursor ? "none" : "default" }}
    >
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />

      {/* Background */}
      <BackgroundLayer background={bg} cameraStream={cameraStream} />

      {/* Black screen overlay */}
      {screenState?.isBlack && <div className="absolute inset-0 bg-black z-40" />}

      {/* Content */}
      {showContent && (
        <div
          key={contentKey}
          className="absolute inset-0 z-20 flex"
          style={{
            alignItems: flexJustify,
            justifyContent: flexAlign,
            paddingTop: `${paddingY}%`,
            paddingBottom: `${paddingY}%`,
            paddingLeft: `${paddingX}%`,
            paddingRight: `${paddingX}%`,
          }}
        >
          <div
            style={{ ...contentStyle, width: `${textWidthPct}%`, maxWidth: "100%" }}
            className="whitespace-pre-wrap drop-shadow-lg"
          >
            {screenState.content}
          </div>
        </div>
      )}

      {/* Reference / title label */}
      {showContent && screenState?.title && (
        <div className="absolute top-4 left-6 z-30 text-white/30 text-sm font-light tracking-wide pointer-events-none">
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
              display: "inline-block", whiteSpace: "nowrap", color: "#ffffff",
              fontSize: "18px", fontWeight: 500, letterSpacing: "0.02em",
              animation: `wf-ticker 20s linear infinite`,
            }}
          >
            {screenState.tickerText}&nbsp;&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;&nbsp;{screenState.tickerText}
          </div>
        </div>
      )}

      {/* Idle watermark */}
      {(!screenState || (screenState.isClear && !screenState.isBlack)) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="text-white/8 text-3xl font-light tracking-widest uppercase select-none">WorshipFlow</div>
        </div>
      )}
    </div>
  );
}
