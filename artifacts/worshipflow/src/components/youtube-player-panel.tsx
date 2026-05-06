import { useRef, useState } from "react";
import {
  Youtube, X, Play, Pause, Music, Search, ExternalLink,
  ChevronUp, Volume2, VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

interface Preset {
  id: string;
  title: string;
  artist: string;
  ytId: string;
}

const WORSHIP_PRESETS: Preset[] = [
  { id: "p1", title: "Praise & Worship Mix",      artist: "Instrumental", ytId: "XUQNRpFXKkQ" },
  { id: "p2", title: "Soft Piano Worship",         artist: "Instrumental", ytId: "GM1pG6mMdxs" },
  { id: "p3", title: "Deep Worship Atmosphere",    artist: "Instrumental", ytId: "GMy_IBQVW-U" },
  { id: "p4", title: "Gospel Background Music",    artist: "Instrumental", ytId: "x_H0lo1MKLU" },
  { id: "p5", title: "Peaceful Worship Strings",   artist: "Instrumental", ytId: "lFcSrYw2ARs" },
  { id: "p6", title: "Ambient Church Music",       artist: "Instrumental", ytId: "77ZozI0rw7w" },
  { id: "p7", title: "Contemporary Worship Beats", artist: "Instrumental", ytId: "GkBMaWY_1KM" },
  { id: "p8", title: "Midnight Worship Session",   artist: "Instrumental", ytId: "pkCzH5h2Qro" },
];

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

export function YoutubePlayerPanel() {
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState("library");
  const [urlInput, setUrlInput]   = useState("");
  const [urlError, setUrlError]   = useState<string | null>(null);

  const [activeId, setActiveId]     = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState("");
  const [isPaused, setIsPaused]   = useState(false);
  const [volume, setVolume]       = useState(80);
  const [muted, setMuted]         = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* Send a command to the background iframe via the YouTube JS API */
  function ytCmd(func: string, args: unknown[] = []) {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*",
      );
    } catch { /* ignore cross-origin errors */ }
  }

  function playId(ytId: string, title: string) {
    setActiveId(ytId);
    setActiveTitle(title);
    setIsPaused(false);
    setUrlError(null);
  }

  function togglePause() {
    if (isPaused) { ytCmd("playVideo"); setIsPaused(false); }
    else          { ytCmd("pauseVideo"); setIsPaused(true); }
  }

  function stop() {
    ytCmd("stopVideo");
    setActiveId(null);
    setActiveTitle("");
    setIsPaused(false);
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

  function loadUrl() {
    const id = extractYouTubeId(urlInput);
    if (!id) { setUrlError("Couldn't find a YouTube video ID. Paste a YouTube URL or just the video ID."); return; }
    playId(id, "YouTube Video");
    setOpen(false);
  }

  const thumbUrl = activeId ? `https://img.youtube.com/vi/${activeId}/default.jpg` : null;

  return (
    <>
      {/*
        ── Background iframe ────────────────────────────────────────────────
        Kept in the DOM at all times while a video is active. 1×1 px, invisible
        to the user but fully alive so audio keeps playing when the panel is closed.
        enablejsapi=1 lets us send postMessage commands (pause, volume, etc.).
      */}
      {activeId && (
        <iframe
          ref={iframeRef}
          key={activeId}
          src={`https://www.youtube.com/embed/${activeId}?autoplay=1&enablejsapi=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title="YouTube background player"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
            zIndex: 1,
          }}
          onLoad={() => {
            /* Sync volume after iframe loads */
            setTimeout(() => { ytCmd("setVolume", [volume]); if (muted) ytCmd("mute"); }, 1500);
          }}
        />
      )}

      {/*
        ── Mini-player bar (bottom-left) ────────────────────────────────────
        Visible while a video is active. Lives outside the Sheet so it persists
        regardless of open/close state and page navigation.
      */}
      {activeId && (
        <div
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2.5 rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-2xl px-3 py-2 w-80"
          data-testid="youtube-mini-player"
        >
          {/* Thumbnail */}
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
            {thumbUrl && (
              <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Title + status */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate leading-tight">{activeTitle}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                type="button"
                onClick={toggleMute}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
              <div className="w-16">
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[muted ? 0 : volume]}
                  onValueChange={([v]) => changeVolume(v)}
                  className="h-1"
                />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={togglePause}
              aria-label={isPaused ? "Play" : "Pause"}
            >
              {isPaused
                ? <Play className="w-4 h-4 ml-0.5" />
                : <Pause className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setOpen(true)}
              aria-label="Open player"
              title="Browse music"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={stop}
              aria-label="Stop"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Floating YouTube button (bottom-right) ─────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[4.75rem] right-5 z-40 flex items-center justify-center w-11 h-11 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all duration-150"
        aria-label="Open YouTube player"
        data-testid="button-youtube-panel"
        title="YouTube Player"
      >
        <Youtube className="w-5 h-5" />
      </button>

      {/* ── Browse Sheet ─────────────────────────────────────────────────── */}
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

          {/* Now playing strip inside Sheet */}
          {activeId && (
            <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b border-border shrink-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                {thumbUrl && <img src={thumbUrl} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{activeTitle}</p>
                <p className="text-[11px] text-primary font-medium">
                  {isPaused ? "⏸ Paused" : "▶ Playing in background"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={togglePause}>
                  {isPaused ? <Play className="w-4 h-4 ml-0.5" /> : <Pause className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={stop}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-4 mt-3 shrink-0 grid grid-cols-2">
              <TabsTrigger value="library" className="gap-1.5 text-xs">
                <Music className="w-3.5 h-3.5" />Worship Music
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-1.5 text-xs">
                <Search className="w-3.5 h-3.5" />Play by URL
              </TabsTrigger>
            </TabsList>

            {/* Library */}
            <TabsContent value="library" className="flex-1 overflow-y-auto p-4 space-y-2 mt-0 min-h-0">
              <p className="text-xs text-muted-foreground mb-3">
                Tap a track to start background playback — music continues even when you close this panel.
              </p>
              {WORSHIP_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => { playId(preset.ytId, preset.title); setOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    activeId === preset.ytId
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/40"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    activeId === preset.ytId ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {activeId === preset.ytId && !isPaused
                      ? <Music className="w-4 h-4" />
                      : <Play className="w-4 h-4 ml-0.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{preset.title}</p>
                    <p className="text-xs text-muted-foreground">{preset.artist}</p>
                  </div>
                  {activeId === preset.ytId && (
                    <span className="ml-auto shrink-0 text-[10px] font-semibold text-primary">
                      {isPaused ? "Paused" : "Playing"}
                    </span>
                  )}
                </button>
              ))}

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

            {/* URL */}
            <TabsContent value="url" className="flex-1 p-4 space-y-4 mt-0">
              <p className="text-sm text-muted-foreground">
                Paste any YouTube link or video ID. Playback continues in the background while you use other features.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-medium">YouTube URL or Video ID</label>
                <Input
                  placeholder="https://youtube.com/watch?v=…"
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setUrlError(null); }}
                  onKeyDown={e => { if (e.key === "Enter") loadUrl(); }}
                />
                {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                <Button className="w-full gap-2" onClick={loadUrl} disabled={!urlInput.trim()}>
                  <Play className="w-4 h-4" />Play in Background
                </Button>
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
