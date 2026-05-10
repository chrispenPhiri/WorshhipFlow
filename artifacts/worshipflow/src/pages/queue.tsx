import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Play, Search, Image as ImageIcon, Video, Music, FileText,
  Music2, GripVertical, Plus, X, ChevronRight, ListVideo, BookOpen,
  Type, Presentation, FolderOpen, Loader2, AlertCircle, ArrowUp, ArrowDown,
  Palette, Hash, Timer, Calendar, ScrollText, Heart, Flame, Sparkles,
  Gamepad2, Brain, HelpCircle, Settings, Star, Layers,
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
  useListSchedules, useListNotes,
} from "@workspace/api-client-react";
import {
  DEFAULT_NAV_ITEMS, getIconComponent, effectiveIconId,
  useMenuCustomization, useEmojiMode,
} from "@/lib/menu-customization";
import { VERSES, FACTS, type DailyVerse, type BibleFact } from "@/lib/inspiration";
import { TEACHINGS, type Teaching } from "@/lib/teachings";
import { loadCustomTeachings } from "@/lib/custom-teachings";
import { THEME_PRESETS, LIVE_WALLPAPERS } from "@/lib/themes";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getAiHeaders } from "@/lib/ai-headers";
import { toast } from "sonner";

// ─── Colour / icon helpers ────────────────────────────────────────────────────

const KIND_COLORS: Record<QueueItemKind, string> = {
  image: "#3b82f6", video: "#ef4444", audio: "#a855f7",
  bible: "#f59e0b", text: "#06b6d4", song: "#22c55e",
  theme: "#8b5cf6", hymn: "#ec4899", countdown: "#f97316",
};

