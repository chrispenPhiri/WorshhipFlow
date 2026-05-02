import { useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useRecentlyPresented } from "@/hooks/use-recently-presented";
import {
  useListSongs,
  useGetSongStats,
  useCreateSong,
  useDeleteSong,
  useUpdateScreenState,
  useGetScreenState,
  getListSongsQueryKey,
  getGetScreenStateQueryKey,
  getGetSongStatsQueryKey,
  CreateSongBodyCategory
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, Plus, Search, Cast, ChevronLeft, ChevronRight, Trash2, Layers, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["hymn", "worship", "gospel", "contemporary", "christmas", "shona", "ndebele", "other"] as const;

function parseSections(lyrics: string): string[] {
  return lyrics
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Try to detect an explicit section header like [Verse 1], [Chorus], CHORUS: — returns null when none. */
function parseExplicitLabel(text: string): { label: string; content: string } | null {
  const lines = text.split("\n");
  const first = lines[0].trim();
  const rest = lines.slice(1).join("\n").trim();

  // Bracket label: [Verse 1], [Chorus], [Bridge], etc.
  const bracketMatch = first.match(/^\[([^\]]+)\]$/);
  if (bracketMatch && rest) {
    return { label: capitalize(bracketMatch[1].trim()), content: rest };
  }
  // Colon label: "Chorus:", "Verse 1:", "Bridge:", etc.
  const colonMatch = first.match(/^(verse\s*\d*|chorus\s*\d*|bridge\s*\d*|pre[\s-]?chorus|refrain|tag|intro|outro|interlude)\s*:?\s*$/i);
  if (colonMatch && rest) {
    return { label: capitalize(colonMatch[1].trim()), content: rest };
  }
  // All-caps short header: "CHORUS", "VERSE 1"
  if (first.length < 20 && /^[A-Z][A-Z\s0-9]*$/.test(first) && rest) {
    return { label: capitalize(first), content: rest };
  }
  return null;
}

/** Label every section, auto-numbering unlabeled stanzas as Verse 1, Verse 2, … */
function labelAllSections(sections: string[]): { label: string; content: string }[] {
  let verseCounter = 0;
  return sections.map(text => {
    const explicit = parseExplicitLabel(text);
    if (explicit) return explicit;
    verseCounter++;
    return { label: `Verse ${verseCounter}`, content: text };
  });
}

/** Single-section labeling used by Send-All (whole lyrics block). Falls back to "Verse 1". */
function getSectionInfo(text: string, slideNum: number): { label: string; content: string } {
  return parseExplicitLabel(text) ?? { label: `Verse ${slideNum}`, content: text };
}

function capitalize(s: string) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

/** Classify a section label so we can color-code it (B3.2). */
export type SongSectionType =
  | "verse" | "chorus" | "pre-chorus" | "bridge"
  | "intro" | "outro" | "interlude" | "tag" | "refrain" | "slide";

function getSectionType(label: string): SongSectionType {
  const l = label.toLowerCase().trim();
  if (/^pre[\s-]?chorus/.test(l)) return "pre-chorus";
  if (l.startsWith("chorus")) return "chorus";
  if (l.startsWith("verse")) return "verse";
  if (l.startsWith("bridge")) return "bridge";
  if (l.startsWith("intro")) return "intro";
  if (l.startsWith("outro")) return "outro";
  if (l.startsWith("interlude")) return "interlude";
  if (l.startsWith("tag")) return "tag";
  if (l.startsWith("refrain")) return "refrain";
  return "slide";
}

/** Tailwind palette per section type (B3.2). The "slide" entry is a legacy fallback — auto-labeled stanzas now classify as "verse". */
const SECTION_TYPE_STYLES: Record<SongSectionType, { active: string; idle: string; abbr: string; ring: string }> = {
  verse:        { active: "bg-blue-500   text-white",   idle: "bg-blue-500/15   text-blue-300   hover:bg-blue-500/25",   abbr: "V", ring: "ring-blue-400/50"   },
  chorus:       { active: "bg-amber-500  text-black",   idle: "bg-amber-500/15  text-amber-300  hover:bg-amber-500/25",  abbr: "C", ring: "ring-amber-400/50"  },
  "pre-chorus": { active: "bg-cyan-500   text-black",   idle: "bg-cyan-500/15   text-cyan-300   hover:bg-cyan-500/25",   abbr: "PC", ring: "ring-cyan-400/50"  },
  bridge:       { active: "bg-purple-500 text-white",   idle: "bg-purple-500/15 text-purple-300 hover:bg-purple-500/25", abbr: "B", ring: "ring-purple-400/50" },
  intro:        { active: "bg-slate-500  text-white",   idle: "bg-slate-500/15  text-slate-300  hover:bg-slate-500/25",  abbr: "I", ring: "ring-slate-400/50"  },
  outro:        { active: "bg-slate-600  text-white",   idle: "bg-slate-600/15  text-slate-300  hover:bg-slate-600/25",  abbr: "O", ring: "ring-slate-400/50"  },
  interlude:    { active: "bg-teal-500   text-black",   idle: "bg-teal-500/15   text-teal-300   hover:bg-teal-500/25",   abbr: "Int", ring: "ring-teal-400/50" },
  tag:          { active: "bg-emerald-500 text-black",  idle: "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25", abbr: "T", ring: "ring-emerald-400/50" },
  refrain:      { active: "bg-rose-500   text-white",   idle: "bg-rose-500/15   text-rose-300   hover:bg-rose-500/25",   abbr: "R", ring: "ring-rose-400/50"   },
  slide:        { active: "bg-primary    text-primary-foreground", idle: "bg-muted text-muted-foreground hover:bg-muted/80", abbr: "•", ring: "ring-primary/40" },
};

/** Pull just the trailing number off a label like "Verse 1" → "1". */
function getSectionNumber(label: string): string {
  const m = label.match(/(\d+)\s*$/);
  return m ? m[1] : "";
}

export default function SongsPage() {
  const [category, setCategory] = useLocalStorage<string>("wf-songs-category", "all");
  const [search, setSearch] = useLocalStorage("wf-songs-search", "");
  const [activeSongId, setActiveSongId] = useLocalStorage<number | null>("wf-songs-active-id", null);
  const [sectionIdx, setSectionIdx] = useLocalStorage<number>("wf-songs-section-idx", 0);
  const [addOpen, setAddOpen] = useState(false);

  // Add song form state
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newCategory, setNewCategory] = useState<CreateSongBodyCategory>("worship");
  const [newKey, setNewKey] = useState("");
  const [newTempo, setNewTempo] = useState("");
  const [newLyrics, setNewLyrics] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { add: addRecent } = useRecentlyPresented();

  const queryParams = {
    ...(category !== "all" && { category }),
    ...(search && { search }),
  };

  const { data: songs = [], isLoading } = useListSongs(queryParams, {
    query: { queryKey: getListSongsQueryKey(queryParams) },
  });
  const { data: stats } = useGetSongStats({ query: { queryKey: getGetSongStatsQueryKey() } });
  const { data: screenState } = useGetScreenState({ query: { queryKey: getGetScreenStateQueryKey() } });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  const { mutate: createSong, isPending: creating } = useCreateSong({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetSongStatsQueryKey() });
        toast({ title: "Song added", description: `"${newTitle}" added to library.` });
        setAddOpen(false);
        setNewTitle(""); setNewAuthor(""); setNewKey(""); setNewTempo(""); setNewLyrics("");
      },
      onError: () => toast({ title: "Failed to add song", variant: "destructive" }),
    },
  });

  const { mutate: deleteSong } = useDeleteSong({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetSongStatsQueryKey() });
        setActiveSongId(null);
        toast({ title: "Song deleted" });
      },
    },
  });

  const safeBase = {
    isBlack: screenState?.isBlack ?? false,
    isClear: false,
    contentType: "song" as const,
    tickerEnabled: screenState?.tickerEnabled ?? false,
    tickerText: screenState?.tickerText ?? undefined,
    // Always clear comparison mode when sending non-bible content (B3.5)
    comparisonMode: false,
  };

  const sendSection = (song: any, text: string, slideNum: number, labelOverride?: string) => {
    const computed = getSectionInfo(text, slideNum);
    const label = labelOverride ?? computed.label;
    const content = computed.content;
    const screenData = {
      ...safeBase,
      // Encode section label after § so the broadcast screen can parse it
      title: `${song.title}§${label}`,
      content,
      textStyle: screenState?.textStyle ?? {
        fontFamily: "Inter",
        fontSize: 52,
        textColor: "#ffffff",
        alignment: "center" as const,
        animation: "fade_in" as const,
      },
      background: screenState?.background ?? { type: "color", value: "#000000" },
    };
    updateScreen({ data: screenData });
    // Track in recently-presented (B3.6) — snapshot screenData so click-to-restore re-sends exactly.
    addRecent({
      id: `song-${song.id}-${slideNum}`,
      type: "song",
      title: song.title,
      subtitle: label,
      payload: { songId: song.id, sectionIdx: slideNum - 1, screenData },
    });
    toast({ title: "Sent to screen", description: `${song.title} — ${label}` });
  };

  const activeSong = songs.find((s: any) => s.id === activeSongId);
  const sections = activeSong ? parseSections(activeSong.lyrics) : [];

  // Clamp persisted sectionIdx if it points past the end of the current song's sections.
  // (e.g. song was edited/deleted after we saved the index.)
  useEffect(() => {
    if (sections.length > 0 && sectionIdx >= sections.length) setSectionIdx(0);
    if (!activeSong && sectionIdx !== 0) setSectionIdx(0);
  }, [activeSong, sections.length, sectionIdx, setSectionIdx]);

  const currentSection = sections[sectionIdx] ?? "";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Songs Library</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{stats?.total ?? 0} songs</p>
          </div>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Song</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Song</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Title *</label>
                  <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Amazing Grace" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Author / Artist *</label>
                  <Input value={newAuthor} onChange={e => setNewAuthor(e.target.value)} placeholder="John Newton" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newCategory} onValueChange={v => setNewCategory(v as CreateSongBodyCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Key</label>
                  <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="G major" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tempo</label>
                  <Input value={newTempo} onChange={e => setNewTempo(e.target.value)} placeholder="Slow / Fast / 120 BPM" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-sm font-medium">Lyrics *</label>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground mr-1">Quick add:</span>
                    {(() => {
                      const insertSection = (header: string, autoNumber: boolean) => {
                        let label = header;
                        if (autoNumber) {
                          const re = new RegExp(`\\[${header}\\s*(\\d+)\\]`, "gi");
                          let max = 0; let m;
                          while ((m = re.exec(newLyrics)) !== null) {
                            const n = parseInt(m[1], 10);
                            if (!isNaN(n) && n > max) max = n;
                          }
                          label = `${header} ${max + 1}`;
                        }
                        const sep = newLyrics.trim().length === 0 ? "" : (newLyrics.endsWith("\n\n") ? "" : (newLyrics.endsWith("\n") ? "\n" : "\n\n"));
                        setNewLyrics(prev => `${prev}${sep}[${label}]\n`);
                      };
                      return (
                        <>
                          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px] gap-1 border-blue-500/40 text-blue-300 hover:bg-blue-500/15"
                            data-testid="button-insert-verse"
                            onClick={() => insertSection("Verse", true)}>
                            <Plus className="w-3 h-3" /> Verse
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px] gap-1 border-amber-500/40 text-amber-300 hover:bg-amber-500/15"
                            data-testid="button-insert-chorus"
                            onClick={() => insertSection("Chorus", false)}>
                            <Plus className="w-3 h-3" /> Chorus
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px] gap-1 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/15"
                            data-testid="button-insert-pre-chorus"
                            onClick={() => insertSection("Pre-Chorus", false)}>
                            <Plus className="w-3 h-3" /> Pre-Chorus
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px] gap-1 border-purple-500/40 text-purple-300 hover:bg-purple-500/15"
                            data-testid="button-insert-bridge"
                            onClick={() => insertSection("Bridge", false)}>
                            <Plus className="w-3 h-3" /> Bridge
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Use the buttons above to add labelled sections, or just separate verses & choruses with a blank line — unlabelled stanzas auto-number as Verse 1, Verse 2, …</p>
                <Textarea
                  value={newLyrics}
                  onChange={e => setNewLyrics(e.target.value)}
                  placeholder={"[Verse 1]\nAmazing grace, how sweet the sound\nThat saved a wretch like me\n\n[Chorus]\nMy chains are gone, I've been set free\n\n[Verse 2]\nI once was lost but now am found\nWas blind but now I see"}
                  className="min-h-48 font-mono text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (!newTitle || !newAuthor || !newLyrics) {
                      toast({ title: "Title, author and lyrics are required", variant: "destructive" });
                      return;
                    }
                    createSong({ data: { title: newTitle, author: newAuthor, category: newCategory, lyrics: newLyrics, key: newKey || undefined, tempo: newTempo || undefined } });
                  }}
                  disabled={creating}
                >
                  {creating ? "Adding…" : "Add Song"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search songs…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Category tabs */}
      <Tabs value={category} onValueChange={v => { setCategory(v); setActiveSongId(null); }}>
        <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
          {["all", ...CATEGORIES].map(c => (
            <TabsTrigger key={c} value={c} className="capitalize">
              {c}{stats?.byCategory && stats.byCategory[c] !== undefined ? ` (${stats.byCategory[c]})` : ""}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Song list */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : songs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              No songs found.
            </div>
          ) : (
            songs.map((song: any) => (
              <Card
                key={song.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${activeSongId === song.id ? "border-primary ring-1 ring-primary" : ""}`}
                onClick={() => { setActiveSongId(song.id === activeSongId ? null : song.id); setSectionIdx(0); }}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{song.title}</p>
                      <p className="text-sm text-muted-foreground">{song.author}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {song.key && <Badge variant="outline" className="text-xs">{song.key}</Badge>}
                      <Badge variant="secondary" className="capitalize text-xs">{song.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                {activeSongId === song.id && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={e => { e.stopPropagation(); sendSection(song, song.lyrics, 1); }}
                      >
                        <Layers className="w-3.5 h-3.5" /> Send All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={e => { e.stopPropagation(); deleteSong({ id: song.id }); }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Verse-by-verse panel */}
        <div className="space-y-3">
          {activeSong ? (
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{activeSong.title}</CardTitle>
                  <button onClick={() => setActiveSongId(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {(activeSong.key || activeSong.tempo) && (
                  <p className="text-xs text-muted-foreground">
                    {activeSong.key && `Key: ${activeSong.key}`}
                    {activeSong.key && activeSong.tempo && " · "}
                    {activeSong.tempo && `Tempo: ${activeSong.tempo}`}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Active section label badge (B3.2) */}
                {(() => {
                  const labeled = labelAllSections(sections);
                  const info = labeled[sectionIdx] ?? { label: "Verse 1", content: currentSection };
                  const t = getSectionType(info.label);
                  const s = SECTION_TYPE_STYLES[t];
                  return (
                    <div className="flex items-center justify-between">
                      <span
                        data-testid={`badge-active-section-type`}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${s.active}`}
                      >
                        {info.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {sectionIdx + 1} / {sections.length}
                      </span>
                    </div>
                  );
                })()}

                {/* Section display */}
                <div className="bg-muted/50 rounded-lg p-3 min-h-28 text-sm font-serif whitespace-pre-wrap">
                  {(() => {
                    const labeled = labelAllSections(sections);
                    return labeled[sectionIdx]?.content ?? currentSection;
                  })()}
                </div>

                {/* Section navigation — color-coded by type (B3.2) */}
                <div className="flex gap-1.5 flex-wrap justify-center" data-testid="nav-section-list">
                  {labelAllSections(sections).map((info, i) => {
                    const t = getSectionType(info.label);
                    const styles = SECTION_TYPE_STYLES[t];
                    const num = getSectionNumber(info.label);
                    const display = num ? `${styles.abbr}${num}` : styles.abbr;
                    return (
                      <button
                        key={i}
                        onClick={() => setSectionIdx(i)}
                        title={info.label}
                        data-testid={`button-section-${i}`}
                        className={`min-w-9 h-7 px-1.5 rounded text-xs font-bold transition-colors ${
                          i === sectionIdx ? styles.active : styles.idle
                        }`}
                      >
                        {display}
                      </button>
                    );
                  })}
                </div>

                {/* Prev/Next */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setSectionIdx(i => Math.max(0, i - 1))}
                    disabled={sectionIdx === 0}
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setSectionIdx(i => Math.min(sections.length - 1, i + 1))}
                    disabled={sectionIdx === sections.length - 1}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Send — labels with the actual section name (e.g. "Send Chorus", "Send Verse 1") */}
                {(() => {
                  const labeled = labelAllSections(sections);
                  const active = labeled[sectionIdx];
                  const activeLabel = active?.label ?? `Verse ${sectionIdx + 1}`;
                  return (
                    <Button
                      className="w-full gap-2"
                      data-testid="button-send-section"
                      onClick={() => sendSection(activeSong, active?.content ?? currentSection, sectionIdx + 1, activeLabel)}
                    >
                      <Cast className="w-4 h-4" /> Send {activeLabel}
                    </Button>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <Music className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Click a song to navigate its verses & choruses
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
