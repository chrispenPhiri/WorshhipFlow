/**
 * Live Stream Overlays for the Broadcast Window
 * Shown when isLive is true in the screen state.
 * Includes: LIVE badge, live timer, scene label, social handles.
 */
import { useEffect, useState } from "react";

function useLiveDuration(startTime?: string | null): number {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!startTime) { setMs(0); return; }
    const tick = () => setMs(Date.now() - new Date(startTime).getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return ms;
}

function formatDur(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube:  "#ef4444",
  facebook: "#3b82f6",
  twitch:   "#a855f7",
  custom:   "#f59e0b",
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube:  "YouTube Live",
  facebook: "Facebook Live",
  twitch:   "Twitch",
  custom:   "Live",
};

/** Main "On Air" overlay — shown in top-left of broadcast window */
export function LiveBadgeOverlay({
  isLive,
  platform,
  startTime,
  socialHandles,
  scene,
}: {
  isLive: boolean;
  platform?: string | null;
  startTime?: string | null;
  socialHandles?: string | null;
  scene?: string | null;
}) {
  const duration = useLiveDuration(isLive ? startTime : null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLive) {
      const t = setTimeout(() => setVisible(true), 60);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      return undefined;
    }
  }, [isLive]);

  if (!isLive) return null;

  const color = platform ? (PLATFORM_COLORS[platform] ?? "#ef4444") : "#ef4444";
  const label = platform ? (PLATFORM_LABELS[platform] ?? "Live") : "Live";
  const handles = (socialHandles ?? "").split(",").map(s => s.trim()).filter(Boolean);

  return (
    <div
      className="absolute top-4 left-4 z-40 pointer-events-none flex flex-col gap-1.5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-6px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {/* LIVE badge */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1"
        style={{
          background: "rgba(0,0,0,0.72)",
          border: `1.5px solid ${color}`,
          borderRadius: 6,
          backdropFilter: "blur(8px)",
          boxShadow: `0 0 10px ${color}44`,
        }}
      >
        {/* Pulsing dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: color,
            boxShadow: `0 0 6px ${color}`,
            animation: "wf-live-pulse 1.4s ease-in-out infinite",
          }}
        />
        <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", fontFamily: "Inter, system-ui, sans-serif" }}>
          LIVE
        </span>
        <span style={{ color: color, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", fontFamily: "Inter, system-ui, sans-serif" }}>
          {label}
        </span>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontFamily: "monospace, monospace" }}>
          {formatDur(duration)}
        </span>
      </div>

      {/* Scene label */}
      {scene && (
        <div
          style={{
            background: "rgba(0,0,0,0.6)",
            borderRadius: 4,
            padding: "2px 8px",
            backdropFilter: "blur(6px)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>Scene</span>
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>{scene}</span>
        </div>
      )}

      {/* Social handles */}
      {handles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {handles.map((h, i) => (
            <div
              key={i}
              style={{
                background: "rgba(0,0,0,0.55)",
                borderRadius: 4,
                padding: "2px 8px",
                backdropFilter: "blur(4px)",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <span style={{ color: color, fontSize: 10, fontWeight: 600 }}>{h}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Animation keyframes injected once */
export const LIVE_OVERLAY_STYLES = `
@keyframes wf-live-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
  50%       { opacity: 0.5; box-shadow: 0 0 14px currentColor; }
}
@keyframes wf-live-border {
  0%, 100% { opacity: 0.0; }
  50%       { opacity: 0.18; }
}
`;
