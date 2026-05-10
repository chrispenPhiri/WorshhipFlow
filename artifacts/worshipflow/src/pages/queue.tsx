import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Play, Search, Image as ImageIcon, Video, Music, FileText,
  Music2, GripVertical, Plus, X, ChevronRight, ListVideo, BookOpen,
  Type, Presentation, FolderOpen, Loader2, AlertCircle, ArrowUp, ArrowDown,
  ExternalLink,
} from "lucide-react";
import {
  listMediaFiles, createObjectUrl, getDataUrl,
  type MediaFileMeta, type MediaCategory,
} from "@/lib/media-library";
import {
  loadQueue, saveQueue, generateQueueId, makeThumbnail,
  type QueueItem, type QueueItemKind,
} from "@/lib/live-queue";
import {
  useUpdateScreenState, useGetScreenState, useListSongs,
} from "@workspace/api-client-react";
import {
  DEFAULT_NAV_ITEMS, getIconComponent, effectiveIconId,
  useMenuCustomization, useEmojiMode,
} from "@/lib/menu-customization";
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

// ─── Song section helpers ─────────────────────────────────────────────────────

function getSongSections(lyrics: string): { label: string; content: string }[] {
  const raw = lyrics.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  let verseCounter = 0;
  return raw.map((text) => {
    const firstLine = text.split("\n")[0].trim();
    const bracketMatch = firstLine.match(/^\[(.+?)\]/);
    if (bracketMatch) {
      const label = bracketMatch[1].trim().replace(/^\w/, c => c.toUpperCase());
      const rest = text.slice(firstLine.length).trim();
      return { label, content: rest || text };
    }
    verseCounter++;
    return { label: `Verse ${verseCounter}`, content: text };
  });
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
      <span className="text-xs text-muted-foreground w-5 text-center shrink-0 font-mono">{index + 1}</span>
      <div className="w-14 h-10 rounded overflow-hidden shrink-0 bg-muted flex items-center justify-center">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.label} className="w-full h-full object-cover" />
        ) : (
          <span style={{ color }}>{KIND_ICONS[item.kind]}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate text-foreground">{item.label}</p>
        {item.subLabel && (
          <p className="text-[10px] text-muted-foreground truncate">{item.subLabel}</p>
        )}
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 mt-0.5" style={{ borderColor: color, color }}>
          {item.kind}
        </Badge>
      </div>
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

// ─── Source panels ────────────────────────────────────────────────────────────

function BibleSourcePanel({ onAdd }: {
  onAdd: (item: QueueItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); setError(""); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const verses = await fetchVerses(query.trim());
        setResults(verses);
        if (verses.length === 0) setError("No results found.");
      } catch { setError("Could not fetch verses. Check your connection."); }
      finally { setLoading(false); }
    }, 700);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const addVerse = (verse: BibleVerse) => {
    const ref = verse.chapter && verse.verse
      ? `${verse.book_name} ${verse.chapter}:${verse.verse}`
      : verse.book_name;
    onAdd({ id: generateQueueId(), kind: "bible", label: ref, subLabel: verse.text.slice(0, 60) + (verse.text.length > 60 ? "…" : ""), text: verse.text });
    toast.success(`Added ${ref} to queue`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="e.g. John 3:16 or search words…" value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 h-8 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Searching…</span></div>}
        {error && !loading && <div className="flex items-center gap-2 py-4 text-muted-foreground justify-center"><AlertCircle className="w-4 h-4" /><span className="text-sm">{error}</span></div>}
        {!loading && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <BookOpen className="w-8 h-8 opacity-40" />
            <p className="text-sm">Type a reference to search</p>
            <p className="text-xs opacity-70">e.g. "John 3:16", "Psalm 23", "love"</p>
          </div>
        )}
        {results.map((verse, i) => {
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
    </div>
  );
}

function SongsSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const { data: songs = [], isLoading } = useListSongs({});
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search songs…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading songs…</span></div>}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Music2 className="w-8 h-8 opacity-40" />
            <p className="text-sm">{songs.length === 0 ? "No songs in library" : "No results"}</p>
          </div>
        )}
        {filtered.map((song) => {
          const sections = getSongSections(song.lyrics ?? "");
          const isExpanded = expandedId === song.id;
          return (
            <div key={song.id} className="mb-1.5 border border-border rounded-lg overflow-hidden">
              <button
                className="w-full text-left p-2.5 hover:bg-accent transition-colors flex items-center justify-between gap-2"
                onClick={() => setExpandedId(isExpanded ? null : song.id)}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-purple-400 truncate">{song.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{song.author}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{sections.length} sections</Badge>
                  <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-border bg-muted/30">
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex items-center gap-2 border-b border-border/50"
                    onClick={() => {
                      onAdd({ id: generateQueueId(), kind: "song", label: song.title, subLabel: song.author, text: song.lyrics });
                      toast.success(`Added "${song.title}" to queue`);
                    }}>
                    <Plus className="w-3 h-3" /> Add entire song
                  </button>
                  {sections.map((sec, i) => (
                    <button key={i}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent/50 transition-colors flex items-start justify-between gap-2 border-b border-border/30 last:border-0"
                      onClick={() => {
                        onAdd({ id: generateQueueId(), kind: "song", label: `${song.title} — ${sec.label}`, subLabel: sec.content.slice(0, 50) + (sec.content.length > 50 ? "…" : ""), text: sec.content });
                        toast.success(`Added "${song.title} — ${sec.label}" to queue`);
                      }}>
                      <div className="min-w-0">
                        <p className="font-medium text-green-400">{sec.label}</p>
                        <p className="text-muted-foreground line-clamp-2 mt-0.5 text-[10px]">{sec.content}</p>
                      </div>
                      <Plus className="w-3 h-3 shrink-0 text-muted-foreground mt-0.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MediaSourcePanel({ files, onAdd }: {
  files: MediaFileMeta[];
  onAdd: (file: MediaFileMeta) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search media…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs" />
      </div>
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <FolderOpen className="w-8 h-8 opacity-40" />
          <p className="text-sm">{files.length === 0 ? "No media uploaded yet" : "No results"}</p>
          {files.length === 0 && <p className="text-xs text-center opacity-70">Upload files in the Media Library page</p>}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((f) => (
              <MediaCard key={f.id} file={f} onAdd={() => onAdd(f)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomTextSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const [text, setText] = useState("");
  const addText = () => {
    if (!text.trim()) return;
    onAdd({ id: generateQueueId(), kind: "text", label: text.slice(0, 40) + (text.length > 40 ? "…" : ""), text });
    setText("");
    toast.success("Added text to queue");
  };
  return (
    <div className="flex-1 flex flex-col p-3 pt-2 gap-3 overflow-hidden">
      <p className="text-xs text-muted-foreground shrink-0">Type any custom text to queue and present on screen.</p>
      <textarea
        className="flex-1 min-h-0 rounded-lg border border-input bg-background text-sm p-3 resize-none focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
        placeholder="Type your announcement, quote, or message here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addText(); }}
      />
      <Button onClick={addText} disabled={!text.trim()} className="shrink-0 gap-2 h-8 text-xs">
        <Plus className="w-3.5 h-3.5" /> Add to Queue
        <span className="text-muted-foreground ml-1 font-normal">Ctrl+Enter</span>
      </Button>
    </div>
  );
}

function PageLinkPanel({ href, label, description }: { href: string; label: string; description?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-muted-foreground">
      <p className="text-sm text-center">{description ?? `Use the ${label} page to add content.`}</p>
      <Link href={href}>
        <Button variant="outline" className="gap-2 h-9 text-sm">
          <ExternalLink className="w-4 h-4" /> Open {label}
        </Button>
      </Link>
    </div>
  );
}

// ─── Nav item icon resolver ───────────────────────────────────────────────────

function NavIcon({ iconId, className, style }: { iconId: string; className?: string; style?: React.CSSProperties }) {
  const Icon = getIconComponent(iconId);
  return <Icon className={className} style={style} />;
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>(() => loadQueue());
  const [liveId, setLiveId] = useState<string>();
  const [activeNav, setActiveNav] = useState("/");

  const [mediaFiles, setMediaFiles] = useState<MediaFileMeta[]>([]);

  const { data: screenState } = useGetScreenState();
  const { mutateAsync: updateScreen } = useUpdateScreenState();
  const { overrides } = useMenuCustomization();
  const [emojiMode] = useEmojiMode();

  // Load media library
  useEffect(() => { listMediaFiles().then(setMediaFiles); }, []);

  // Persist queue
  useEffect(() => { saveQueue(queue); }, [queue]);

  // ── Add helpers ──
  const addItem = useCallback((item: QueueItem) => {
    setQueue((q) => [...q, item]);
  }, []);

  const addMedia = useCallback(async (file: MediaFileMeta) => {
    const kind = MEDIA_KIND[file.category];
    let thumbnail: string | undefined;
    if (file.category === "image") {
      const dataUrl = await getDataUrl(file.id);
      if (dataUrl) thumbnail = await makeThumbnail(dataUrl);
    }
    setQueue((q) => [...q, { id: generateQueueId(), kind, label: file.name, mediaId: file.id, thumbnail }]);
    toast.success(`Added "${file.name}" to queue`);
  }, []);

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
      } else if (item.kind === "song" && item.text) {
        const sections = getSongSections(item.text);
        const first = sections[0] ?? { label: "Verse 1", content: item.text };
        const songTitle = item.label.includes(" — ") ? item.label.split(" — ")[0] : item.label;
        const sectionLabel = item.label.includes(" — ") ? item.label.split(" — ").slice(1).join(" — ") : first.label;
        await updateScreen({ data: { ...base, contentType: "song" as const, background: bg, title: `${songTitle}§${sectionLabel}`, content: first.content } as never });
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
    if (!queue.length) return;
    const idx = queue.findIndex((i) => i.id === liveId);
    const next = queue[idx === -1 ? 0 : Math.min(idx + 1, queue.length - 1)];
    goLive(next);
  };

  // ── Nav items (exclude /queue since we're already here) ──
  const navItems = DEFAULT_NAV_ITEMS.filter((item) => item.href !== "/queue");

  // ── Render source panel for active nav ──
  const renderSource = () => {
    switch (activeNav) {
      case "/":
        return <BibleSourcePanel onAdd={addItem} />;
      case "/songs":
        return <SongsSourcePanel onAdd={addItem} />;
      case "/custom":
        return <CustomTextSourcePanel onAdd={addItem} />;
      case "/media":
      case "/library":
        return <MediaSourcePanel files={mediaFiles} onAdd={addMedia} />;
      case "/schedule":
        return <PageLinkPanel href="/schedule" label="Schedule" description="Build your service schedule, then drag items into the queue from there." />;
      case "/themes":
        return <PageLinkPanel href="/themes" label="Themes" description="Change the look of your screen backgrounds and text styles." />;
      case "/notes":
        return <PageLinkPanel href="/notes" label="Sermon Notes" description="Write and view sermon notes during the service." />;
      case "/inspiration":
        return <PageLinkPanel href="/inspiration" label="Daily Inspiration" description="Browse today's devotional and send it to screen." />;
      case "/teachings":
        return <PageLinkPanel href="/teachings" label="Teachings" description="Access AI-generated teaching drafts and outlines." />;
      case "/prayer-wall":
        return <PageLinkPanel href="/prayer-wall" label="Prayer Wall" description="View and project prayer requests from your congregation." />;
      case "/hymn-number":
        return <PageLinkPanel href="/hymn-number" label="Hymn Number" description="Display a hymn number on the projection screen." />;
      case "/countdown":
        return <PageLinkPanel href="/countdown" label="Countdown" description="Show a service countdown timer on the screen." />;
      case "/games":
        return <PageLinkPanel href="/games" label="Bible Games" description="Run interactive Bible games on the broadcast screen." />;
      case "/ai":
        return <PageLinkPanel href="/ai" label="AI Features" description="Generate sermons, devotionals, quizzes and more with AI." />;
      case "/how-to":
        return <PageLinkPanel href="/how-to" label="How To" description="Tips and guides for getting the most out of WorshipFlow." />;
      case "/settings":
        return <PageLinkPanel href="/settings" label="Settings" description="Configure your account, themes, Bible version, and more." />;
      default:
        return <PageLinkPanel href={activeNav} label={navItems.find(n => n.href === activeNav)?.label ?? "Page"} />;
    }
  };

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

        {/* LEFT — Sources with full nav */}
        <div className="w-[55%] border-r border-border flex flex-col overflow-hidden">

          {/* Full nav bar — scrollable horizontal strip */}
          <div className="shrink-0 flex overflow-x-auto border-b border-border bg-muted/30 gap-0.5 px-1.5 py-1.5"
            style={{ scrollbarWidth: "none" }}>
            {navItems.map((item) => {
              const iconId = effectiveIconId(item, overrides);
              const isActive = activeNav === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => setActiveNav(item.href)}
                  title={item.label}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md shrink-0 transition-colors min-w-[52px] max-w-[64px] ${
                    isActive
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}
                >
                  {emojiMode ? (
                    <span className="text-base leading-none">{item.emoji}</span>
                  ) : (
                    <NavIcon iconId={iconId} className="w-4 h-4 shrink-0" style={{ color: isActive ? item.color : undefined } as React.CSSProperties} />
                  )}
                  <span className="text-[9px] leading-tight text-center font-medium line-clamp-2 w-full">
                    {item.label.replace("& Broadcast", "").replace("Bible ", "").trim()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Source content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderSource()}
          </div>
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
                Browse any page on the left and click
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
              <div className="h-2" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
