/**
 * QueuePanel — compact Live Queue surface embedded in the right panel.
 * Shows the current run order with Go Live / remove / reorder controls.
 * Uses the same localStorage store as the full /queue page so both stay
 * in sync instantly.
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play, X, ArrowUp, ArrowDown, ChevronRight,
  ListVideo, ExternalLink, BookOpen, Image as ImageIcon,
  Video, Music, Type, Music2, Palette, Hash, Timer,
} from "lucide-react";
import {
  loadQueue, saveQueue, type QueueItem, type QueueItemKind,
} from "@/lib/live-queue";
import { createObjectUrl, getDataUrl } from "@/lib/media-library";
import { useUpdateScreenState, useGetScreenState } from "@workspace/api-client-react";
import { toast } from "sonner";

const KIND_COLORS: Record<QueueItemKind, string> = {
  image: "#3b82f6", video: "#ef4444", audio: "#a855f7",
  bible: "#f59e0b", text: "#06b6d4", song: "#22c55e",
  theme: "#8b5cf6", hymn: "#ec4899", countdown: "#f97316",
};
const KIND_ICONS: Record<QueueItemKind, React.ReactNode> = {
  image: <ImageIcon className="w-3 h-3" />,
  video: <Video className="w-3 h-3" />,
  audio: <Music className="w-3 h-3" />,
  bible: <BookOpen className="w-3 h-3" />,
  text: <Type className="w-3 h-3" />,
  song: <Music2 className="w-3 h-3" />,
  theme: <Palette className="w-3 h-3" />,
  hymn: <Hash className="w-3 h-3" />,
  countdown: <Timer className="w-3 h-3" />,
};

export function QueuePanel() {
  const [queue, setQueue] = useState<QueueItem[]>(() => loadQueue());
  const [liveId, setLiveId] = useState<string>();

  const { data: screenState } = useGetScreenState();
  const { mutateAsync: updateScreen } = useUpdateScreenState();

  // Re-sync when the /queue page adds items (storage event from same tab
  // doesn't fire, so we poll lightly — 1 s is imperceptible).
  useEffect(() => {
    const onStorage = () => setQueue(loadQueue());
    window.addEventListener("storage", onStorage);
    const interval = setInterval(() => setQueue(loadQueue()), 1000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(interval); };
  }, []);

  useEffect(() => { saveQueue(queue); }, [queue]);

  function songSections(lyrics: string): { label: string; content: string }[] {
    const raw = lyrics.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    let v = 0;
    return raw.map(text => {
      const m = text.split("\n")[0].trim().match(/^\[(.+?)\]/);
      if (m) { const rest = text.slice(text.split("\n")[0].length).trim(); return { label: m[1], content: rest || text }; }
      v++; return { label: `Verse ${v}`, content: text };
    });
  }

  const goLive = useCallback(async (item: QueueItem) => {
    const bg = screenState?.background ?? { type: "color" as const, value: "#000000" };
    const base = { isBlack: screenState?.isBlack ?? false, isClear: false, comparisonMode: false, secondaryTitle: "", secondaryContent: "" };
    try {
      if (item.kind === "image" && item.mediaId) {
        const dataUrl = await getDataUrl(item.mediaId);
        if (!dataUrl) { toast.error("Could not load image"); return; }
        await updateScreen({ data: { ...base, contentType: "image" as const, title: item.label, content: undefined, background: { type: "image", value: dataUrl, overlay: 0, fit: "cover" } as never } });
      } else if (item.kind === "video" && item.mediaId) {
        const url = await createObjectUrl(item.mediaId);
        if (!url) { toast.error("Could not load video"); return; }
        await updateScreen({ data: { ...base, contentType: "image" as const, title: item.label, content: undefined, background: { type: "video", value: url, loop: true, overlay: 0 } as never } });
      } else if (item.kind === "audio" && item.mediaId) {
        const url = await createObjectUrl(item.mediaId);
        if (!url) { toast.error("Could not load audio"); return; }
        new Audio(url).play().catch(() => {});
        toast.success("Playing: " + item.label);
        setLiveId(item.id);
        return;
      } else if (item.kind === "bible" && item.text) {
        await updateScreen({ data: { ...base, contentType: "verse" as const, background: bg, title: item.label, content: item.text } as never });
      } else if (item.kind === "text" && item.text) {
        await updateScreen({ data: { ...base, contentType: "custom_text" as const, background: bg, title: "Custom Text", content: item.text } as never });
      } else if (item.kind === "song" && item.text) {
        const sections = songSections(item.text);
        const first = sections[0] ?? { label: "Verse 1", content: item.text };
        const songTitle = item.label.includes(" — ") ? item.label.split(" — ")[0] : item.label;
        const secLabel = item.label.includes(" — ") ? item.label.split(" — ").slice(1).join(" — ") : first.label;
        await updateScreen({ data: { ...base, contentType: "song" as const, background: bg, title: `${songTitle}§${secLabel}`, content: first.content } as never });
      } else if (item.kind === "theme" && item.text) {
        const background = JSON.parse(item.text);
        const ct = screenState?.contentType ?? "none";
        await updateScreen({ data: { ...base, contentType: ct as never, background, title: screenState?.title ?? "", content: screenState?.content ?? "" } as never });
      } else if (item.kind === "hymn" && item.text) {
        await updateScreen({ data: { ...base, contentType: "custom_text" as const, background: bg, title: "Hymn", content: item.text } as never });
      } else if (item.kind === "countdown" && item.text) {
        const minutes = parseFloat(item.text) || 5;
        const targetMs = Date.now() + minutes * 60_000;
        const cLabel = item.subLabel || "Service starts in";
        localStorage.setItem("wf-countdown", JSON.stringify({ label: cLabel, targetMs, active: true }));
        const mm = String(Math.floor(minutes)).padStart(2, "0");
        await updateScreen({ data: { ...base, contentType: "custom_text" as const, background: bg, title: cLabel, content: `${mm}:00` } as never });
      } else {
        toast.info("Open Live Queue to manage this item");
        return;
      }
      setLiveId(item.id);
      toast.success(`Live: ${item.label}`);
    } catch { toast.error("Failed to send to screen"); }
  }, [screenState, updateScreen]);

  const goNext = () => {
    if (!queue.length) return;
    const idx = queue.findIndex(i => i.id === liveId);
    const next = queue[idx === -1 ? 0 : Math.min(idx + 1, queue.length - 1)];
    goLive(next);
  };

  const remove = (id: string) => setQueue(q => q.filter(i => i.id !== id));
  const moveUp = (i: number) => setQueue(q => { const n = [...q]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; });
  const moveDown = (i: number) => setQueue(q => { const n = [...q]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; });

  if (queue.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-muted-foreground">
        <ListVideo className="w-9 h-9 opacity-25" />
        <p className="text-xs text-center">Queue is empty</p>
        <Link href="/queue">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Open Live Queue
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
          {queue.length} item{queue.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1" onClick={goNext}>
            <ChevronRight className="w-3 h-3" /> Next
          </Button>
          <Link href="/queue">
            <Button size="icon" variant="ghost" className="h-6 w-6" title="Open full queue workspace">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {queue.map((item, i) => {
          const color = KIND_COLORS[item.kind];
          const isLive = item.id === liveId;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-2 py-1.5 border-b border-border/50 transition-colors ${
                isLive ? "bg-primary/10" : "hover:bg-accent/40"
              }`}
            >
              {/* Index */}
              <span className="text-[10px] text-muted-foreground w-4 text-center shrink-0 font-mono">{i + 1}</span>

              {/* Thumbnail */}
              <div
                className="w-9 h-7 rounded overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: color + "20" }}
              >
                {item.thumbnail
                  ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                  : <span style={{ color }}>{KIND_ICONS[item.kind]}</span>
                }
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate text-foreground leading-tight">{item.label}</p>
                {item.subLabel && (
                  <p className="text-[10px] text-muted-foreground truncate leading-tight">{item.subLabel}</p>
                )}
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 h-3 mt-0.5 leading-none"
                  style={{ borderColor: color + "80", color }}
                >
                  {item.kind}
                </Badge>
              </div>

              {/* Reorder */}
              <div className="flex flex-col gap-0 shrink-0">
                <button onClick={() => moveUp(i)} disabled={i === 0}
                  className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowUp className="w-2.5 h-2.5" />
                </button>
                <button onClick={() => moveDown(i)} disabled={i === queue.length - 1}
                  className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowDown className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Go Live */}
              <Button
                size="sm"
                variant={isLive ? "default" : "outline"}
                className="h-6 px-1.5 text-[10px] shrink-0"
                onClick={() => goLive(item)}
              >
                <Play className="w-2.5 h-2.5 mr-0.5" />
                {isLive ? "Live" : "Go"}
              </Button>

              {/* Remove */}
              <button
                onClick={() => remove(item.id)}
                className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border shrink-0">
        <Link href="/queue">
          <Button variant="ghost" size="sm" className="w-full h-7 text-xs gap-1.5 text-muted-foreground">
            <ListVideo className="w-3.5 h-3.5" /> Add items in Live Queue workspace
          </Button>
        </Link>
      </div>
    </div>
  );
}
