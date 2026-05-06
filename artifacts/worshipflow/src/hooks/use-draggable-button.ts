import { useCallback, useEffect, useRef, useState } from "react";

interface Pos { x: number; y: number }

const DRAG_THRESHOLD = 6;

/**
 * Makes a floating button draggable anywhere on screen.
 * Position is saved to localStorage so it persists across sessions.
 *
 * Usage:
 *   const btn = useDraggableButton("my-btn-pos", () => ({ x: 20, y: 80 }));
 *   <button style={btn.style} onPointerDown={btn.onPointerDown} onClick={() => btn.wasClick() && doSomething()} />
 */
export function useDraggableButton(storageKey: string, getDefault: () => Pos) {
  const [pos, setPos] = useState<Pos | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as Pos;
    } catch { /* */ }
    return null;
  });

  const posRef = useRef<Pos | null>(pos);
  const drag = useRef({ active: false, ox: 0, oy: 0, moved: false });

  /* Global move + up listeners */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return;
      drag.current.moved = true;
      const sz = 44; // button size for boundary clamping
      const x = Math.max(0, Math.min(window.innerWidth  - sz, e.clientX - drag.current.ox));
      const y = Math.max(0, Math.min(window.innerHeight - sz, e.clientY - drag.current.oy));
      posRef.current = { x, y };
      setPos({ x, y });
    };
    const onUp = () => {
      if (drag.current.active && drag.current.moved && posRef.current) {
        localStorage.setItem(storageKey, JSON.stringify(posRef.current));
      }
      drag.current.active = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
    };
  }, [storageKey]);

  /* Call this on the button's onPointerDown */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const p = posRef.current ?? getDefault();
    drag.current = { active: true, ox: e.clientX - p.x, oy: e.clientY - p.y, moved: false };
  }, [getDefault]);

  /**
   * Call inside onClick — returns true only when it was a genuine tap (not a drag).
   * Pattern: onClick={() => btn.wasClick() && openPanel()}
   */
  const wasClick = useCallback(() => {
    return !drag.current.moved;
  }, []);

  /* Inline style — replaces fixed bottom/right classes */
  const p = pos ?? getDefault();
  const style: React.CSSProperties = {
    position: "fixed",
    left: p.x,
    top: p.y,
    zIndex: 40,
    cursor: drag.current.active ? "grabbing" : "grab",
    touchAction: "none",
  };

  return { style, onPointerDown, wasClick };
}
