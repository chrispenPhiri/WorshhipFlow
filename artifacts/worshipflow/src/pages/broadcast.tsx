import { useEffect, useRef, useState } from "react";
import { useGetScreenState, getGetScreenStateQueryKey, useUpdateScreenState } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LiveWallpaperLayer } from "@/components/live-wallpaper";

const CHANNEL_NAME = "wf-broadcast-cmd";

const ANIMATION_STYLES = `
@keyframes wf-fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wf-slide-up {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wf-glow {
  0%, 100% { text-shadow: 0 0 14px rgba(255,255,255,0.45), 0 2px 14px rgba(0,0,0,0.95); }
  50%       { text-shadow: 0 0 30px rgba(255,255,255,0.95), 0 2px 14px rgba(0,0,0,0.95); }
}
@keyframes wf-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.04); opacity: 0.92; }
}
@keyframes wf-float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-12px); }
}
@keyframes wf-ticker {
  from { transform: translateX(0%); }
  to   { transform: translateX(-100%); }
}
@keyframes wf-rec-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
`;

// Apply an opacity multiplier to a CSS color (handles rgba, rgb, #hex, named).
// Used so background-only opacity controls don't fade the foreground text.
function applyAlpha(color: string, alphaPct: number): string {
  const a = Math.max(0, Math.min(100, alphaPct)) / 100;
  if (!color || color === "transparent" || color === "none") return "transparent";
  const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(",").map(p => p.trim());
    const r = parts[0], g = parts[1], b = parts[2];
    const baseA = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    return `rgba(${r}, ${g}, ${b}, ${(baseA * a).toFixed(3)})`;
  }
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let h = hex[1];
    // Expand short forms (#rgb, #rgba) to long form (#rrggbb, #rrggbbaa).
    if (h.length === 3 || h.length === 4) h = h.split("").map(c => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const baseA = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r}, ${g}, ${b}, ${(baseA * a).toFixed(3)})`;
  }
  // Fallback: leave as-is when alpha is 100%, otherwise wrap in a translucent layer color.
  return a >= 1 ? color : `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;
}

function getAnimationStyle(animation: string | undefined): React.CSSProperties {
  if (!animation || animation === "none") return {};
  if (animation === "fade_in") return { animation: "wf-fade-in 0.8s ease-out forwards" };
  if (animation === "glow") return { animation: "wf-glow 3s ease-in-out infinite" };
  if (animation === "float") return { animation: "wf-float 4s ease-in-out infinite" };
  return {};
}

// ── Lower-third presenter overlay ────────────────────────────────────────────
function LowerThirdOverlay({ name, title, position, style, tickerH, nameColor, titleColor, bgColor, accentColor, nameSize, titleSize }: {
  name: string; title: string; position: string; style: string; tickerH: number;
  nameColor: string; titleColor: string; bgColor: string; accentColor: string;
  nameSize: number; titleSize: number;
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
        <div style={{ background: bgColor, borderLeft: `4px solid ${accentColor}`, borderRadius: "0 4px 4px 0", padding: "10px 22px 10px 14px", backdropFilter: "blur(8px)", minWidth: "220px" }}>
          <div style={{ color: nameColor, fontSize: `${nameSize}px`, fontWeight: 700, lineHeight: 1.2, letterSpacing: "0.01em" }}>{name}</div>
          {title && <div style={{ color: titleColor, fontSize: `${titleSize}px`, fontWeight: 400, letterSpacing: "0.08em", marginTop: "3px", textTransform: "uppercase" }}>{title}</div>}
        </div>
      </div>
    );
  }
  if (style === "classic") {
    return (
      <div style={{ position: "absolute", zIndex: 32, bottom, ...hStyle, pointerEvents: "none" }}>
        <div style={{ background: bgColor, minWidth: "220px" }}>
          <div style={{ height: "3px", background: accentColor }} />
          <div style={{ padding: "8px 20px 10px 16px" }}>
            <div style={{ color: nameColor, fontSize: `${nameSize}px`, fontWeight: 700 }}>{name}</div>
            {title && <div style={{ color: titleColor, fontSize: `${titleSize}px`, marginTop: "2px" }}>{title}</div>}
          </div>
        </div>
      </div>
    );
  }
  if (style === "gradient") {
    const dir = isLeft ? "to right" : isCenter ? "to right" : "to left";
    return (
      <div style={{ position: "absolute", zIndex: 32, bottom, ...hStyle, pointerEvents: "none" }}>
        <div style={{ background: `linear-gradient(${dir}, ${bgColor} 0%, rgba(0,0,0,0.6) 60%, transparent 100%)`, padding: "12px 48px 12px 20px", minWidth: "260px" }}>
          <div style={{ color: nameColor, fontSize: `${nameSize}px`, fontWeight: 700 }}>{name}</div>
          {title && <div style={{ color: titleColor, fontSize: `${titleSize}px`, marginTop: "2px" }}>{title}</div>}
        </div>
      </div>
    );
  }
  // minimal
  return (
    <div style={{ position: "absolute", zIndex: 32, bottom, ...hStyle, pointerEvents: "none" }}>
      <div style={{ padding: "6px 12px", textAlign: isCenter ? "center" : isLeft ? "left" : "right" }}>
        <div style={{ color: nameColor, fontSize: `${nameSize}px`, fontWeight: 700, textShadow: "0 2px 16px rgba(0,0,0,0.95),0 0 40px rgba(0,0,0,0.7)" }}>{name}</div>
        {title && <div style={{ color: titleColor, fontSize: `${titleSize}px`, marginTop: "1px", textShadow: "0 2px 10px rgba(0,0,0,0.95)" }}>{title}</div>}
      </div>
    </div>
  );
}

