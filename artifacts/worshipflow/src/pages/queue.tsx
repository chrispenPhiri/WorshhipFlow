import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play, Trash2, Search, Image as ImageIcon, Video, Music, FileText,
  Music2, GripVertical, Plus, X, ChevronRight, ListVideo, BookOpen,
  Type, Presentation, FolderOpen, Loader2, AlertCircle, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  listMediaFiles, createObjectUrl, getDataUrl,
  type MediaFileMeta, type MediaCategory,
} from "@/lib/media-library";
import {
  loadQueue, saveQueue, generateQueueId, makeThumbnail,
  type QueueItem, type QueueItemKind,
} from "@/lib/live-queue";
import { useUpdateScreenState, useGetScreenState } from "@workspace/api-client-react";
import { toast } from "sonner";

// ─── Colour / icon helpers ───────────────────────────────────────────────────

const KIND_COLORS: Record<QueueItemKind, string> = {
  image: "#3b82f6", video: "#ef4444", audio: "#a855f7",
  bible: "#f59e0b", text: "#06b6d4", song: "#22c55e",
};

const KIND_ICONS: Record<QueueItemKind, React.ReactNode> = {
  image: <ImageIcon className="w-3.5 h-3.5" />,
  video: <Video className="w-3.5 h-3.5" />,
  audio: <Music className="w-3.5 h-3.5" />,
  bible: <BookOpen className="w-3.5 h-3.5" />,
  text: <Type className="w-3.5 h-3.5" />,
  song: <Music2 className="w-3.5 h-3.5" />,
};

const MEDIA_KIND: Record<MediaCategory, QueueItemKind> = {
  image: "image", video: "video", audio: "audio",
  document: "text", presentation: "text", song: "song",
};

const MEDIA_ICONS: Record<MediaCategory, React.ReactNode> = {
  image: <ImageIcon className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  audio: <Music className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  presentation: <Presentation className="w-4 h-4" />,
  song: <Music2 className="w-4 h-4" />,
};

// ─── Bible fetch ─────────────────────────────────────────────────────────────

interface BibleVerse { book_name: string; chapter: number; verse: number; text: string }

async function fetchVerses(query: string): Promise<BibleVerse[]> {
  const encoded = encodeURIComponent(query);
  const res = await fetch(`https://bible-api.com/${encoded}?translation=kjv`);
  if (!res.ok) throw new Error("Not found");
  const data = await res.json();
  if (data.verses) return data.verses;
  if (data.text) return [{ book_name: data.reference, chapter: 0, verse: 0, text: data.text }];
  return [];
}

// ─── Media thumbnail card ─────────────────────────────────────────────────────

function MediaCard({ file, onAdd }: { file: MediaFileMeta; onAdd: () => void }) {
  const [thumb, setThumb] = useState<string>();
  useEffect(() => {
    if (file.category === "image" || file.category === "video") {
      createObjectUrl(file.id).then((u) => u && setThumb(u));
    }
  }, [file.id, file.category]);

  const icon = MEDIA_ICONS[file.category];
  const color = KIND_COLORS[MEDIA_KIND[file.category]];

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-card aspect-video cursor-pointer hover:border-primary/60 transition-colors"
      onClick={onAdd} title={`Add "${file.name}" to queue`}>
      {thumb && (file.category === "image" || file.category === "video") ? (
        <img src={thumb} alt={file.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: color + "22" }}>
          <span style={{ color }}>{icon}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Plus className="w-6 h-6 text-white" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-0.5">
        <p className="text-[10px] text-white truncate">{file.name}</p>
      </div>
      <div className="absolute top-1 right-1">
        <Badge className="text-[9px] px-1 py-0 h-4" style={{ background: color }}>
          {file.category}
        </Badge>
      </div>
    </div>
  );
}

// ─── Queue card ───────────────────────────────────────────────────────────────

