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

// ── Lower-third presenter overlay ────────────────────────────────────────────
function LowerThirdOverlay({ name, title, position, style, tickerH }: {
  name: string; title: string; position: string; style: string; tickerH: number;
}) {
  const isLeft   = position === "bottom-left";
  const isCenter = position === "bottom-center";
  const hStyle: React.CSSProperties = isCenter
    ? { left: "50%", transform: "translateX(-50%)" }
    : isLeft ? { left: 28 } : { right: 28 };
  const bottom = tickerH + 72;

  if (style === "modern") {
    return (
      <div style={{ position: "absolute", zIndex: 32, bottom, ...hStyle, pointerEvents: "none" }}>
        <div style={{ background: "rgba(0,0,0,0.72)", borderLeft: "4px solid rgba(255,255,255,0.75)", borderRadius: "0 4px 4px 0", padding: "10px 22px 10px 14px", backdropFilter: "blur(8px)", minWidth: "220px" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 700, lineHeight: 1.2, letterSpacing: "0.01em" }}>{name}</div>
          {title && <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", fontWeight: 400, letterSpacing: "0.08em", marginTop: "3px", textTransform: "uppercase" }}>{title}</div>}
        </div>
      </div>
    );
  }
  if (style === "classic") {
    return (
      <div style={{ position: "absolute", zIndex: 32, bottom, ...hStyle, pointerEvents: "none" }}>
        <div style={{ background: "rgba(0,0,0,0.88)", minWidth: "220px" }}>
          <div style={{ height: "3px", background: "#fff" }} />
          <div style={{ padding: "8px 20px 10px 16px" }}>
            <div style={{ color: "#fff", fontSize: "21px", fontWeight: 700 }}>{name}</div>
            {title && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", marginTop: "2px" }}>{title}</div>}
          </div>
        </div>
      </div>
    );
  }
  if (style === "gradient") {
    const dir = isLeft ? "to right" : isCenter ? "to right" : "to left";
    return (
      <div style={{ position: "absolute", zIndex: 32, bottom, ...hStyle, pointerEvents: "none" }}>
        <div style={{ background: `linear-gradient(${dir}, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)`, padding: "12px 48px 12px 20px", minWidth: "260px" }}>
          <div style={{ color: "#fff", fontSize: "23px", fontWeight: 700 }}>{name}</div>
          {title && <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "13px", marginTop: "2px" }}>{title}</div>}
        </div>
      </div>
    );
  }
  // minimal
  return (
    <div style={{ position: "absolute", zIndex: 32, bottom, ...hStyle, pointerEvents: "none" }}>
      <div style={{ padding: "6px 12px", textAlign: isCenter ? "center" : isLeft ? "left" : "right" }}>
        <div style={{ color: "#fff", fontSize: "22px", fontWeight: 700, textShadow: "0 2px 16px rgba(0,0,0,0.95),0 0 40px rgba(0,0,0,0.7)" }}>{name}</div>
        {title && <div style={{ color: "rgba(255,255,255,0.82)", fontSize: "13px", marginTop: "1px", textShadow: "0 2px 10px rgba(0,0,0,0.95)" }}>{title}</div>}
      </div>
    </div>
  );
}

// ── Clock overlay ─────────────────────────────────────────────────────────────
function ClockOverlay({ time, position, clockStyle }: { time: Date; position: string; clockStyle: string }) {
  const h = time.getHours().toString().padStart(2, "0");
  const m = time.getMinutes().toString().padStart(2, "0");
  const s = time.getSeconds().toString().padStart(2, "0");
  const str = clockStyle === "digital" ? `${h}:${m}:${s}` : `${h}:${m}`;
  const pos: React.CSSProperties = {
    top:    position.startsWith("top")    ? 16 : undefined,
    bottom: position.startsWith("bottom") ? 16 : undefined,
    left:   position.endsWith("left")     ? 20 : undefined,
    right:  position.endsWith("right")    ? 20 : undefined,
  };
  return (
    <div style={{ position: "absolute", zIndex: 31, pointerEvents: "none", ...pos }}>
      <div style={{ background: "rgba(0,0,0,0.52)", borderRadius: "6px", padding: "4px 13px", backdropFilter: "blur(4px)", color: "rgba(255,255,255,0.92)", fontFamily: clockStyle === "digital" ? "monospace" : "inherit", fontSize: clockStyle === "digital" ? "16px" : "19px", fontWeight: clockStyle === "digital" ? 400 : 300, letterSpacing: clockStyle === "digital" ? "0.1em" : "0.04em" }}>
        {str}
      </div>
    </div>
  );
}

