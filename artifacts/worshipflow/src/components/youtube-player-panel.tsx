import { useCallback, useEffect, useRef, useState } from "react";
import {
  Youtube, X, Play, Pause, Music, Search, ExternalLink,
  ChevronUp, Volume2, VolumeX, GripHorizontal, EyeOff, Eye,
  Monitor, Trash2, ListPlus, ListMusic, RotateCcw, Plus, ArrowUp, ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

/* ── Types ──────────────────────────────────────────────────── */
interface LibraryItem {
  id: string;
  title: string;
  artist: string;
  ytId: string;
}

interface QueueItem {
  id: string; // unique per queue slot
  ytId: string;
  title: string;
}

/* ── Default library ─────────────────────────────────────────── */
const DEFAULT_LIBRARY: LibraryItem[] = [
  { id: "p1", title: "Praise & Worship Mix",      artist: "Instrumental", ytId: "XUQNRpFXKkQ" },
  { id: "p2", title: "Soft Piano Worship",         artist: "Instrumental", ytId: "GM1pG6mMdxs" },
  { id: "p3", title: "Deep Worship Atmosphere",    artist: "Instrumental", ytId: "GMy_IBQVW-U" },
  { id: "p4", title: "Gospel Background Music",    artist: "Instrumental", ytId: "x_H0lo1MKLU" },
  { id: "p5", title: "Peaceful Worship Strings",   artist: "Instrumental", ytId: "lFcSrYw2ARs" },
  { id: "p6", title: "Ambient Church Music",       artist: "Instrumental", ytId: "77ZozI0rw7w" },
  { id: "p7", title: "Contemporary Worship Beats", artist: "Instrumental", ytId: "GkBMaWY_1KM" },
  { id: "p8", title: "Midnight Worship Session",   artist: "Instrumental", ytId: "pkCzH5h2Qro" },
];

const LIBRARY_KEY = "wf-yt-library";

function loadLibrary(): LibraryItem[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) return JSON.parse(raw) as LibraryItem[];
  } catch { /* */ }
  return DEFAULT_LIBRARY;
}

function saveLibrary(lib: LibraryItem[]) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
}

/* ── Helpers ─────────────────────────────────────────────────── */
function extractYouTubeId(url: string): string | null {
  const clean = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pat of patterns) {
    const m = clean.match(pat);
    if (m) return m[1];
  }
  return null;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ── Component ───────────────────────────────────────────────── */
