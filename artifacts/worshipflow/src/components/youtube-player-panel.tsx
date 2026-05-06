import { useState } from "react";
import { Youtube, X, Play, ExternalLink, Music, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Preset {
  id: string;
  title: string;
  artist: string;
  ytId: string;
}

const WORSHIP_PRESETS: Preset[] = [
  { id: "p1", title: "Praise & Worship Mix", artist: "Instrumental", ytId: "XUQNRpFXKkQ" },
  { id: "p2", title: "Soft Piano Worship", artist: "Instrumental", ytId: "GM1pG6mMdxs" },
  { id: "p3", title: "Deep Worship Atmosphere", artist: "Instrumental", ytId: "GMy_IBQVW-U" },
  { id: "p4", title: "Gospel Background Music", artist: "Instrumental", ytId: "x_H0lo1MKLU" },
  { id: "p5", title: "Peaceful Worship Strings", artist: "Instrumental", ytId: "lFcSrYw2ARs" },
  { id: "p6", title: "Ambient Church Music", artist: "Instrumental", ytId: "77ZozI0rw7w" },
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
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function YoutubePlayerPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("library");
  const [urlInput, setUrlInput] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("");
  const [urlError, setUrlError] = useState<string | null>(null);

  function playId(ytId: string, title: string) {
    setActiveId(ytId);
    setActiveTitle(title);
    setUrlError(null);
  }

  function loadUrl() {
    const id = extractYouTubeId(urlInput);
    if (!id) {
      setUrlError("Couldn't find a YouTube video ID. Paste a full YouTube URL or just the video ID.");
      return;
    }
    setUrlError(null);
    playId(id, "YouTube Video");
    setTab("player");
  }

  function stop() {
    setActiveId(null);
    setActiveTitle("");
  }

  return (
    <>
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

          {/* Embedded player */}
          {activeId && (
            <div className="shrink-0 bg-black relative">
              <iframe
                key={activeId}
                src={`https://www.youtube.com/embed/${activeId}?autoplay=1&rel=0`}
                title={activeTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full aspect-video"
              />
              <div className="flex items-center justify-between px-3 py-2 bg-background border-b border-border">
                <p className="text-xs font-medium truncate text-muted-foreground flex-1">{activeTitle}</p>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-2 shrink-0" onClick={stop} aria-label="Stop">
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
              <p className="text-xs text-muted-foreground mb-3">Curated worship instrumentals for background music during service.</p>
              {WORSHIP_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => { playId(preset.ytId, preset.title); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    activeId === preset.ytId
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/40"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    activeId === preset.ytId ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {activeId === preset.ytId
                      ? <Music className="w-4 h-4" />
                      : <Play className="w-4 h-4 ml-0.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{preset.title}</p>
                    <p className="text-xs text-muted-foreground">{preset.artist}</p>
                  </div>
                </button>
              ))}

              <div className="pt-2 border-t border-border mt-4">
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
                Paste any YouTube link or video ID to play it here without leaving the app.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-medium">YouTube URL or Video ID</label>
                <Input
                  placeholder="https://youtube.com/watch?v=… or video ID"
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setUrlError(null); }}
                  onKeyDown={e => { if (e.key === "Enter") loadUrl(); }}
                />
                {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                <Button className="w-full gap-2" onClick={loadUrl} disabled={!urlInput.trim()}>
                  <Play className="w-4 h-4" />Play Video
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground">Supported formats:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
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