// ── Logo overlay ─────────────────────────────────────────────────────────────
function LogoOverlay({ url, position, size, opacity, tickerH }: {
  url: string; position: string; size: number; opacity: number; tickerH: number;
}) {
  const isBottom = position.startsWith("bottom");
  const isCenterPos = position === "center";
  const pos: React.CSSProperties = isCenterPos
    ? { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }
    : {
        top:    position.startsWith("top")  ? 16 : undefined,
        bottom: isBottom                    ? tickerH + 16 : undefined,
        left:   position.endsWith("left")   ? 16 : undefined,
        right:  position.endsWith("right")  ? 16 : undefined,
      };
  return (
    <div style={{ position: "absolute", zIndex: 33, pointerEvents: "none", ...pos }}>
      <img
        src={url}
        alt=""
        style={{
          width: `${size}vw`,
          maxWidth: "40vw",
          opacity: opacity / 100,
          display: "block",
          objectFit: "contain",
          filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.6))",
        }}
      />
    </div>
  );
}

// ── Standalone text overlay ───────────────────────────────────────────────────
function TextOverlayLayer({ content, position, fontSize, color, bg, bold, tickerH }: {
  content: string; position: string; fontSize: number; color: string; bg: string; bold: boolean; tickerH: number;
}) {
  const isCenterPos  = position === "center";
  const isBottom     = position.startsWith("bottom");
  const isCenterH    = position.endsWith("-center");
  const isCenterV    = position.startsWith("center-") || isCenterPos;

  const pos: React.CSSProperties = (() => {
    if (isCenterPos) return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
    if (isCenterH) {
      if (position.startsWith("top"))    return { top: 16, left: "50%", transform: "translateX(-50%)" };
      if (position.startsWith("bottom")) return { bottom: tickerH + 16, left: "50%", transform: "translateX(-50%)" };
      return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
    }
    if (isCenterV) {
      return {
        top: "50%",
        left:  position.endsWith("left")  ? 16 : undefined,
        right: position.endsWith("right") ? 16 : undefined,
        transform: "translateY(-50%)",
      };
    }
    return {
      top:    position.startsWith("top")    ? 16 : undefined,
      bottom: isBottom                       ? tickerH + 16 : undefined,
      left:   position.endsWith("left")     ? 16 : undefined,
      right:  position.endsWith("right")    ? 16 : undefined,
    };
  })();

  const hasBackground = bg && bg !== "none";
  return (
    <div style={{ position: "absolute", zIndex: 34, pointerEvents: "none", maxWidth: "80vw", ...pos }}>
      <div style={{
        background: hasBackground ? bg : "transparent",
        borderRadius: hasBackground ? "4px" : 0,
        padding: hasBackground ? "8px 18px" : 0,
        color,
        fontSize: `${fontSize}px`,
        fontWeight: bold ? 700 : 400,
        lineHeight: 1.4,
        textShadow: hasBackground ? "none" : "0 2px 14px rgba(0,0,0,0.95),0 0 40px rgba(0,0,0,0.7)",
        whiteSpace: "pre-wrap",
        backdropFilter: hasBackground ? "blur(6px)" : undefined,
      }}>
        {content}
      </div>
    </div>
  );
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

  // Clock
  const [clockTime, setClockTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(id);
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
  const contentType = screenState?.contentType;

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
        lineHeight: 1.4,
        ...getAnimationStyle(textStyle.animation),
      }
    : { color: "#ffffff", fontSize: `${64 * textScale}px`, textAlign: "center" };

  const showContent = screenState && !screenState.isBlack && !screenState.isClear && screenState.content;

  // ── Song title § section parsing ──────────────────────────────────────────
  const rawTitle = screenState?.title ?? "";
  const sepIdx = rawTitle.indexOf("§");
  const songName   = sepIdx !== -1 ? rawTitle.slice(0, sepIdx)  : rawTitle;
  const sectionLabel = sepIdx !== -1 ? rawTitle.slice(sepIdx + 1) : "";

  // ── Verse content renderer with superscript numbers ───────────────────────
  function renderVerseContent(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const m = line.match(/^(\d+)\s+([\s\S]*)$/);
      if (m) {
        return (
          <span key={i}>
            {i > 0 && "\n"}
            <sup
              style={{
                fontSize: "0.42em",
                fontWeight: 700,
                verticalAlign: "super",
                opacity: 0.75,
                letterSpacing: "0.04em",
                marginRight: "0.18em",
              }}
            >{m[1]}</sup>{m[2]}
          </span>
        );
      }
      return <span key={i}>{i > 0 ? "\n" : ""}{line}</span>;
    });
  }

  // ── Ticker bottom offset ─────────────────────────────────────────────────
  const tickerH = screenState?.tickerEnabled && screenState.tickerText ? 48 : 0;

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
            paddingBottom: `${paddingY + (tickerH > 0 ? 4 : 0)}%`,
            paddingLeft: `${paddingX}%`,
            paddingRight: `${paddingX}%`,
          }}
        >
          <div
            style={{ ...contentStyle, width: `${textWidthPct}%`, maxWidth: "100%" }}
            className="whitespace-pre-wrap drop-shadow-lg"
          >
            {contentType === "verse"
              ? renderVerseContent(screenState!.content!)
              : screenState!.content}
          </div>
        </div>
      )}

      {/* ── Bible reference overlay (bottom-right) ─────────────────────────── */}
      {showContent && contentType === "verse" && songName && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{ bottom: tickerH + 20, right: 28 }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.55)",
              borderLeft: "3px solid rgba(255,255,255,0.4)",
              borderRadius: "3px",
              padding: "5px 12px 5px 10px",
              backdropFilter: "blur(4px)",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "15px", fontWeight: 500, letterSpacing: "0.04em" }}>
              {songName}
            </span>
          </div>
        </div>
      )}

      {/* ── Song name + section overlay (bottom-left) ──────────────────────── */}
      {showContent && contentType === "song" && songName && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{ bottom: tickerH + 20, left: 28 }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.55)",
              borderRight: "3px solid rgba(255,255,255,0.4)",
              borderRadius: "3px",
              padding: "6px 14px 6px 12px",
              backdropFilter: "blur(4px)",
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.95)", fontSize: "15px", fontWeight: 600, letterSpacing: "0.02em", lineHeight: 1.2 }}>
              {songName}
            </div>
            {sectionLabel && (
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", fontWeight: 400, letterSpacing: "0.06em", marginTop: "2px" }}>
                {sectionLabel.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Presenter lower-third ── */}
      {screenState?.lowerThirdEnabled && screenState.lowerThirdName && !screenState.isBlack && (
        <LowerThirdOverlay
          name={screenState.lowerThirdName}
          title={screenState.lowerThirdTitle ?? ""}
          position={screenState.lowerThirdPosition ?? "bottom-left"}
          style={screenState.lowerThirdStyle ?? "modern"}
          tickerH={tickerH}
        />
      )}

      {/* ── Clock ── */}
      {screenState?.clockOverlayEnabled && !screenState.isBlack && (
        <ClockOverlay
          time={clockTime}
          position={screenState.clockPosition ?? "top-right"}
          clockStyle={screenState.clockStyle ?? "digital"}
        />
      )}

      {/* ── Logo overlay ── */}
      {screenState?.logoOverlayEnabled && screenState.logoUrl && !screenState.isBlack && (
        <LogoOverlay
          url={screenState.logoUrl}
          position={screenState.logoPosition ?? "top-right"}
          size={screenState.logoSize ?? 20}
          opacity={screenState.logoOpacity ?? 100}
          tickerH={tickerH}
        />
      )}

      {/* ── Standalone text overlay ── */}
      {screenState?.textOverlayEnabled && screenState.textOverlayContent && !screenState.isBlack && (
        <TextOverlayLayer
          content={screenState.textOverlayContent}
          position={screenState.textOverlayPosition ?? "top-left"}
          fontSize={screenState.textOverlayFontSize ?? 36}
          color={screenState.textOverlayColor ?? "#ffffff"}
          bg={screenState.textOverlayBg ?? "rgba(0,0,0,0.55)"}
          bold={screenState.textOverlayBold ?? false}
          tickerH={tickerH}
        />
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