export function YoutubePlayerPanel() {
  /* Sheet / tabs */
  const [open, setOpen]         = useState(false);
  const [tab, setTab]           = useState("library");

  /* URL tab inputs */
  const [urlInput, setUrlInput]     = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [urlError, setUrlError]     = useState<string | null>(null);

  /* Library (editable, persisted) */
  const [library, setLibrary] = useState<LibraryItem[]>(loadLibrary);

  /* Queue */
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queueRef = useRef<QueueItem[]>([]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  /* Playback */
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState("");
  const [isPaused, setIsPaused]       = useState(false);
  const [volume, setVolume]           = useState(80);
  const [muted, setMuted]             = useState(false);

  /* Drag */
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number } | null>(null);
  const playerPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragState = useRef({ active: false, ox: 0, oy: 0 });

  /* Hide */
  const [isHidden, setIsHidden] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* ── Auto-advance: listen for YouTube "video ended" (state 0) ── */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(
          typeof event.data === "string" ? event.data : JSON.stringify(event.data),
        ) as { event?: string; info?: number };
        if (data.event === "onStateChange" && data.info === 0) {
          // video ended — dequeue next
          const next = queueRef.current[0];
          if (next) {
            setQueue(q => q.slice(1));
            setActiveId(next.ytId);
            setActiveTitle(next.title);
            setIsPaused(false);
          }
        }
      } catch { /* non-YouTube messages */ }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  /* ── Drag handlers ───────────────────────────────────────────── */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragState.current.active) return;
      const W = isHidden ? 200 : 280;
      const H = isHidden ? 48  : 230;
      const x = Math.max(0, Math.min(window.innerWidth  - W, e.clientX - dragState.current.ox));
      const y = Math.max(0, Math.min(window.innerHeight - H, e.clientY - dragState.current.oy));
      playerPosRef.current = { x, y };
      setPlayerPos({ x, y });
    };
    const onUp = () => { dragState.current.active = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isHidden]);

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const pos = playerPosRef.current ?? defaultPos();
    dragState.current = { active: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y };
  }, []);

  function defaultPos() {
    return { x: 20, y: Math.max(0, window.innerHeight - 240) };
  }

  function getPlayerStyle(): React.CSSProperties {
    const pos = playerPos ?? defaultPos();
    return { position: "fixed", left: pos.x, top: pos.y, zIndex: 40 };
  }

  /* ── YouTube commands ────────────────────────────────────────── */
  function ytCmd(func: string, args: unknown[] = []) {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*",
      );
    } catch { /* cross-origin */ }
  }

  function playTrack(ytId: string, title: string) {
    setActiveId(ytId);
    setActiveTitle(title);
    setIsPaused(false);
    setUrlError(null);
    setIsHidden(false);
  }

  function togglePause() {
    if (isPaused) { ytCmd("playVideo");  setIsPaused(false); }
    else          { ytCmd("pauseVideo"); setIsPaused(true);  }
  }

  function stop() {
    ytCmd("stopVideo");
    setActiveId(null);
    setActiveTitle("");
    setIsPaused(false);
    setIsHidden(false);
  }

  function changeVolume(v: number) {
    setVolume(v);
    setMuted(false);
    ytCmd("setVolume", [v]);
  }

  function toggleMute() {
    if (muted) { ytCmd("unMute"); ytCmd("setVolume", [volume]); setMuted(false); }
    else       { ytCmd("mute"); setMuted(true); }
  }

  function sendToPresentation() {
    if (!activeId) return;
    window.open(
      `https://www.youtube.com/watch?v=${activeId}`,
      "yt-presentation",
      `width=${window.screen.width},height=${window.screen.height},menubar=no,toolbar=no,location=no,status=no`,
    );
  }

  /* ── Library helpers ─────────────────────────────────────────── */
  function deleteFromLibrary(id: string) {
    const next = library.filter(i => i.id !== id);
    setLibrary(next);
    saveLibrary(next);
  }

  function resetLibrary() {
    setLibrary(DEFAULT_LIBRARY);
    saveLibrary(DEFAULT_LIBRARY);
  }

  function addToLibrary(ytId: string, title: string) {
    const item: LibraryItem = { id: uid(), title, artist: "Custom", ytId };
    const next = [...library, item];
    setLibrary(next);
    saveLibrary(next);
  }

  /* ── Queue helpers ───────────────────────────────────────────── */
  function enqueue(ytId: string, title: string) {
    setQueue(q => [...q, { id: uid(), ytId, title }]);
  }

  function dequeue(id: string) {
    setQueue(q => q.filter(i => i.id !== id));
  }

  function playFromQueue(item: QueueItem) {
    setQueue(q => q.filter(i => i.id !== item.id));
    playTrack(item.ytId, item.title);
  }

  function moveQueue(id: string, dir: -1 | 1) {
    setQueue(q => {
      const idx = q.findIndex(i => i.id === id);
      if (idx < 0) return q;
      const next = [...q];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return q;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  /* ── URL tab handlers ────────────────────────────────────────── */
  function handlePlayUrl() {
    const id = extractYouTubeId(urlInput);
    if (!id) { setUrlError("Couldn't find a YouTube video ID."); return; }
    const title = titleInput.trim() || "YouTube Video";
    playTrack(id, title);
    setOpen(false);
    setUrlInput("");
    setTitleInput("");
    setUrlError(null);
  }

  function handleAddToQueueUrl() {
    const id = extractYouTubeId(urlInput);
    if (!id) { setUrlError("Couldn't find a YouTube video ID."); return; }
    const title = titleInput.trim() || "YouTube Video";
    enqueue(id, title);
    setUrlInput("");
    setTitleInput("");
    setUrlError(null);
  }

  function handleSaveToLibraryUrl() {
    const id = extractYouTubeId(urlInput);
    if (!id) { setUrlError("Couldn't find a YouTube video ID."); return; }
    const title = titleInput.trim() || "YouTube Video";
    addToLibrary(id, title);
    setUrlInput("");
    setTitleInput("");
    setUrlError(null);
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Persistent mini-player ────────────────────────────── */}
      {activeId && (
        <div style={getPlayerStyle()}>
          {isHidden ? (
            /* Hidden pill */
            <div
              className="relative rounded-full border border-border bg-background/95 backdrop-blur-md shadow-2xl overflow-hidden"
              style={{ width: 220, height: 48 }}
              data-testid="youtube-mini-player"
            >
              <iframe
                ref={iframeRef}
                key={activeId}
                src={`https://www.youtube.com/embed/${activeId}?autoplay=1&enablejsapi=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title="YouTube player"
                style={{ position: "absolute", width: 272, height: 153, top: 0, left: 0, pointerEvents: "none" }}
                onLoad={() => setTimeout(() => { ytCmd("setVolume", [volume]); if (muted) ytCmd("mute"); }, 1500)}
              />
              <div className="absolute inset-0 flex items-center gap-1 px-2 cursor-move select-none" onPointerDown={startDrag}>
                <Music className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
                <p className="flex-1 text-[11px] font-semibold truncate min-w-0 ml-1">{activeTitle}</p>
                <button type="button" onPointerDown={e => e.stopPropagation()} onClick={togglePause}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1">
                  {isPaused ? <Play className="w-3.5 h-3.5 ml-0.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => setIsHidden(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1" title="Show player">
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Full player */
            <div className="rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-2xl overflow-hidden"
              style={{ width: 272 }} data-testid="youtube-mini-player">

              {/* Drag / title bar */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/50 cursor-move select-none bg-muted/30"
                onPointerDown={startDrag} title="Drag to move">
                <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="flex-1 text-[11px] text-muted-foreground truncate min-w-0">
                  {activeTitle || "YouTube Player"}
                  {queue.length > 0 && (
                    <span className="ml-1 text-primary font-semibold">+{queue.length} queued</span>
                  )}
                </p>
                <button type="button" onPointerDown={e => e.stopPropagation()} onClick={sendToPresentation}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5"
                  title="Send to presentation screen">
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => setIsHidden(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5"
                  title="Hide player (audio keeps playing)">
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
                <button type="button" onPointerDown={e => e.stopPropagation()} onClick={stop}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5"
                  title="Stop and close">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Video */}
              <div className="relative" style={{ aspectRatio: "16/9" }}>
                <iframe
                  ref={iframeRef}
                  key={activeId}
                  src={`https://www.youtube.com/embed/${activeId}?autoplay=1&enablejsapi=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  title="YouTube player"
                  className="w-full h-full"
                  onLoad={() => setTimeout(() => { ytCmd("setVolume", [volume]); if (muted) ytCmd("mute"); }, 1500)}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={toggleMute}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1">
                  <Slider min={0} max={100} step={5} value={[muted ? 0 : volume]}
                    onValueChange={([v]) => changeVolume(v)} className="h-1" />
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full shrink-0"
                  onClick={togglePause}>
                  {isPaused ? <Play className="w-3.5 h-3.5 ml-0.5" /> : <Pause className="w-3.5 h-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                  onClick={() => setOpen(true)} title="Browse music">
                  <ChevronUp className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Floating YouTube button ───────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[4.75rem] right-5 z-40 flex items-center justify-center w-11 h-11 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all duration-150"
        aria-label="Open YouTube player"
        data-testid="button-youtube-panel"
        title="YouTube Player"
      >
        <Youtube className="w-5 h-5" />
        {queue.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
            {queue.length}
          </span>
        )}
      </button>

      {/* ── Browse / Manage Sheet ─────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col bg-background border-border"
          data-testid="sheet-youtube-panel"
        >
          <SheetHeader className="p-4 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              YouTube Player
            </SheetTitle>
          </SheetHeader>

          {/* Now-playing strip */}
          {activeId && (
            <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b border-border shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{activeTitle}</p>
                <p className="text-[11px] text-primary font-medium">
                  {isHidden ? "🎵 Audio-only mode" : isPaused ? "⏸ Paused" : "▶ Playing"}
                  {queue.length > 0 && ` · ${queue.length} song${queue.length === 1 ? "" : "s"} in queue`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={togglePause}>
                  {isPaused ? <Play className="w-4 h-4 ml-0.5" /> : <Pause className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => setIsHidden(h => !h)}
                  title={isHidden ? "Show player" : "Hide player"}>
                  {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={sendToPresentation}
                  title="Send to presentation screen">
                  <Monitor className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={stop}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-4 mt-3 shrink-0 grid grid-cols-3">
              <TabsTrigger value="library" className="gap-1 text-xs">
                <Music className="w-3.5 h-3.5" />Library
              </TabsTrigger>
              <TabsTrigger value="queue" className="gap-1 text-xs relative">
                <ListMusic className="w-3.5 h-3.5" />Queue
                {queue.length > 0 && (
                  <span className="ml-1 text-[9px] font-bold bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                    {queue.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-1 text-xs">
                <Search className="w-3.5 h-3.5" />Add URL
              </TabsTrigger>
            </TabsList>

            {/* ── Library tab ─────────────────────────────────────── */}
            <TabsContent value="library" className="flex-1 overflow-y-auto p-4 space-y-2 mt-0 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">
                  {library.length} song{library.length !== 1 ? "s" : ""}
                </p>
                <button
                  type="button"
                  onClick={resetLibrary}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset to default songs"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to defaults
                </button>
              </div>

              {library.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Music className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Library is empty</p>
                  <button type="button" onClick={resetLibrary}
                    className="text-xs text-primary hover:underline">
                    Restore default songs
                  </button>
                </div>
              ) : (
                library.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                      activeId === item.ytId
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    {/* Play button */}
                    <button
                      type="button"
                      onClick={() => { playTrack(item.ytId, item.title); setOpen(false); }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        activeId === item.ytId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-primary hover:text-primary-foreground"
                      }`}
                      title="Play now"
                    >
                      {activeId === item.ytId && !isPaused
                        ? <Music className="w-3.5 h-3.5" />
                        : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </button>

                    {/* Title */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${activeId === item.ytId ? "text-primary" : ""}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.artist}</p>
                    </div>

                    {/* Add to queue */}
                    <button
                      type="button"
                      onClick={() => enqueue(item.ytId, item.title)}
                      className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-1"
                      title="Add to queue"
                    >
                      <ListPlus className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => deleteFromLibrary(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
                      title="Remove from library"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}

              <div className="pt-3 border-t border-border mt-2">
                <a
                  href="https://www.youtube.com/results?search_query=worship+instrumental+background+music"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Search more worship music on YouTube
                </a>
              </div>
            </TabsContent>

            {/* ── Queue tab ───────────────────────────────────────── */}
            <TabsContent value="queue" className="flex-1 overflow-y-auto p-4 mt-0 min-h-0">
              {queue.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <ListMusic className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Queue is empty</p>
                  <p className="text-xs text-muted-foreground">
                    Tap the <ListPlus className="w-3 h-3 inline" /> icon on any song to add it here.
                    Songs play automatically one after another.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">
                      {queue.length} song{queue.length !== 1 ? "s" : ""} up next
                    </p>
                    <button
                      type="button"
                      onClick={() => setQueue([])}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                  {queue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/20"
                    >
                      {/* Position */}
                      <span className="w-5 text-center text-[11px] text-muted-foreground font-mono shrink-0">
                        {idx + 1}
                      </span>

                      {/* Title */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                      </div>

                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveQueue(item.id, -1)}
                          disabled={idx === 0}
                          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 p-0.5">
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => moveQueue(item.id, 1)}
                          disabled={idx === queue.length - 1}
                          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 p-0.5">
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Play now */}
                      <button
                        type="button"
                        onClick={() => { playFromQueue(item); setOpen(false); }}
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-1"
                        title="Play now"
                      >
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => dequeue(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
                        title="Remove from queue"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Add by URL tab ───────────────────────────────────── */}
            <TabsContent value="url" className="flex-1 p-4 space-y-4 mt-0">
              <p className="text-sm text-muted-foreground">
                Paste any YouTube link or video ID. Give it an optional name, then play, queue, or save it to your library.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">YouTube URL or Video ID</label>
                  <Input
                    placeholder="https://youtube.com/watch?v=…"
                    value={urlInput}
                    onChange={e => { setUrlInput(e.target.value); setUrlError(null); }}
                    onKeyDown={e => { if (e.key === "Enter") handlePlayUrl(); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Title <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Input
                    placeholder="e.g. Sunday Worship Set"
                    value={titleInput}
                    onChange={e => setTitleInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handlePlayUrl(); }}
                  />
                </div>
                {urlError && <p className="text-xs text-destructive">{urlError}</p>}

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    className="gap-1.5 text-xs" size="sm"
                    onClick={handlePlayUrl}
                    disabled={!urlInput.trim()}
                  >
                    <Play className="w-3.5 h-3.5" />Play
                  </Button>
                  <Button
                    variant="outline" className="gap-1.5 text-xs" size="sm"
                    onClick={handleAddToQueueUrl}
                    disabled={!urlInput.trim()}
                  >
                    <ListPlus className="w-3.5 h-3.5" />Queue
                  </Button>
                  <Button
                    variant="outline" className="gap-1.5 text-xs" size="sm"
                    onClick={handleSaveToLibraryUrl}
                    disabled={!urlInput.trim()}
                  >
                    <Plus className="w-3.5 h-3.5" />Library
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-medium text-muted-foreground">Supported formats:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>• youtube.com/watch?v=VIDEO_ID</li>
                  <li>• youtu.be/VIDEO_ID</li>
                  <li>• youtube.com/shorts/VIDEO_ID</li>
                  <li>• Just the 11-character video ID</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
