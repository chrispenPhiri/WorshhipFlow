/**
 * TextSelectionSend — global floating pill that appears whenever the user
 * highlights text anywhere in the app, offering a one-click "Send to screen"
 * action that pushes the selected text as a textOverlay on the broadcast.
 *
 * Excluded from: /broadcast, /countdown, /hymn-number (projection-only pages)
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { MonitorPlay, X } from "lucide-react";
import { useUpdateScreenState, useGetScreenState } from "@workspace/api-client-react";
import { toast } from "sonner";

const EXCLUDED_PATHS = ["/broadcast", "/countdown", "/hymn-number"];

interface PopupState {
  x: number;
  y: number;
  text: string;
}

export function TextSelectionSend() {
  const [location] = useLocation();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const { data: screenState } = useGetScreenState();
  const { mutate: updateScreen } = useUpdateScreenState();

  const isExcluded = EXCLUDED_PATHS.some((p) => location.startsWith(p));

  useEffect(() => {
    if (isExcluded) return;

    const onMouseUp = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? "";
        if (text.length < 2) {
          setPopup(null);
          return;
        }
        // Try to position near the end of the selection range
        let x = e.clientX;
        let y = e.clientY;
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(sel.rangeCount - 1);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) {
            x = rect.right;
            y = rect.top;
          }
        }
        setPopup({ x, y, text });
      }, 30);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      setPopup(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPopup(null);
      }
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isExcluded]);

  if (isExcluded || !popup) return null;

  const sendToScreen = () => {
    updateScreen({
      data: {
        isBlack:      screenState?.isBlack     ?? false,
        isClear:      screenState?.isClear     ?? false,
        contentType:  (screenState?.contentType ?? "none") as
          "none" | "verse" | "song" | "custom_text" | "image" | "video" | "game",
        isLive:       screenState?.isLive      ?? false,
        liveScene:    screenState?.liveScene,
        livePlatform: screenState?.livePlatform,
        liveStartTime: screenState?.liveStartTime,
        textOverlayEnabled: true,
        textOverlayContent: popup.text,
      },
    });
    toast("Text sent to screen", {
      description: popup.text.length > 60 ? popup.text.slice(0, 60) + "…" : popup.text,
    });
    setPopup(null);
    window.getSelection()?.removeAllRanges();
  };

  // Clamp to viewport
  const POPUP_W = 172;
  const left = Math.min(Math.max(popup.x - POPUP_W / 2, 8), window.innerWidth - POPUP_W - 8);
  const top  = Math.max(popup.y - 52, 8);

  return (
    <div
      ref={popupRef}
      style={{ position: "fixed", left, top, zIndex: 9999 }}
      className="flex items-center gap-1.5 bg-popover border border-border shadow-xl rounded-full px-2.5 py-1.5 text-sm font-medium animate-in fade-in zoom-in-95 duration-100 select-none"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <MonitorPlay className="w-3.5 h-3.5 text-primary shrink-0" />
      <button
        type="button"
        onClick={sendToScreen}
        className="text-foreground hover:text-primary transition-colors whitespace-nowrap leading-none"
      >
        Send to screen
      </button>
      <button
        type="button"
        onClick={() => setPopup(null)}
        className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