const KIND_ICONS: Record<QueueItemKind, React.ReactNode> = {
  image: <ImageIcon className="w-3.5 h-3.5" />,
  video: <Video className="w-3.5 h-3.5" />,
  audio: <Music className="w-3.5 h-3.5" />,
  bible: <BookOpen className="w-3.5 h-3.5" />,
  text: <Type className="w-3.5 h-3.5" />,
  song: <Music2 className="w-3.5 h-3.5" />,
  theme: <Palette className="w-3.5 h-3.5" />,
  hymn: <Hash className="w-3.5 h-3.5" />,
  countdown: <Timer className="w-3.5 h-3.5" />,
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

// ─── Bible fetch ──────────────────────────────────────────────────────────────

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

// ─── Shared "Add" row button ──────────────────────────────────────────────────

function AddRow({ label, sub, color = "#06b6d4", onAdd }: {
  label: string; sub?: string; color?: string; onAdd: () => void;
}) {
  return (
    <button onClick={onAdd}
      className="w-full text-left p-2.5 rounded-lg hover:bg-accent border border-transparent hover:border-border transition-colors mb-1 group flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-snug truncate" style={{ color }}>{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{sub}</p>}
      </div>
      <Plus className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-primary mt-0.5 transition-colors" />
    </button>
  );
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
        <Badge className="text-[9px] px-1 py-0 h-4" style={{ background: color }}>{file.category}</Badge>
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
        {item.thumbnail
          ? <img src={item.thumbnail} alt={item.label} className="w-full h-full object-cover" />
          : <span style={{ color }}>{KIND_ICONS[item.kind]}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate text-foreground">{item.label}</p>
        {item.subLabel && <p className="text-[10px] text-muted-foreground truncate">{item.subLabel}</p>}
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

function BibleSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
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
          onChange={(e) => setQuery(e.target.value)} className="pl-8 h-8 text-xs" />
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
          const ref = verse.chapter && verse.verse ? `${verse.book_name} ${verse.chapter}:${verse.verse}` : verse.book_name;
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
        <Input placeholder="Search songs…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
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
              <button className="w-full text-left p-2.5 hover:bg-accent transition-colors flex items-center justify-between gap-2"
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
                  <button className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex items-center gap-2 border-b border-border/50"
                    onClick={() => { onAdd({ id: generateQueueId(), kind: "song", label: song.title, subLabel: song.author, text: song.lyrics }); toast.success(`Added "${song.title}" to queue`); }}>
                    <Plus className="w-3 h-3" /> Add entire song
                  </button>
                  {sections.map((sec, i) => (
                    <button key={i} className="w-full text-left px-3 py-2 text-xs hover:bg-accent/50 transition-colors flex items-start justify-between gap-2 border-b border-border/30 last:border-0"
                      onClick={() => { onAdd({ id: generateQueueId(), kind: "song", label: `${song.title} — ${sec.label}`, subLabel: sec.content.slice(0, 50) + "…", text: sec.content }); toast.success(`Added "${song.title} — ${sec.label}"`); }}>
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

function MediaSourcePanel({ files, onAdd }: { files: MediaFileMeta[]; onAdd: (file: MediaFileMeta) => void }) {
  const [search, setSearch] = useState("");
  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search media…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
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
            {filtered.map((f) => <MediaCard key={f.id} file={f} onAdd={() => onAdd(f)} />)}
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
        value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addText(); }}
      />
      <Button onClick={addText} disabled={!text.trim()} className="shrink-0 gap-2 h-8 text-xs">
        <Plus className="w-3.5 h-3.5" /> Add to Queue
        <span className="text-muted-foreground ml-1 font-normal">Ctrl+Enter</span>
      </Button>
    </div>
  );
}

function ThemesSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-3">
      <p className="text-xs text-muted-foreground shrink-0">Queue a theme preset — when go-live is pressed, it switches the screen background.</p>
      <div className="flex-1 overflow-y-auto space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Static Themes</p>
        <div className="grid grid-cols-2 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button key={preset.id}
              onClick={() => { onAdd({ id: generateQueueId(), kind: "theme", label: preset.name, subLabel: "Theme preset", text: JSON.stringify(preset.background) }); toast.success(`Added theme "${preset.name}"`); }}
              className="relative rounded-lg overflow-hidden border border-border hover:border-primary/60 transition-colors group cursor-pointer h-16">
              <div className={`w-full h-full bg-gradient-to-br ${preset.previewGradient}`} />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <p className="text-[10px] text-white font-medium truncate">{preset.name}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-1">Live Wallpapers</p>
        <div className="grid grid-cols-2 gap-2">
          {LIVE_WALLPAPERS.map((wp) => (
            <button key={wp.id}
              onClick={() => { onAdd({ id: generateQueueId(), kind: "theme", label: wp.name, subLabel: "Live wallpaper", text: JSON.stringify({ type: "live_wallpaper", value: wp.id, overlay: 0 }) }); toast.success(`Added wallpaper "${wp.name}"`); }}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-primary/60 hover:bg-accent/50 transition-colors group cursor-pointer text-left">
              <Layers className="w-5 h-5 text-purple-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{wp.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{wp.description}</p>
              </div>
              <Plus className="w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScheduleSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const { data: schedules = [], isLoading } = useListSchedules({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function addScheduleItem(item: any, scheduleTitle: string) {
    const kind: QueueItemKind = item.type === "song" ? "song" : item.type === "verse" ? "bible" : "text";
    const text = item.content || item.title || "";
    onAdd({ id: generateQueueId(), kind, label: item.title, subLabel: scheduleTitle, text });
    toast.success(`Added "${item.title}" to queue`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <p className="text-xs text-muted-foreground shrink-0">Expand a schedule to add its items to the queue.</p>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span></div>}
        {!isLoading && schedules.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Calendar className="w-8 h-8 opacity-40" />
            <p className="text-sm">No schedules yet</p>
            <Link href="/schedule"><Button size="sm" variant="outline" className="h-7 text-xs mt-1">Create Schedule</Button></Link>
          </div>
        )}
        {(schedules as any[]).map((schedule: any) => {
          const items: any[] = schedule.items ?? [];
          const isOpen = expandedId === schedule.id;
          return (
            <div key={schedule.id} className="mb-2 border border-border rounded-lg overflow-hidden">
              <button className="w-full text-left p-2.5 hover:bg-accent transition-colors flex items-center justify-between gap-2"
                onClick={() => setExpandedId(isOpen ? null : schedule.id)}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-sky-400 truncate">{schedule.title}</p>
                  <p className="text-[10px] text-muted-foreground">{schedule.date} · {items.length} items</p>
                </div>
                <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-border bg-muted/20">
                  {items.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No items in this schedule.</p>}
                  {items.map((item: any, i: number) => (
                    <button key={i} onClick={() => addScheduleItem(item, schedule.title)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent/60 transition-colors flex items-center justify-between gap-2 border-b border-border/30 last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        {item.content && <p className="text-muted-foreground text-[10px] truncate mt-0.5">{item.content.slice(0, 60)}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{item.type}</Badge>
                        <Plus className="w-3 h-3 text-muted-foreground" />
                      </div>
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

function NotesSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const { data: notes = [], isLoading } = useListNotes({});
  const [search, setSearch] = useState("");
  const filtered = (notes as any[]).filter((n: any) =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.speaker.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span></div>}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <ScrollText className="w-8 h-8 opacity-40" />
            <p className="text-sm">{(notes as any[]).length === 0 ? "No notes yet" : "No results"}</p>
            {(notes as any[]).length === 0 && <Link href="/notes"><Button size="sm" variant="outline" className="h-7 text-xs mt-1">Add Note</Button></Link>}
          </div>
        )}
        {filtered.map((note: any) => (
          <AddRow key={note.id}
            label={note.title}
            sub={`${note.speaker} · ${note.content.slice(0, 80)}`}
            color="#06b6d4"
            onAdd={() => { onAdd({ id: generateQueueId(), kind: "text", label: note.title, subLabel: note.speaker, text: note.content }); toast.success(`Added "${note.title}"`); }}
          />
        ))}
      </div>
    </div>
  );
}

function InspirationSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const [tab, setTab] = useState<"verses" | "facts">("verses");
  const [search, setSearch] = useState("");
  const filteredVerses = VERSES.filter((v: DailyVerse) =>
    !search || v.reference.toLowerCase().includes(search.toLowerCase()) || v.text.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFacts = FACTS.filter((f: BibleFact) =>
    !search || f.topic.toLowerCase().includes(search.toLowerCase()) || f.fact.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <div className="flex gap-1 shrink-0">
        <Button size="sm" variant={tab === "verses" ? "default" : "outline"} className="h-7 text-xs flex-1" onClick={() => setTab("verses")}>
          Verses ({VERSES.length})
        </Button>
        <Button size="sm" variant={tab === "facts" ? "default" : "outline"} className="h-7 text-xs flex-1" onClick={() => setTab("facts")}>
          Bible Facts ({FACTS.length})
        </Button>
      </div>
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "verses" && filteredVerses.map((v: DailyVerse, i: number) => (
          <AddRow key={i} label={v.reference} sub={v.text} color="#f59e0b"
            onAdd={() => { onAdd({ id: generateQueueId(), kind: "bible", label: v.reference, subLabel: v.text.slice(0, 60) + "…", text: `"${v.text}"\n\n— ${v.reference}` }); toast.success(`Added ${v.reference}`); }}
          />
        ))}
        {tab === "facts" && filteredFacts.map((f: BibleFact, i: number) => (
          <AddRow key={i} label={f.topic} sub={f.fact} color="#f97316"
            onAdd={() => { onAdd({ id: generateQueueId(), kind: "text", label: f.topic, subLabel: f.fact.slice(0, 60) + "…", text: `${f.topic}\n\n${f.fact}` }); toast.success(`Added "${f.topic}"`); }}
          />
        ))}
      </div>
    </div>
  );
}

function TeachingsSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allTeachings] = useState<Teaching[]>(() => [...loadCustomTeachings(), ...TEACHINGS]);
  const filtered = allTeachings.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search teachings…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Brain className="w-8 h-8 opacity-40" /><p className="text-sm">No results</p>
          </div>
        )}
        {filtered.map((t) => {
          const isOpen = expandedId === t.id;
          return (
            <div key={t.id} className="mb-2 border border-border rounded-lg overflow-hidden">
              <button className="w-full text-left p-2.5 hover:bg-accent transition-colors flex items-center justify-between gap-2"
                onClick={() => setExpandedId(isOpen ? null : t.id)}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-indigo-400 truncate">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.category} · {t.theme}</p>
                </div>
                <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-border bg-muted/20">
                  {t.keyVerse && (
                    <button className="w-full text-left px-3 py-2 text-xs hover:bg-accent/60 transition-colors flex items-start justify-between gap-2 border-b border-border/30"
                      onClick={() => { onAdd({ id: generateQueueId(), kind: "bible", label: t.keyVerse!.reference, subLabel: t.title, text: `"${t.keyVerse!.text}"\n\n— ${t.keyVerse!.reference}` }); toast.success("Added key verse"); }}>
                      <div className="min-w-0">
                        <p className="font-medium text-amber-400">Key Verse: {t.keyVerse.reference}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5 line-clamp-2">{t.keyVerse.text}</p>
                      </div>
                      <Plus className="w-3 h-3 shrink-0 text-muted-foreground mt-0.5" />
                    </button>
                  )}
                  {t.points.map((pt, i) => (
                    <button key={i} className="w-full text-left px-3 py-2 text-xs hover:bg-accent/60 transition-colors flex items-start justify-between gap-2 border-b border-border/30 last:border-0"
                      onClick={() => { onAdd({ id: generateQueueId(), kind: "text", label: pt.heading, subLabel: t.title, text: `${t.category}\n\n${pt.heading}\n\n${pt.body}` }); toast.success(`Added "${pt.heading}"`); }}>
                      <div className="min-w-0">
                        <p className="font-medium text-indigo-300">{pt.heading}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5 line-clamp-2">{pt.body}</p>
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

interface PrayerRequest { id: string; name: string; category: string; body: string; status: string; createdAt: number; }

function PrayerWallSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const [items] = useLocalStorage<PrayerRequest[]>("wf-prayer-wall", []);
  const [search, setSearch] = useState("");
  const filtered = items.filter(p =>
    !search || `${p.name} ${p.category} ${p.body}`.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search requests…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Heart className="w-8 h-8 opacity-40" />
            <p className="text-sm">No prayer requests yet</p>
            <Link href="/prayer-wall"><Button size="sm" variant="outline" className="h-7 text-xs mt-1">Add Request</Button></Link>
          </div>
        )}
        {filtered.map((p) => {
          const header = p.name ? `${p.category} — ${p.name}` : p.category;
          const text = `Prayer Request\n\n${header}\n\n${p.body}`;
          return (
            <AddRow key={p.id} label={header} sub={p.body} color={p.status === "answered" ? "#22c55e" : "#ec4899"}
              onAdd={() => { onAdd({ id: generateQueueId(), kind: "text", label: header, subLabel: p.body.slice(0, 60), text }); toast.success("Added prayer request"); }}
            />
          );
        })}
        {filtered.length === 0 && items.length > 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No results</p>
        )}
      </div>
    </div>
  );
}

interface HymnEntry { number: string; title: string; hymnal: string; shownAt: number; }

function HymnSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const [history] = useLocalStorage<HymnEntry[]>("wf-hymn-history", []);
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");

  function addHymn(num: string, ttl: string) {
    if (!num.trim()) { toast.error("Enter a hymn number"); return; }
    const lines = [`№ ${num.trim()}`];
    if (ttl.trim()) lines.push(ttl.trim());
    const text = lines.join("\n\n");
    const label = ttl.trim() ? `Hymn #${num} — ${ttl}` : `Hymn #${num}`;
    onAdd({ id: generateQueueId(), kind: "hymn", label, subLabel: "Hymn number", text });
    toast.success(`Added "${label}"`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-3">
      <div className="shrink-0 space-y-2 p-3 rounded-lg border border-border bg-card">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Add Hymn to Queue</p>
        <div className="flex gap-2">
          <Input placeholder="Number" value={number} onChange={(e) => setNumber(e.target.value)} className="h-8 text-xs w-20" />
          <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-xs flex-1" />
        </div>
        <Button size="sm" className="h-7 w-full text-xs gap-1.5" onClick={() => addHymn(number, title)}>
          <Plus className="w-3 h-3" /> Add to Queue
        </Button>
      </div>
      {history.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent Hymns</p>
          {history.slice().reverse().map((h, i) => (
            <AddRow key={i} label={h.number ? `№ ${h.number}${h.title ? " — " + h.title : ""}` : h.title} sub={h.hymnal} color="#ec4899"
              onAdd={() => addHymn(h.number, h.title)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const COUNTDOWN_PRESETS = [
  { label: "5 min", minutes: 5 }, { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 }, { label: "20 min", minutes: 20 },
  { label: "30 min", minutes: 30 }, { label: "1 hour", minutes: 60 },
];

function CountdownSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const [custom, setCustom] = useState("");
  const [label, setLabel] = useState("Service starts in");

  function addCountdown(minutes: number) {
    if (minutes <= 0) return;
    const mm = String(Math.floor(minutes)).padStart(2, "0");
    const ss = String(Math.round((minutes % 1) * 60)).padStart(2, "0");
    onAdd({
      id: generateQueueId(), kind: "countdown",
      label: `${label || "Countdown"} · ${minutes} min`,
      subLabel: `${mm}:${ss}`,
      text: String(minutes),
      // Store the label so goLive can use it
      ...(label && { subLabel: label }),
    });
    toast.success(`Added ${minutes} min countdown`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-3">
      <div className="shrink-0 space-y-2 p-3 rounded-lg border border-border bg-card">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Countdown Label</p>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Service starts in" className="h-8 text-xs" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">Quick Presets</p>
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {COUNTDOWN_PRESETS.map((p) => (
          <button key={p.minutes} onClick={() => addCountdown(p.minutes)}
            className="flex items-center justify-center gap-1 p-2.5 rounded-lg border border-border hover:border-orange-400/60 hover:bg-accent/50 transition-colors text-xs font-medium group">
            <Plus className="w-3 h-3 text-muted-foreground group-hover:text-orange-400 transition-colors" />
            {p.label}
          </button>
        ))}
      </div>
      <div className="shrink-0 flex gap-2 items-center">
        <Input type="number" placeholder="Custom (min)" value={custom} onChange={(e) => setCustom(e.target.value)} className="h-8 text-xs" min={1} max={180} />
        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0 gap-1"
          onClick={() => { const m = parseFloat(custom); if (m > 0) { addCountdown(m); setCustom(""); } }}>
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        When go-live is pressed, the countdown activates and starts counting down from the screen.
      </p>
    </div>
  );
}

const GAMES_LIST = [
  { id: "trivia",      title: "Bible Trivia",        desc: "Multiple-choice questions per round" },
  { id: "books",       title: "Books of the Bible",   desc: "Order the books in the correct sequence" },
  { id: "whosaid",     title: "Who Said It?",         desc: "Guess which Bible figure spoke the line" },
  { id: "charades",    title: "Bible Charades",        desc: "Act out Bible people and events" },
  { id: "scramble",    title: "Word Scramble",         desc: "Rebuild a verse from shuffled words" },
  { id: "emoji",       title: "Emoji Bible",           desc: "Guess the story from emojis" },
  { id: "hangman",     title: "Hangman",               desc: "Letter-by-letter Bible word guessing" },
  { id: "trueorfalse", title: "True or False",         desc: "Quick-fire Bible statements" },
  { id: "spell",       title: "Spell It Out",          desc: "Spell the Bible word from a clue" },
  { id: "twotruths",   title: "Two Truths & a Lie",    desc: "Spot the false statement about a Bible figure" },
  { id: "connections", title: "Connections",           desc: "Sort Bible items into 4 hidden groups" },
  { id: "fillblank",   title: "Fill in the Blank",     desc: "Pick the missing word from a KJV verse" },
  { id: "oddoneout",   title: "Odd One Out",           desc: "Find the item that doesn't belong" },
];

function GamesSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <p className="text-xs text-muted-foreground shrink-0">Add a game cue to the queue. Go-live launches it on the broadcast screen.</p>
      <div className="flex-1 overflow-y-auto">
        {GAMES_LIST.map((g) => (
          <AddRow key={g.id} label={g.title} sub={g.desc} color="#22c55e"
            onAdd={() => { onAdd({ id: generateQueueId(), kind: "text", label: `🎮 ${g.title}`, subLabel: g.desc, text: `Bible Game: ${g.title}\n\n${g.desc}\n\nLaunch from the Bible Games page.` }); toast.success(`Added "${g.title}" to queue`); }}
          />
        ))}
      </div>
    </div>
  );
}

const AI_TYPES = [
  { id: "announcement", label: "Announcement", endpoint: "announcement" },
  { id: "prayer",       label: "Prayer",        endpoint: "prayer" },
];

function AISourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("announcement");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    if (!topic.trim()) return;
    setGenerating(true); setResult(""); setError("");
    try {
      const endpoint = AI_TYPES.find(t => t.id === type)?.endpoint ?? "announcement";
      const res = await fetch(`/api/ai/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAiHeaders() },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      if (!res.ok) { setError("AI error — check your API key in Settings."); setGenerating(false); return; }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setResult(text);
      }
    } catch { setError("Failed to generate. Check your API key in Settings."); }
    finally { setGenerating(false); }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <div className="flex gap-1 shrink-0">
        {AI_TYPES.map(t => (
          <Button key={t.id} size="sm" variant={type === t.id ? "default" : "outline"} className="h-7 text-xs"
            onClick={() => setType(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>
      <Input placeholder="Topic or title…" value={topic} onChange={(e) => setTopic(e.target.value)} className="h-8 text-xs shrink-0"
        onKeyDown={(e) => { if (e.key === "Enter") generate(); }} />
      <Button size="sm" onClick={generate} disabled={!topic.trim() || generating} className="h-8 text-xs shrink-0 gap-1.5">
        {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</> : <><Sparkles className="w-3.5 h-3.5" /> Generate</>}
      </Button>
      {error && <p className="text-xs text-destructive shrink-0">{error}</p>}
      {result && (
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{result}</p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs shrink-0 gap-1.5"
            onClick={() => { onAdd({ id: generateQueueId(), kind: "text", label: topic, subLabel: "AI Generated", text: result }); toast.success("Added to queue"); }}>
            <Plus className="w-3.5 h-3.5" /> Add to Queue
          </Button>
        </div>
      )}
      {!result && !error && !generating && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Sparkles className="w-8 h-8 opacity-30" />
          <p className="text-xs text-center opacity-70">Enter a topic and click Generate</p>
        </div>
      )}
    </div>
  );
}

const HOW_TO_TIPS = [
  { heading: "Navigate slides", body: "Press Arrow Left / Right (or swipe) to move through queue items on the broadcast screen." },
  { heading: "Teleprompter scroll", body: "Press Space to toggle auto-scroll. Works from anywhere with Global Scroll Keys enabled." },
  { heading: "Black screen", body: "Press B on the broadcast window to toggle black screen. Useful during transitions." },
  { heading: "Clear screen", body: "Press C to clear all content from the broadcast screen (shows background only)." },
  { heading: "Fullscreen broadcast", body: "Press F on the broadcast window to enter fullscreen mode for clean projection." },
  { heading: "Quick send to screen", body: "Click any content item's 'Send' button from any page — it goes live immediately." },
  { heading: "Ticker bar", body: "Enable the ticker bar in Settings to show a scrolling message at the bottom of the screen." },
  { heading: "Live captions", body: "Enable live captions in Settings (Chrome only) for auto-transcribed captions on screen." },
  { heading: "Bible search tip", body: 'Type a reference like "John 3:16" or a word like "faith" to search the Bible.' },
  { heading: "Multi-display", body: "Open a second browser window to /broadcast and extend it to your projector display." },
];

function HowToSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-2">
      <p className="text-xs text-muted-foreground shrink-0">Operator tips — add any to the queue as a text cue for reference during the service.</p>
      <div className="flex-1 overflow-y-auto">
        {HOW_TO_TIPS.map((tip, i) => (
          <AddRow key={i} label={tip.heading} sub={tip.body} color="#06b6d4"
            onAdd={() => { onAdd({ id: generateQueueId(), kind: "text", label: tip.heading, subLabel: tip.body.slice(0, 60), text: `${tip.heading}\n\n${tip.body}` }); toast.success(`Added tip: ${tip.heading}`); }}
          />
        ))}
      </div>
    </div>
  );
}

function SettingsSourcePanel({ onAdd }: { onAdd: (item: QueueItem) => void }) {
  const [churchName] = useLocalStorage<string>("wf-church-name", "");
  const [ticker] = useLocalStorage<string>("wf-ticker-text", "");
  const [bibleVersion] = useLocalStorage<string>("wf-bible-version", "KJV");

  const items = [
    churchName && { label: "Church Name", value: churchName, kind: "text" as QueueItemKind },
    ticker && { label: "Ticker Message", value: ticker, kind: "text" as QueueItemKind },
    bibleVersion && { label: "Bible Version", value: bibleVersion, kind: "text" as QueueItemKind },
  ].filter(Boolean) as { label: string; value: string; kind: QueueItemKind }[];

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3 pt-2 gap-3">
      <p className="text-xs text-muted-foreground shrink-0">Key app settings — add items like the church name as on-screen text cues.</p>
      {items.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {items.map((item, i) => (
            <AddRow key={i} label={item.label} sub={item.value} color="#8b5cf6"
              onAdd={() => { onAdd({ id: generateQueueId(), kind: item.kind, label: item.label, text: item.value }); toast.success(`Added "${item.label}"`); }}
            />
          ))}
        </div>
      )}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
          <Settings className="w-8 h-8 opacity-30" />
          <p className="text-xs text-center">No queue-able settings found.<br />Configure church name and ticker in Settings.</p>
        </div>
      )}
      <div className="shrink-0">
        <Link href="/settings">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Open Settings
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Nav item icon resolver ───────────────────────────────────────────────────

function NavIcon({ iconId, className, style }: { iconId: string; className?: string; style?: React.CSSProperties }) {
  const Icon = getIconComponent(iconId);
  return <Icon className={className} style={style} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>(() => loadQueue());
  const [liveId, setLiveId] = useState<string>();
  const [activeNav, setActiveNav] = useState("/");
  const [mediaFiles, setMediaFiles] = useState<MediaFileMeta[]>([]);

  const { data: screenState } = useGetScreenState();
  const { mutateAsync: updateScreen } = useUpdateScreenState();
  const { overrides } = useMenuCustomization();
  const [emojiMode] = useEmojiMode();

  useEffect(() => { listMediaFiles().then(setMediaFiles); }, []);
  useEffect(() => { saveQueue(queue); }, [queue]);

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
        toast.error("Cannot present this item type directly.");
        return;
      }
      setLiveId(item.id);
      toast.success(`Now live: ${item.label}`);
    } catch {
      toast.error("Failed to send to screen");
    }
  }, [screenState, updateScreen]);

  const removeItem = (id: string) => setQueue((q) => q.filter((i) => i.id !== id));
  const clearAll = () => { setQueue([]); setLiveId(undefined); };
  const moveUp = (index: number) => setQueue((q) => { const n = [...q]; [n[index - 1], n[index]] = [n[index], n[index - 1]]; return n; });
  const moveDown = (index: number) => setQueue((q) => { const n = [...q]; [n[index], n[index + 1]] = [n[index + 1], n[index]]; return n; });

  const goNext = () => {
    if (!queue.length) return;
    const idx = queue.findIndex((i) => i.id === liveId);
    const next = queue[idx === -1 ? 0 : Math.min(idx + 1, queue.length - 1)];
    goLive(next);
  };

  const navItems = DEFAULT_NAV_ITEMS.filter((item) => item.href !== "/queue");

  const renderSource = () => {
    switch (activeNav) {
      case "/":           return <BibleSourcePanel onAdd={addItem} />;
      case "/songs":      return <SongsSourcePanel onAdd={addItem} />;
      case "/custom":     return <CustomTextSourcePanel onAdd={addItem} />;
      case "/media":
      case "/library":    return <MediaSourcePanel files={mediaFiles} onAdd={addMedia} />;
      case "/themes":     return <ThemesSourcePanel onAdd={addItem} />;
      case "/schedule":   return <ScheduleSourcePanel onAdd={addItem} />;
      case "/notes":      return <NotesSourcePanel onAdd={addItem} />;
      case "/inspiration":return <InspirationSourcePanel onAdd={addItem} />;
      case "/teachings":  return <TeachingsSourcePanel onAdd={addItem} />;
      case "/prayer-wall":return <PrayerWallSourcePanel onAdd={addItem} />;
      case "/hymn-number":return <HymnSourcePanel onAdd={addItem} />;
      case "/countdown":  return <CountdownSourcePanel onAdd={addItem} />;
      case "/games":      return <GamesSourcePanel onAdd={addItem} />;
      case "/ai":         return <AISourcePanel onAdd={addItem} />;
      case "/how-to":     return <HowToSourcePanel onAdd={addItem} />;
      case "/settings":   return <SettingsSourcePanel onAdd={addItem} />;
      default: return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
          <Star className="w-8 h-8 opacity-30" />
          <p className="text-sm text-center">Browse this page to add content to the queue.</p>
          <Link href={activeNav}><Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">Open Page</Button></Link>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold">Live Queue</h1>
          {queue.length > 0 && <Badge variant="secondary" className="text-xs">{queue.length} items</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={goNext} disabled={queue.length === 0}>
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
          {/* Full nav bar */}
          <div className="shrink-0 flex overflow-x-auto border-b border-border bg-muted/30 gap-0.5 px-1.5 py-1.5"
            style={{ scrollbarWidth: "none" }}>
            {navItems.map((item) => {
              const iconId = effectiveIconId(item, overrides);
              const isActive = activeNav === item.href;
              return (
                <button key={item.href} onClick={() => setActiveNav(item.href)} title={item.label}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md shrink-0 transition-colors min-w-[52px] max-w-[64px] ${
                    isActive
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}>
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
                Browse any page on the left and click <Plus className="inline w-3 h-3 mx-1" /> to add items.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
              {queue.map((item, i) => (
                <QueueCard key={item.id} item={item} index={i} total={queue.length}
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