function QueueCard({
  item, index, total, isLive,
  onGoLive, onRemove, onMoveUp, onMoveDown,
}: {
  item: QueueItem; index: number; total: number; isLive: boolean;
  onGoLive: () => void; onRemove: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  const color = KIND_COLORS[item.kind];

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
      isLive ? "border-primary bg-primary/10" : "border-border bg-card hover:border-border/80"
    }`}>
      {/* Index */}
      <span className="text-xs text-muted-foreground w-5 text-center shrink-0 font-mono">{index + 1}</span>

      {/* Thumbnail */}
      <div className="w-14 h-10 rounded overflow-hidden shrink-0 bg-muted flex items-center justify-center">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.label} className="w-full h-full object-cover" />
        ) : (
          <span style={{ color }}>{KIND_ICONS[item.kind]}</span>
        )}
      </div>

      {/* Labels */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate text-foreground">{item.label}</p>
        {item.subLabel && (
          <p className="text-[10px] text-muted-foreground truncate">{item.subLabel}</p>
        )}
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 mt-0.5" style={{ borderColor: color, color }}>
          {item.kind}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onMoveUp} disabled={index === 0}>
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onMoveDown} disabled={index === total - 1}>
          <ArrowDown className="w-3 h-3" />
        </Button>
      </div>
      <Button size="sm" className="h-7 px-2 text-xs shrink-0" onClick={onGoLive}
        variant={isLive ? "default" : "outline"}>
        <Play className="w-3 h-3 mr-1" />
        {isLive ? "Live" : "Go Live"}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>(() => loadQueue());
  const [liveId, setLiveId] = useState<string>();

  // Sources state
  const [mediaFiles, setMediaFiles] = useState<MediaFileMeta[]>([]);
  const [mediaSearch, setMediaSearch] = useState("");
  const [bibleQuery, setBibleQuery] = useState("");
  const [bibleResults, setBibleResults] = useState<BibleVerse[]>([]);
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleError, setBibleError] = useState("");
  const [customText, setCustomText] = useState("");

  const { data: screenState } = useGetScreenState();
  const { mutateAsync: updateScreen } = useUpdateScreenState();
  const bibleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load media library
  useEffect(() => {
    listMediaFiles().then(setMediaFiles);
  }, []);

  // Persist queue
  useEffect(() => { saveQueue(queue); }, [queue]);

  // ── Bible search (debounced) ──
  useEffect(() => {
    clearTimeout(bibleTimerRef.current);
    if (!bibleQuery.trim()) { setBibleResults([]); setBibleError(""); return; }
    bibleTimerRef.current = setTimeout(async () => {
      setBibleLoading(true); setBibleError("");
      try {
        const verses = await fetchVerses(bibleQuery.trim());
        setBibleResults(verses);
        if (verses.length === 0) setBibleError("No results found.");
      } catch {
        setBibleError("Could not fetch verses. Check your connection.");
      } finally { setBibleLoading(false); }
    }, 700);
    return () => clearTimeout(bibleTimerRef.current);
  }, [bibleQuery]);

  // ── Add to queue helpers ──
  const addMedia = useCallback(async (file: MediaFileMeta) => {
    const kind = MEDIA_KIND[file.category];
    let thumbnail: string | undefined;
    if (file.category === "image") {
      const dataUrl = await getDataUrl(file.id);
      if (dataUrl) thumbnail = await makeThumbnail(dataUrl);
    }
    const item: QueueItem = {
      id: generateQueueId(), kind, label: file.name,
      mediaId: file.id, thumbnail,
    };
    setQueue((q) => [...q, item]);
    toast.success(`Added "${file.name}" to queue`);
  }, []);

  const addVerse = useCallback((verse: BibleVerse) => {
    const ref = verse.chapter && verse.verse
      ? `${verse.book_name} ${verse.chapter}:${verse.verse}`
      : verse.book_name;
    const item: QueueItem = {
      id: generateQueueId(), kind: "bible",
      label: ref, subLabel: verse.text.slice(0, 60) + (verse.text.length > 60 ? "…" : ""),
      text: verse.text,
    };
    setQueue((q) => [...q, item]);
    toast.success(`Added ${ref} to queue`);
  }, []);

  const addCustomText = useCallback(() => {
    if (!customText.trim()) return;
    const item: QueueItem = {
      id: generateQueueId(), kind: "text",
      label: customText.slice(0, 40) + (customText.length > 40 ? "…" : ""),
      text: customText,
    };
    setQueue((q) => [...q, item]);
    setCustomText("");
    toast.success("Added text to queue");
  }, [customText]);

  // ── Go Live ──
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
        toast.success("Playing audio: " + item.label);
        setLiveId(item.id);
        return;
      } else if (item.kind === "bible" && item.text) {
        await updateScreen({ data: { ...base, contentType: "verse" as const, background: bg, title: item.label, content: item.text } as never });
      } else if (item.kind === "text" && item.text) {
        await updateScreen({ data: { ...base, contentType: "custom_text" as const, background: bg, title: "Custom Text", content: item.text } as never });
      } else if (item.kind === "song") {
        toast.info("Open the Songs page to present this song.");
        return;
      } else {
        toast.error("Cannot present this item type directly.");
        return;
      }
      setLiveId(item.id);
      toast.success(`Now live: ${item.label}`);
    } catch {
      toast.error("Failed to send to screen");
    }
  }, [screenState, updateScreen]);

  // ── Queue mutations ──
  const removeItem = (id: string) => setQueue((q) => q.filter((i) => i.id !== id));
  const clearAll = () => { setQueue([]); setLiveId(undefined); };
  const moveUp = (index: number) => setQueue((q) => { const n = [...q]; [n[index - 1], n[index]] = [n[index], n[index - 1]]; return n; });
  const moveDown = (index: number) => setQueue((q) => { const n = [...q]; [n[index], n[index + 1]] = [n[index + 1], n[index]]; return n; });

  // ── Next in queue ──
  const goNext = () => {
    if (queue.length === 0) return;
    const currentIdx = queue.findIndex((i) => i.id === liveId);
    const nextIdx = currentIdx === -1 ? 0 : Math.min(currentIdx + 1, queue.length - 1);
    goLive(queue[nextIdx]);
  };

  const filteredMedia = mediaFiles.filter((f) =>
    f.name.toLowerCase().includes(mediaSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold">Live Queue</h1>
          {queue.length > 0 && (
            <Badge variant="secondary" className="text-xs">{queue.length} items</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={goNext}
            disabled={queue.length === 0}>
            <ChevronRight className="w-3.5 h-3.5" /> Next
          </Button>
          {queue.length > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={clearAll}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT — Sources */}
        <div className="w-[55%] border-r border-border flex flex-col overflow-hidden">
          <Tabs defaultValue="media" className="flex flex-col h-full">
            <div className="px-3 pt-2 pb-0 shrink-0">
              <TabsList className="w-full h-8 text-xs">
                <TabsTrigger value="media" className="flex-1 text-xs gap-1">
                  <FolderOpen className="w-3.5 h-3.5" /> Media
                </TabsTrigger>
                <TabsTrigger value="bible" className="flex-1 text-xs gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Bible
                </TabsTrigger>
                <TabsTrigger value="text" className="flex-1 text-xs gap-1">
                  <Type className="w-3.5 h-3.5" /> Text
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Media tab */}
            <TabsContent value="media" className="flex-1 flex flex-col overflow-hidden mt-0 p-3 pt-2 gap-2">
              <div className="relative shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search media…" value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  className="pl-8 h-8 text-xs" />
              </div>
              {filteredMedia.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FolderOpen className="w-8 h-8 opacity-40" />
                  <p className="text-sm">
                    {mediaFiles.length === 0 ? "No media uploaded yet" : "No results"}
                  </p>
                  {mediaFiles.length === 0 && (
                    <p className="text-xs text-center opacity-70">Upload files in the Media Library page</p>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2">
                    {filteredMedia.map((f) => (
                      <MediaCard key={f.id} file={f} onAdd={() => addMedia(f)} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Bible tab */}
            <TabsContent value="bible" className="flex-1 flex flex-col overflow-hidden mt-0 p-3 pt-2 gap-2">
              <div className="relative shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="e.g. John 3:16 or search words…" value={bibleQuery}
                  onChange={(e) => setBibleQuery(e.target.value)}
                  className="pl-8 h-8 text-xs" />
              </div>
              <div className="flex-1 overflow-y-auto">
                {bibleLoading && (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Searching…</span>
                  </div>
                )}
                {bibleError && !bibleLoading && (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground justify-center">
                    <AlertCircle className="w-4 h-4" /><span className="text-sm">{bibleError}</span>
                  </div>
                )}
                {!bibleLoading && bibleResults.length === 0 && !bibleError && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <BookOpen className="w-8 h-8 opacity-40" />
                    <p className="text-sm">Type a reference to search</p>
                    <p className="text-xs opacity-70">e.g. "John 3:16", "Psalm 23", "love"</p>
                  </div>
                )}
                {bibleResults.map((verse, i) => {
                  const ref = verse.chapter && verse.verse
                    ? `${verse.book_name} ${verse.chapter}:${verse.verse}`
                    : verse.book_name;
                  return (
                    <button key={i}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-accent border border-transparent hover:border-border transition-colors mb-1.5 group"
                      onClick={() => addVerse(verse)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-amber-500 mb-0.5">{ref}</p>
                          <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{verse.text}</p>
                        </div>
                        <Plus className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            {/* Text tab */}
            <TabsContent value="text" className="flex-1 flex flex-col overflow-hidden mt-0 p-3 pt-2 gap-3">
              <p className="text-xs text-muted-foreground shrink-0">Type any custom text to queue and present on screen.</p>
              <textarea
                className="flex-1 min-h-0 rounded-lg border border-input bg-background text-sm p-3 resize-none focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                placeholder="Type your announcement, quote, or message here…"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addCustomText(); }}
              />
              <Button onClick={addCustomText} disabled={!customText.trim()} className="shrink-0 gap-2 h-8 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add to Queue
                <span className="text-muted-foreground ml-1 font-normal">Ctrl+Enter</span>
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT — Queue */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-2">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Run Order</span>
          </div>

          {queue.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
              <ListVideo className="w-10 h-10 opacity-30" />
              <p className="text-sm text-center">Your queue is empty</p>
              <p className="text-xs text-center opacity-70">
                Browse media, Bible verses, or custom text on the left and click
                <Plus className="inline w-3 h-3 mx-1" />
                to add items here.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
              {queue.map((item, i) => (
                <QueueCard
                  key={item.id} item={item} index={i} total={queue.length}
                  isLive={item.id === liveId}
                  onGoLive={() => goLive(item)}
                  onRemove={() => removeItem(item.id)}
                  onMoveUp={() => moveUp(i)}
                  onMoveDown={() => moveDown(i)}
                />
              ))}
              {/* Spacer so last card isn't clipped */}
              <div className="h-2" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
