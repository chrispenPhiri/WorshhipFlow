import { useEffect, useRef } from "react";
import { WALLPAPER_CSS } from "@/lib/wallpaper-styles";

const STAR_COUNT = 120;
const BOKEH_COUNT = 18;
const MATRIX_COLS = 30;
const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ01アβΩ∆∑∏♦♠♣♥☯✝✡☪";

function generateStars() {
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    dur: (Math.random() * 4 + 2).toFixed(1),
    delay: (Math.random() * 6).toFixed(1),
  }));
}

function generateBokeh() {
  const colors = [
    "#7c3aed", "#4338ca", "#0891b2", "#0d9488",
    "#8b5cf6", "#06b6d4", "#c084fc", "#38bdf8",
  ];
  return Array.from({ length: BOKEH_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 90,
    size: Math.random() * 80 + 30,
    color: colors[i % colors.length],
    dur: (Math.random() * 14 + 8).toFixed(1),
    delay: (Math.random() * 8).toFixed(1),
    opacity: (Math.random() * 0.3 + 0.1).toFixed(2),
    scale: (Math.random() * 0.8 + 0.6).toFixed(2),
  }));
}

function generateMatrixCols() {
  return Array.from({ length: MATRIX_COLS }, (_, i) => {
    const len = Math.floor(Math.random() * 20) + 8;
    const chars = Array.from({ length: len }, () =>
      MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
    ).join("\n");
    return {
      id: i,
      left: (i / MATRIX_COLS) * 100,
      chars,
      dur: (Math.random() * 8 + 5).toFixed(1),
      delay: (Math.random() * 8).toFixed(1),
    };
  });
}

const stars = generateStars();
const bokeh = generateBokeh();
const matrixCols = generateMatrixCols();

interface LiveWallpaperLayerProps {
  wallpaperId: string;
  overlay?: number;
}

export function LiveWallpaperLayer({ wallpaperId, overlay = 0 }: LiveWallpaperLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Inject CSS once
  useEffect(() => {
    const existing = document.getElementById("wf-wallpaper-styles");
    if (!existing) {
      const style = document.createElement("style");
      style.id = "wf-wallpaper-styles";
      style.textContent = WALLPAPER_CSS;
      document.head.appendChild(style);
    }
    return () => {};
  }, []);

  const overlayStyle = overlay > 0
    ? { background: `rgba(0,0,0,${overlay / 100})` }
    : undefined;

  const cls = `wf-wallpaper-${wallpaperId}`;

  return (
    <div className="absolute inset-0">
      <div className={`absolute inset-0 ${cls}`} ref={canvasRef as any}>
        {wallpaperId === "starfield" &&
          stars.map((s) => (
            <div
              key={s.id}
              className="star"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                "--dur": `${s.dur}s`,
                "--delay": `${s.delay}s`,
              } as React.CSSProperties}
            />
          ))}

        {wallpaperId === "bokeh" &&
          bokeh.map((b) => (
            <div
              key={b.id}
              className="bokeh-dot"
              style={{
                left: `${b.left}%`,
                bottom: "-100px",
                width: `${b.size}px`,
                height: `${b.size}px`,
                background: b.color,
                "--dur": `${b.dur}s`,
                "--delay": `${b.delay}s`,
                "--op": b.opacity,
                "--s": b.scale,
              } as React.CSSProperties}
            />
          ))}

        {wallpaperId === "matrix" &&
          matrixCols.map((col) => (
            <div
              key={col.id}
              className="matrix-col"
              style={{
                left: `${col.left}%`,
                "--dur": `${col.dur}s`,
                "--delay": `${col.delay}s`,
              } as React.CSSProperties}
            >
              {col.chars}
            </div>
          ))}

        {wallpaperId === "aurora" && (
          <div
            className="aurora-blob"
            style={{
              width: "45%",
              height: "45%",
              top: "20%",
              left: "25%",
              background: "radial-gradient(ellipse, #10b98155 0%, transparent 70%)",
              animation: "wf-aurora-blob3 22s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}
    </div>
  );
}