// ── Clock overlay ─────────────────────────────────────────────────────────────
function ClockOverlay({ time, position, clockStyle, showDate, showSeconds, dateFormat, fontSize, color, bgColor, bgOpacity, bgRadius, bgPadding }: {
  time: Date; position: string; clockStyle: string;
  showDate: boolean; showSeconds: boolean; dateFormat: string; fontSize: number; color: string;
  bgColor: string; bgOpacity: number; bgRadius: number; bgPadding: number;
}) {
  const h = time.getHours().toString().padStart(2, "0");
  const m = time.getMinutes().toString().padStart(2, "0");
  const s = time.getSeconds().toString().padStart(2, "0");
  const timeStr = clockStyle === "digital" && showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;

  let dateStr = "";
  if (showDate) {
    if (dateFormat === "long") {
      dateStr = time.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    } else if (dateFormat === "short") {
      dateStr = time.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } else {
      dateStr = time.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" });
    }
  }

  const pos: React.CSSProperties = {
    top:    position.startsWith("top")    ? 16 : undefined,
    bottom: position.startsWith("bottom") ? 16 : undefined,
    left:   position.endsWith("left")     ? 20 : undefined,
    right:  position.endsWith("right")    ? 20 : undefined,
  };

  // Compose background with opacity multiplier baked into the color itself
  // so the foreground text remains fully opaque regardless of bg opacity.
  const composedBg = applyAlpha(bgColor, bgOpacity);
  const isTransparent = composedBg === "transparent";

  return (
    <div style={{ position: "absolute", zIndex: 31, pointerEvents: "none", ...pos }}>
      <div style={{
        background: composedBg,
        borderRadius: `${bgRadius}px`,
        padding: `${Math.round(bgPadding * 0.45)}px ${bgPadding}px`,
        backdropFilter: isTransparent ? undefined : "blur(4px)",
        textAlign: "center",
      }}>
        <div style={{
          color, fontFamily: clockStyle === "digital" ? "monospace" : "inherit",
          fontSize: `${fontSize}px`, fontWeight: clockStyle === "digital" ? 400 : 300,
          letterSpacing: clockStyle === "digital" ? "0.1em" : "0.04em",
          lineHeight: 1.2,
          textShadow: isTransparent ? "0 2px 14px rgba(0,0,0,0.95),0 0 40px rgba(0,0,0,0.7)" : "none",
        }}>
          {timeStr}
        </div>
        {showDate && dateStr && (
          <div style={{ color, fontSize: `${Math.max(10, fontSize * 0.62)}px`, opacity: 0.72, letterSpacing: "0.04em", marginTop: "2px" }}>
            {dateStr}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Logo overlay ─────────────────────────────────────────────────────────────
function LogoOverlay({ url, position, size, opacity, shape, text, textColor, textSize, textPosition, textWeight, tickerH }: {
  url: string; position: string; size: number; opacity: number;
  shape: string; text: string | null | undefined; textColor: string; textSize: number; textPosition: string; textWeight: string;
  tickerH: number;
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

  // Shape clipping for the logo image
  const shapeStyle: React.CSSProperties = (() => {
    if (shape === "circle") {
      return { borderRadius: "50%", aspectRatio: "1 / 1", objectFit: "cover" };
    }
    if (shape === "rounded") {
      return { borderRadius: "16px" };
    }
    if (shape === "hex") {
      return { clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", aspectRatio: "1 / 1", objectFit: "cover" };
    }
    if (shape === "shield") {
      return { clipPath: "polygon(50% 0%, 100% 25%, 100% 60%, 50% 100%, 0% 60%, 0% 25%)", aspectRatio: "1 / 1.15", objectFit: "cover" };
    }
    return { borderRadius: 0 };
  })();

  const flexDir: React.CSSProperties["flexDirection"] =
    textPosition === "below" ? "column" :
    textPosition === "above" ? "column-reverse" :
    textPosition === "left"  ? "row-reverse" : "row";

  const alignItems = (textPosition === "below" || textPosition === "above") ? "center" : "center";

  const hasText = !!(text && text.trim());

  return (
    <div style={{
      position: "absolute", zIndex: 33, pointerEvents: "none",
      display: "flex", flexDirection: flexDir, alignItems, gap: "10px",
      ...pos,
    }}>
      <img
        src={url}
        alt=""
        style={{
          width: `${size}vw`,
          maxWidth: "40vw",
          opacity: opacity / 100,
          display: "block",
          filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.6))",
          ...shapeStyle,
        }}
      />
      {hasText && (
        <div style={{
          color: textColor,
          fontSize: `${textSize}px`,
          fontWeight: textWeight as unknown as number,
          letterSpacing: "0.02em",
          opacity: opacity / 100,
          textShadow: "0 2px 10px rgba(0,0,0,0.7)",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

// ── Standalone text overlay ───────────────────────────────────────────────────
function TextOverlayLayer({ content, position, fontSize, color, bg, bold, italic, align, fontFamily, shadow, opacity, padding, radius, letterSpacing, animation, maxWidth, borderColor, borderWidth, tickerH }: {
  content: string; position: string; fontSize: number; color: string; bg: string;
  bold: boolean; italic: boolean; align: string; fontFamily: string; shadow: boolean;
  opacity: number; padding: number; radius: number; letterSpacing: number; animation: string;
  maxWidth: number; borderColor: string; borderWidth: number; tickerH: number;
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

  const hasBackground = bg && bg !== "none" && bg !== "transparent";
  const textShadowVal = shadow
    ? "0 2px 14px rgba(0,0,0,0.95),0 0 40px rgba(0,0,0,0.7)"
    : hasBackground ? "none" : "0 2px 14px rgba(0,0,0,0.95),0 0 40px rgba(0,0,0,0.7)";

  const animMap: Record<string, string> = {
    fade_in:   "wf-fade-in 0.7s ease-out",
    slide_up:  "wf-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
    glow:      "wf-glow 2.4s ease-in-out infinite",
    pulse:     "wf-pulse 1.8s ease-in-out infinite",
  };
  const animValue = animMap[animation] || undefined;

  const hasBorder = borderWidth > 0 && borderColor && borderColor !== "transparent";

  return (
    <div style={{
      position: "absolute", zIndex: 34, pointerEvents: "none",
      maxWidth: `${maxWidth}vw`,
      opacity: opacity / 100,
      animation: animValue,
      ...pos,
    }}>
      <div style={{
        background: hasBackground ? bg : "transparent",
        borderRadius: hasBackground || hasBorder ? `${radius}px` : 0,
        padding: hasBackground || hasBorder ? `${padding}px ${Math.round(padding * 2)}px` : 0,
        border: hasBorder ? `${borderWidth}px solid ${borderColor}` : undefined,
        color,
        fontSize: `${fontSize}px`,
        fontWeight: bold ? 700 : 400,
        fontStyle: italic ? "italic" : "normal",
        fontFamily: fontFamily && fontFamily !== "inherit" ? fontFamily : undefined,
        textAlign: (align as "left" | "center" | "right") || "left",
        lineHeight: 1.4,
        letterSpacing: `${letterSpacing / 100}em`,
        textShadow: textShadowVal,
        whiteSpace: "pre-wrap",
        backdropFilter: hasBackground ? "blur(6px)" : undefined,
      }}>
        {content}
      </div>
    </div>
  );
}

// ── Stopwatch / Countdown timer overlay ──────────────────────────────────────
function TimerOverlay({ mode, startedAt, accumulatedMs, durationSec, position, fontSize, color, bgColor, label, warningSec, warningColor, criticalColor, tickerH }: {
  mode: string; startedAt: string | null | undefined; accumulatedMs: number; durationSec: number;
  position: string; fontSize: number; color: string; bgColor: string; label: string | null | undefined;
  warningSec: number; warningColor: string; criticalColor: string; tickerH: number;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(t => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const startedAtMs = startedAt ? Date.parse(startedAt) : NaN;
  const isRunning = !isNaN(startedAtMs);
  const elapsedMs = accumulatedMs + (isRunning ? Math.max(0, Date.now() - startedAtMs) : 0);

  const totalMs = mode === "countdown" ? Math.max(0, durationSec * 1000 - elapsedMs) : elapsedMs;
  const totalSecAbs = Math.floor(totalMs / 1000);
  const negative = mode === "countdown" && elapsedMs > durationSec * 1000;
  const displaySec = negative ? Math.floor((elapsedMs - durationSec * 1000) / 1000) : totalSecAbs;

  const hours = Math.floor(displaySec / 3600);
  const minutes = Math.floor((displaySec % 3600) / 60);
  const seconds = displaySec % 60;
  const timeStr = hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Color escalation for countdown
  let displayColor = color;
  if (mode === "countdown") {
    const remainingSec = Math.max(0, Math.ceil(totalMs / 1000));
    if (negative) {
      displayColor = criticalColor;
    } else if (remainingSec <= 10) {
      displayColor = criticalColor;
    } else if (remainingSec <= warningSec) {
      displayColor = warningColor;
    }
  }

  // Position
  const isCenterH = position.endsWith("-center");
  const pos: React.CSSProperties = (() => {
    if (position === "center") return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
    if (isCenterH) {
      if (position.startsWith("top"))    return { top: 16, left: "50%", transform: "translateX(-50%)" };
      if (position.startsWith("bottom")) return { bottom: tickerH + 16, left: "50%", transform: "translateX(-50%)" };
    }
    return {
      top:    position.startsWith("top")    ? 16 : undefined,
      bottom: position.startsWith("bottom") ? tickerH + 16 : undefined,
      left:   position.endsWith("left")     ? 16 : undefined,
      right:  position.endsWith("right")    ? 16 : undefined,
    };
  })();

  const hasBg = bgColor && bgColor !== "none" && bgColor !== "transparent";

  // Pulse when in critical
  const isPulsing = mode === "countdown" && (totalMs <= 10000 || negative);

  return (
    <div style={{ position: "absolute", zIndex: 32, pointerEvents: "none", textAlign: "center", ...pos }}>
      <div style={{
        background: hasBg ? bgColor : "transparent",
        borderRadius: hasBg ? "10px" : 0,
        padding: hasBg ? "10px 20px" : 0,
        backdropFilter: hasBg ? "blur(6px)" : undefined,
        animation: isPulsing ? "wf-pulse 1s ease-in-out infinite" : undefined,
      }}>
        {label && (
          <div style={{
            color: displayColor, opacity: 0.65,
            fontSize: `${Math.max(11, fontSize * 0.32)}px`,
            letterSpacing: "0.18em", textTransform: "uppercase",
            marginBottom: "2px", fontWeight: 500,
            textShadow: hasBg ? "none" : "0 2px 8px rgba(0,0,0,0.8)",
          }}>
            {label}
          </div>
        )}
        <div style={{
          color: displayColor,
          fontSize: `${fontSize}px`,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.04em",
          lineHeight: 1,
          textShadow: hasBg ? "none" : "0 2px 14px rgba(0,0,0,0.95),0 0 40px rgba(0,0,0,0.7)",
        }}>
          {negative && <span style={{ marginRight: "0.1em" }}>+</span>}{timeStr}
        </div>
      </div>
    </div>
  );
}

// ── Camera PiP / side-by-side overlay ────────────────────────────────────────
function CameraOverlay({ stream, layout, shape, pipSize }: {
  stream: MediaStream | null; layout: string; shape: string; pipSize: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);

  if (!stream) return null;

  const borderRadius =
    shape === "circle" ? "50%" :
    shape === "rounded" ? "16px" : "0";

  // Side-by-side layouts handled differently (takes half the screen)
  if (layout === "side-left" || layout === "side-right") {
    const isLeft = layout === "side-left";
    return (
      <div style={{
        position: "absolute", zIndex: 25, top: 0, bottom: 0,
        left: isLeft ? 0 : "50%", right: isLeft ? "50%" : 0,
        pointerEvents: "none",
      }}>
        <video ref={ref} autoPlay muted playsInline className="w-full h-full object-cover" />
      </div>
    );
  }

  // PiP corner positions
  const sizeVw = pipSize ?? 30;
  const gap = 24;
  const pos: React.CSSProperties = layout === "pip-topright"     ? { top: gap, right: gap }
    : layout === "pip-topleft"      ? { top: gap, left: gap }
    : layout === "pip-bottomright"  ? { bottom: gap, right: gap }
    : layout === "pip-bottomleft"   ? { bottom: gap, left: gap }
    : { top: gap, right: gap };

  return (
    <div style={{
      position: "absolute", zIndex: 25, pointerEvents: "none",
      width: `${sizeVw}vw`, aspectRatio: "16/9",
      overflow: "hidden", borderRadius,
      boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)",
      border: shape !== "circle" ? "2px solid rgba(255,255,255,0.12)" : "none",
      ...pos,
    }}>
      <video ref={ref} autoPlay muted playsInline className="w-full h-full object-cover" />
    </div>
  );
}

function BackgroundLayer({ background, cameraStream }: {
  background?: { type: string; value: string; overlay?: number; fit?: string; loop?: boolean; cameraLayout?: string } | null;
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

  if (background.type === "image" && background.value) {
    const fitClass = background.fit === "contain" ? "object-contain" : background.fit === "fill" ? "object-fill" : "object-cover";
    return (
      <div className="absolute inset-0 bg-black">
        <img src={background.value} alt="" className={`w-full h-full ${fitClass}`} />
        {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
      </div>
    );
  }

  if (background.type === "video" && background.value) {
    const fitClass = background.fit === "contain" ? "object-contain" : background.fit === "fill" ? "object-fill" : "object-cover";
    return (
      <div className="absolute inset-0 bg-black">
        <video ref={videoRef} className={`w-full h-full ${fitClass}`} autoPlay loop={background.loop !== false} muted playsInline />
        {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
      </div>
    );
  }

  if (background.type === "camera") {
    const camLayout = background.cameraLayout ?? "fullscreen";
    // PiP and side-by-side: show a solid/color background underneath, camera is rendered by CameraOverlay
    if (camLayout !== "fullscreen") {
      return (
        <div className="absolute inset-0 bg-black">
          {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
        </div>
      );
    }
    // Fullscreen camera
    return (
      <div className="absolute inset-0 bg-black">
        {cameraStream && <video ref={cameraRef} className="w-full h-full object-cover" autoPlay muted playsInline />}
        {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
      </div>
    );
  }

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
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 500 },
  });
  const queryClient = useQueryClient();
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  // --- Auto-hide overlays (B2.3) ---------------------------------------------
  // Track the moment each overlay was first observed enabled, so the timeout
  // resets only on a fresh false→true transition (not on every poll).
  const ltShownAtRef = useRef<number | null>(null);
  const toShownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!screenState) return;
    const now = Date.now();

    // Lower third
    if (screenState.lowerThirdEnabled) {
      if (ltShownAtRef.current === null) ltShownAtRef.current = now;
      const dismissSec = screenState.lowerThirdAutoDismissSec ?? 0;
      if (dismissSec > 0 && now - ltShownAtRef.current >= dismissSec * 1000) {
        ltShownAtRef.current = null;
        updateScreen({ data: {
          isBlack: screenState.isBlack,
          isClear: screenState.isClear,
          contentType: screenState.contentType,
          lowerThirdEnabled: false,
        }});
      }
    } else {
      ltShownAtRef.current = null;
    }

    // Text overlay
    if (screenState.textOverlayEnabled) {
      if (toShownAtRef.current === null) toShownAtRef.current = now;
      const dismissSec = screenState.textOverlayAutoDismissSec ?? 0;
      if (dismissSec > 0 && now - toShownAtRef.current >= dismissSec * 1000) {
        toShownAtRef.current = null;
        updateScreen({ data: {
          isBlack: screenState.isBlack,
          isClear: screenState.isClear,
          contentType: screenState.contentType,
          textOverlayEnabled: false,
        }});
      }
    } else {
      toShownAtRef.current = null;
    }
  }, [screenState, updateScreen]);

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

  // Click anywhere to request fullscreen (user gesture)
  const handleClick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

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

  // ── Title parsing ─────────────────────────────────────────────────────────
  const rawTitle = screenState?.title ?? "";

  // Song: split on §
  const secIdx = rawTitle.indexOf("§");
  const songName     = secIdx !== -1 ? rawTitle.slice(0, secIdx) : (contentType !== "verse" ? rawTitle : "");
  const sectionLabel = secIdx !== -1 ? rawTitle.slice(secIdx + 1) : "";

  // Verse: split on |
  const pipeIdx        = rawTitle.indexOf("|");
  const verseRef       = contentType === "verse" ? (pipeIdx !== -1 ? rawTitle.slice(0, pipeIdx) : rawTitle) : "";
  const translationAbbr = pipeIdx !== -1 ? rawTitle.slice(pipeIdx + 1) : "";
  const bookName = verseRef ? verseRef.replace(/\s+\d+:.*$/, "").trim() : "";

  // ── Verse content renderer with superscript numbers ───────────────────────
  function renderVerseContent(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const m = line.match(/^(\d+)\s+([\s\S]*)$/);
      if (m) {
        return (
          <span key={i}>
            {i > 0 && "\n"}
            <sup style={{ fontSize: "0.42em", fontWeight: 700, verticalAlign: "super", opacity: 0.75, letterSpacing: "0.04em", marginRight: "0.18em" }}>{m[1]}</sup>{m[2]}
          </span>
        );
      }
      return <span key={i}>{i > 0 ? "\n" : ""}{line}</span>;
    });
  }

  // ── Ticker bottom offset ─────────────────────────────────────────────────
  const tickerH = screenState?.tickerEnabled && screenState.tickerText ? 48 : 0;

  // ── Camera layout ────────────────────────────────────────────────────────
  const camLayout = bg?.cameraLayout ?? "fullscreen";
  const showCameraOverlay = bg?.type === "camera" && camLayout !== "fullscreen" && cameraStream;

  // Horizontal centering for top/bottom labels — centers within the content half
  // (not the viewport) when a side-by-side camera layout is active.
  const labelHorizontalCenter: React.CSSProperties = (() => {
    if (showCameraOverlay && camLayout === "side-left") {
      // Camera occupies LEFT half → labels centered on the right half (75% of viewport).
      return { left: "75%", transform: "translateX(-50%)" };
    }
    if (showCameraOverlay && camLayout === "side-right") {
      // Camera occupies RIGHT half → labels centered on the left half (25% of viewport).
      return { left: "25%", transform: "translateX(-50%)" };
    }
    return { left: "50%", transform: "translateX(-50%)" };
  })();

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-black select-none"
      style={{ cursor: hideCursor ? "none" : "default" }}
      onClick={handleClick}
    >
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />

      {/* Background */}
      <BackgroundLayer background={bg} cameraStream={cameraStream} />

      {/* Camera PiP / Side overlay (non-fullscreen layouts) */}
      {showCameraOverlay && (
        <CameraOverlay
          stream={cameraStream}
          layout={camLayout}
          shape={bg?.cameraShape ?? "rect"}
          pipSize={bg?.cameraPipSize ?? 30}
        />
      )}

      {/* Black screen overlay */}
      {screenState?.isBlack && <div className="absolute inset-0 bg-black z-40" />}

      {/* Content */}
      {showContent && (
        <div
          key={contentKey}
          className="absolute z-20 flex"
          style={{
            // Constrain to the non-camera half when using side-by-side camera layout
            top: 0,
            bottom: 0,
            left: showCameraOverlay && camLayout === "side-left" ? "50%" : 0,
            right: showCameraOverlay && camLayout === "side-right" ? "50%" : 0,
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

      {/* ── Book name — top center (centered within content half when side-by-side) ── */}
      {showContent && contentType === "verse" && bookName && (
        <div className="absolute z-30 pointer-events-none" style={{ top: 20, ...labelHorizontalCenter }}>
          <div style={{ background: "rgba(0,0,0,0.52)", borderRadius: "4px", padding: "5px 20px", backdropFilter: "blur(6px)", textAlign: "center", whiteSpace: "nowrap" }}>
            <span style={{ color: "rgba(255,255,255,0.92)", fontSize: "15px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              {bookName}
            </span>
          </div>
        </div>
      )}

      {/* ── Scripture reference + translation — bottom center ─────────────────── */}
      {showContent && contentType === "verse" && verseRef && (
        <div className="absolute z-30 pointer-events-none" style={{ bottom: tickerH + 20, ...labelHorizontalCenter }}>
          <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: "4px", padding: "5px 18px", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: "10px", whiteSpace: "nowrap" }}>
            <span style={{ color: "rgba(255,255,255,0.92)", fontSize: "15px", fontWeight: 500, letterSpacing: "0.04em" }}>{verseRef}</span>
            {translationAbbr && (
              <>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>•</span>
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{translationAbbr}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Song name — top center ───────────────────────────────────────────── */}
      {showContent && contentType === "song" && songName && (
        <div className="absolute z-30 pointer-events-none" style={{ top: 20, ...labelHorizontalCenter }}>
          <div style={{ background: "rgba(0,0,0,0.52)", borderRadius: "4px", padding: "5px 20px", backdropFilter: "blur(6px)", textAlign: "center", whiteSpace: "nowrap" }}>
            <span style={{ color: "rgba(255,255,255,0.92)", fontSize: "15px", fontWeight: 600, letterSpacing: "0.06em" }}>
              {songName}
            </span>
          </div>
        </div>
      )}

      {/* ── Song section — bottom center ─────────────────────────────────────── */}
      {showContent && contentType === "song" && sectionLabel && (
        <div className="absolute z-30 pointer-events-none" style={{ bottom: tickerH + 20, ...labelHorizontalCenter }}>
          <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: "4px", padding: "5px 18px", backdropFilter: "blur(4px)", whiteSpace: "nowrap" }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {sectionLabel}
            </span>
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
          nameColor={screenState.lowerThirdNameColor ?? "#ffffff"}
          titleColor={screenState.lowerThirdTitleColor ?? "rgba(255,255,255,0.65)"}
          bgColor={screenState.lowerThirdBgColor ?? "rgba(0,0,0,0.72)"}
          accentColor={screenState.lowerThirdAccentColor ?? "rgba(255,255,255,0.75)"}
          nameSize={screenState.lowerThirdNameSize ?? 22}
          titleSize={screenState.lowerThirdTitleSize ?? 13}
        />
      )}

      {/* ── Clock ── */}
      {screenState?.clockOverlayEnabled && !screenState.isBlack && (
        <ClockOverlay
          time={clockTime}
          position={screenState.clockPosition ?? "top-right"}
          clockStyle={screenState.clockStyle ?? "digital"}
          showDate={screenState.clockShowDate ?? false}
          showSeconds={screenState.clockShowSeconds ?? true}
          dateFormat={screenState.clockDateFormat ?? "long"}
          fontSize={screenState.clockFontSize ?? 16}
          color={screenState.clockColor ?? "rgba(255,255,255,0.92)"}
          bgColor={screenState.clockBgColor ?? "rgba(0,0,0,0.52)"}
          bgOpacity={screenState.clockBgOpacity ?? 100}
          bgRadius={screenState.clockBgRadius ?? 6}
          bgPadding={screenState.clockBgPadding ?? 13}
        />
      )}

      {/* ── Logo overlay ── */}
      {screenState?.logoOverlayEnabled && screenState.logoUrl && !screenState.isBlack && (
        <LogoOverlay
          url={screenState.logoUrl}
          position={screenState.logoPosition ?? "top-right"}
          size={screenState.logoSize ?? 20}
          opacity={screenState.logoOpacity ?? 100}
          shape={screenState.logoShape ?? "rect"}
          text={screenState.logoText}
          textColor={screenState.logoTextColor ?? "#ffffff"}
          textSize={screenState.logoTextSize ?? 14}
          textPosition={screenState.logoTextPosition ?? "right"}
          textWeight={screenState.logoTextWeight ?? "600"}
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
          italic={screenState.textOverlayItalic ?? false}
          align={screenState.textOverlayAlign ?? "left"}
          fontFamily={screenState.textOverlayFontFamily ?? "inherit"}
          shadow={screenState.textOverlayShadow ?? false}
          opacity={screenState.textOverlayOpacity ?? 100}
          padding={screenState.textOverlayPadding ?? 8}
          radius={screenState.textOverlayRadius ?? 4}
          letterSpacing={screenState.textOverlayLetterSpacing ?? 0}
          animation={screenState.textOverlayAnimation ?? "none"}
          maxWidth={screenState.textOverlayMaxWidth ?? 80}
          borderColor={screenState.textOverlayBorderColor ?? "transparent"}
          borderWidth={screenState.textOverlayBorderWidth ?? 0}
          tickerH={tickerH}
        />
      )}

      {/* ── Stopwatch / Countdown timer ── */}
      {screenState?.timerEnabled && !screenState.isBlack && (
        <TimerOverlay
          mode={screenState.timerMode ?? "stopwatch"}
          startedAt={screenState.timerStartedAt}
          accumulatedMs={screenState.timerAccumulatedMs ?? 0}
          durationSec={screenState.timerDurationSec ?? 300}
          position={screenState.timerPosition ?? "top-center"}
          fontSize={screenState.timerFontSize ?? 48}
          color={screenState.timerColor ?? "#ffffff"}
          bgColor={screenState.timerBgColor ?? "rgba(0,0,0,0.6)"}
          label={screenState.timerLabel}
          warningSec={screenState.timerWarningSec ?? 60}
          warningColor={screenState.timerWarningColor ?? "#fbbf24"}
          criticalColor={screenState.timerCriticalColor ?? "#ef4444"}
          tickerH={tickerH}
        />
      )}

      {/* Ticker */}
      {screenState?.tickerEnabled && screenState.tickerText && (
        <div
          className="absolute bottom-0 left-0 right-0 z-30 flex items-center overflow-hidden"
          style={{
            height: "48px",
            background: screenState.tickerBgColor ?? "rgba(0,0,0,0.75)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              color: screenState.tickerColor ?? "#ffffff",
              fontSize: `${screenState.tickerFontSize ?? 18}px`,
              fontWeight: 500,
              letterSpacing: "0.02em",
              paddingLeft: "100%",
              animation: `wf-ticker ${screenState.tickerSpeed ?? 20}s linear infinite`,
            }}
          >
            {screenState.tickerText}
            <span style={{ margin: "0 2em", opacity: 0.6 }}>{screenState.tickerDivider ?? "✦"}</span>
            {screenState.tickerText}
            <span style={{ margin: "0 2em", opacity: 0.6 }}>{screenState.tickerDivider ?? "✦"}</span>
            {screenState.tickerText}
          </div>
        </div>
      )}

      {/* Idle watermark — uses optional Church Name from settings; nothing if not set */}
      {(!screenState || (screenState.isClear && !screenState.isBlack)) && screenState?.idleWatermark && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="text-white/8 text-3xl font-light tracking-widest uppercase select-none">
            {screenState.idleWatermark}
          </div>
        </div>
      )}

      {/* Fullscreen hint — only when not fullscreen */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-opacity duration-700"
        style={{ opacity: document.fullscreenElement ? 0 : 0.35 }}
      >
        <div style={{ color: "#fff", fontSize: "11px", letterSpacing: "0.08em", textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
          Click anywhere to enter fullscreen
        </div>
      </div>

    </div>
  );
}
