import { useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
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

/** Detect a section header like [Verse 1], [Chorus], CHORUS:, etc. */
function getSectionInfo(text: string, slideNum: number): { label: string; content: string } {
  const lines = text.split("\n");
  const first = lines[0].trim();
  const rest = lines.slice(1).join("\n").trim();

  // Bracket label: [Verse 1], [Chorus], [Bridge], etc.
  const bracketMatch = first.match(/^\[([^\]]+)\]$/);
  if (bracketMatch && rest) {
    return { label: capitalize(bracketMatch[1].trim()), content: rest };
  }
  // Colon label: "Chorus:", "Verse 1:", "Bridge:", etc.
  const colonMatch = first.match(/^(verse\s*\d*|chorus|bridge|pre[\s-]?chorus|refrain|tag|intro|outro|interlude)\s*:?\s*$/i);
  if (colonMatch && rest) {
    return { label: capitalize(colonMatch[1].trim()), content: rest };
  }
  // All-caps short header: "CHORUS", "VERSE 1"
  if (first.length < 20 && /^[A-Z][A-Z\s0-9]*$/.test(first) && rest) {
    return { label: capitalize(first), content: rest };
  }
  return { label: `Slide ${slideNum}`, content: text };
}

function capitalize(s: string) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export default function SongsPage() {
  const [category, setCategory] = useLocalStorage<string>("wf-songs-category", "all");
  const [search, setSearch] = useState("");
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
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
  };

  const sendSection = (song: any, text: string, slideNum: number) => {
    const { label, content } = getSectionInfo(text, slideNum);
    updateScreen({
      data: {
        ...safeBase,
        // Encode section label after § so the broadcast screen can parse it
        title: `${song.title}§${label}`,
        content,
        textStyle: screenState?.textStyle ?? {
          fontFamily: "Inter",
          fontSize: 52,
          textColor: "#ffffff",
          alignment: "center",
          animation: "fade_in",
        },
        background: screenState?.background ?? { type: "color", value: "#000000" },
      },
    });
    toast({ title: "Sent to screen", description: `${song.title} — ${label}` });
  };

  const activeSong = songs.find((s: any) => s.id === activeSongId);
  const sections = activeSong ? parseSections(activeSong.lyrics) : [];
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
                <label className="text-sm font-medium">Lyrics *</label>
                <p className="text-xs text-muted-foreground">Separate verses/choruses with a blank line — each section becomes a slide</p>
                <Textarea
                  value={newLyrics}
                  onChange={e => setNewLyrics(e.target.value)}
                  placeholder={"Amazing grace, how sweet the sound\nThat saved a wretch like me\n\nI once was lost but now am found\nWas blind but now I see"}
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
                {/* Section display */}
                <div className="bg-muted/50 rounded-lg p-3 min-h-28 text-sm font-serif whitespace-pre-wrap">
                  {currentSection}
                </div>

                {/* Section count */}
                <p className="text-xs text-center text-muted-foreground">
                  Slide {sectionIdx + 1} of {sections.length}
                </p>

                {/* Section navigation */}
                <div className="flex gap-1 flex-wrap justify-center">
                  {sections.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSectionIdx(i)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        i === sectionIdx ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
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

                {/* Send */}
                <Button
                  className="w-full gap-2"
                  onClick={() => sendSection(activeSong, currentSection, sectionIdx + 1)}
                >
                  <Cast className="w-4 h-4" /> Send slide {sectionIdx + 1}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <Music className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Click a song to navigate its slides
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
