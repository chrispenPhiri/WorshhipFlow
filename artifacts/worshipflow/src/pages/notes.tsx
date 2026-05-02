import { useMemo, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useRecentlyPresented } from "@/hooks/use-recently-presented";
import {
  useListNotes, useCreateNote, useUpdateNote, useDeleteNote,
  useUpdateScreenState, useGetScreenState,
  getListNotesQueryKey, getGetScreenStateQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen, Plus, Trash2, Edit, Send, Search, X, Tag,
  Sparkles, Sun, Calendar as CalendarIcon, ChevronRight, Lightbulb, Quote,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  VERSES, FACTS, getVerseOfDay, getFactOfDay, getUpcomingEvents,
  type DailyVerse, type BibleFact, type ChristianEvent,
} from "@/lib/inspiration";

type NoteFormData = {
  title: string;
  speaker: string;
  date: string;
  content: string;
  scriptures: string[];
};

const EMPTY_FORM: NoteFormData = {
  title: "",
  speaker: "",
  date: new Date().toISOString().split("T")[0],
  content: "",
  scriptures: [],
};

function NoteFormDialog({
  open, onClose, initial, onSave, saving,
}: {
  open: boolean;
  onClose: () => void;
  initial?: NoteFormData;
  onSave: (data: NoteFormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<NoteFormData>(initial ?? EMPTY_FORM);
  const [scriptureInput, setScriptureInput] = useState("");

  const set = (k: keyof NoteFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  const addScripture = () => {
    const trimmed = scriptureInput.trim();
    if (trimmed && !form.scriptures.includes(trimmed)) {
      set("scriptures", [...form.scriptures, trimmed]);
      setScriptureInput("");
    }
  };
  const removeScripture = (s: string) => set("scriptures", form.scriptures.filter(x => x !== s));

  const valid = form.title.trim() && form.speaker.trim() && form.date && form.content.trim();

  // Reset form when dialog opens with new initial value
  const handleOpen = () => setForm(initial ?? EMPTY_FORM);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Note" : "New Note"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Sermon / note title" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Speaker</label>
              <Input value={form.speaker} onChange={e => set("speaker", e.target.value)} placeholder="Pastor / speaker name" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date</label>
            <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={form.content}
              onChange={e => set("content", e.target.value)}
              placeholder="Write sermon notes, key points, quotes…"
              className="min-h-48 font-mono text-sm resize-y"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Scripture References</label>
            <div className="flex gap-2">
              <Input
                value={scriptureInput}
                onChange={e => setScriptureInput(e.target.value)}
                placeholder="e.g. John 3:16"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addScripture(); } }}
              />
              <Button type="button" variant="outline" onClick={addScripture} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {form.scriptures.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.scriptures.map(s => (
                  <Badge key={s} variant="secondary" className="gap-1 pr-1">
                    {s}
                    <button onClick={() => removeScripture(s)} className="hover:text-destructive ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!valid || saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Create note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  Daily Inspiration tab — verse of the day, Bible facts, Christian calendar.
// ───────────────────────────────────────────────────────────────────────────────

interface InspirationTabProps {
  onPresent: (
    title: string,
    content: string,
    opts: { kind: "verse" | "fact" | "event"; idKey: string; subtitle?: string }
  ) => void;
}

function InspirationTab({ onPresent }: InspirationTabProps) {
  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => format(today, "EEEE, MMMM d, yyyy"), [today]);

  // Verse + fact rotation: start on today's deterministic pick, allow operator to browse next.
  const initialVerseIdx = useMemo(() => VERSES.indexOf(getVerseOfDay(today)), [today]);
  const initialFactIdx = useMemo(() => FACTS.indexOf(getFactOfDay(today)), [today]);
  const [verseIdx, setVerseIdx] = useState(initialVerseIdx);
  const [factIdx, setFactIdx] = useState(initialFactIdx);

  const verse: DailyVerse = VERSES[verseIdx];
  const fact: BibleFact = FACTS[factIdx];

  const upcoming = useMemo(() => getUpcomingEvents(10, today), [today]);
  const todayEvent = upcoming.find(ev =>
    ev.jsDate.getFullYear() === today.getFullYear() &&
    ev.jsDate.getMonth() === today.getMonth() &&
    ev.jsDate.getDate() === today.getDate()
  );

  return (
    <div className="space-y-5">
      {/* Today banner — shows the date and any liturgical observance falling today */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="inspiration-today-banner">
        <Sun className="w-4 h-4 text-amber-500" />
        <span>Today is</span>
        <span className="font-medium text-foreground">{todayLabel}</span>
        {todayEvent && (
          <Badge variant="secondary" className="ml-1 gap-1">
            <Sparkles className="w-3 h-3" /> {todayEvent.name}
          </Badge>
        )}
      </div>

      {/* Verse of the Day */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="card-verse-of-day">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/15 text-primary"><Quote className="w-4 h-4" /></div>
              <CardTitle className="text-base">Verse of the Day</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setVerseIdx(i => (i + 1) % VERSES.length)}
                data-testid="button-next-verse"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => onPresent(verse.reference, verse.text, { kind: "verse", idKey: verse.reference, subtitle: "Verse of the Day" })}
                data-testid="button-present-verse"
              >
                <Send className="w-3.5 h-3.5" /> Send to screen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <blockquote className="text-lg leading-relaxed font-serif text-foreground/90 italic border-l-4 border-primary/40 pl-4">
            &ldquo;{verse.text}&rdquo;
          </blockquote>
          <p className="mt-3 text-sm font-semibold text-primary text-right">— {verse.reference}</p>
        </CardContent>
      </Card>

      {/* Bible / Jesus / God facts */}
      <Card data-testid="card-bible-fact">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/15 text-amber-500"><Lightbulb className="w-4 h-4" /></div>
              <div>
                <CardTitle className="text-base">Did you know?</CardTitle>
                <CardDescription className="text-xs mt-0.5">Interesting facts about the Bible, Jesus, and God</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setFactIdx(i => (i + 1) % FACTS.length)}
                data-testid="button-next-fact"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => onPresent(fact.topic, fact.fact, { kind: "fact", idKey: `${factIdx}`, subtitle: "Bible Fact" })}
                data-testid="button-present-fact"
              >
                <Send className="w-3.5 h-3.5" /> Send to screen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="shrink-0 mt-0.5">{fact.topic}</Badge>
            <p className="text-sm leading-relaxed text-foreground/90">{fact.fact}</p>
          </div>
        </CardContent>
      </Card>

      {/* Christian liturgical calendar */}
      <Card data-testid="card-christian-calendar">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-violet-500/15 text-violet-500"><CalendarIcon className="w-4 h-4" /></div>
            <div>
              <CardTitle className="text-base">Christian Calendar</CardTitle>
              <CardDescription className="text-xs mt-0.5">Upcoming feasts and notable observances</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming dates.</p>
          ) : (
            <ul className="divide-y divide-border" data-testid="list-calendar-events">
              {upcoming.map((ev: ChristianEvent) => {
                const isToday = todayEvent?.date === ev.date;
                return (
                  <li
                    key={ev.date + ev.name}
                    className={`flex items-start gap-3 py-3 ${isToday ? "bg-primary/5 -mx-2 px-2 rounded-md" : ""}`}
                    data-testid={`event-${ev.name.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    <div className="shrink-0 w-16 text-center">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
                        {format(ev.jsDate, "MMM")}
                      </div>
                      <div className="text-xl font-bold leading-tight">{format(ev.jsDate, "d")}</div>
                      <div className="text-[10px] text-muted-foreground">{format(ev.jsDate, "yyyy")}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{ev.name}</h4>
                        {isToday && <Badge className="text-[10px] py-0 px-1.5 h-4">Today</Badge>}
                        {ev.kind === "movable" && !isToday && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">Movable</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ev.description}</p>
                      <p className="text-[11px] text-muted-foreground/80 mt-1">
                        {isToday ? "Today" : formatDistanceToNow(ev.jsDate, { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 gap-1.5 self-center"
                      onClick={() => onPresent(ev.name, `${format(ev.jsDate, "MMMM d, yyyy")}\n\n${ev.description}`, { kind: "event", idKey: `${ev.date}-${ev.name}`, subtitle: "Christian Calendar" })}
                      data-testid={`button-present-event-${ev.name.replace(/\s+/g, "-").toLowerCase()}`}
                      title={`Send "${ev.name}" to screen`}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NotesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useLocalStorage("wf-notes-search", "");
  const [createOpen, setCreateOpen] = useState(false);
  const [editNote, setEditNote] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [presentNote, setPresentNote] = useState<any | null>(null);
  const [presentFontSize, setPresentFontSize] = useLocalStorage<number>("wf-notes-present-font-size", 48);
  const [presentAlign, setPresentAlign] = useLocalStorage<"left" | "center" | "right">("wf-notes-present-align", "left");
  const [presentFont, setPresentFont] = useLocalStorage<string>("wf-notes-present-font", "Georgia");
  const [saving, setSaving] = useState(false);
  const { add: addRecent } = useRecentlyPresented();

  const { data: notes = [], isLoading } = useListNotes({ query: { queryKey: getListNotesQueryKey() } });
  const { data: screenState } = useGetScreenState({ query: { queryKey: getGetScreenStateQueryKey() } });

  const { mutate: createNote } = useCreateNote({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() }); setCreateOpen(false); setSaving(false); } }
  });
  const { mutate: updateNote } = useUpdateNote({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() }); setEditNote(null); setSaving(false); } }
  });
  const { mutate: deleteNote } = useDeleteNote({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() }); setDeleteId(null); } }
  });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }) }
  });

  const filteredNotes = notes.filter((n: any) =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.speaker.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (data: NoteFormData) => {
    setSaving(true);
    createNote({ data });
  };

  const handleEdit = (data: NoteFormData) => {
    if (!editNote) return;
    setSaving(true);
    updateNote({ id: editNote.id, data });
  };

  const handlePresent = (note: any, opts?: { fontSize?: number; alignment?: "left" | "center" | "right"; fontFamily?: string }) => {
    const baseStyle = screenState?.textStyle ?? { fontFamily: "Georgia", fontSize: 48, textColor: "#ffffff", alignment: "left" as const, animation: "fade_in" as const };
    const screenData = {
      isBlack: screenState?.isBlack ?? false,
      isClear: false,
      contentType: "custom_text" as const,
      title: note.title,
      content: note.content,
      textStyle: {
        ...baseStyle,
        fontSize: opts?.fontSize ?? baseStyle.fontSize ?? 48,
        alignment: opts?.alignment ?? baseStyle.alignment ?? "left",
        fontFamily: opts?.fontFamily ?? baseStyle.fontFamily ?? "Georgia",
      },
      background: screenState?.background ?? { type: "color", value: "#000000" },
      tickerEnabled: screenState?.tickerEnabled ?? false,
      // Always clear comparison mode when sending non-bible content (B3.5)
      comparisonMode: false,
    };
    updateScreen({ data: screenData });
    // Track in recently-presented (B3.6) — snapshot screenData so click-to-restore re-sends exactly.
    addRecent({
      id: `note-${note.id}`,
      type: "note",
      title: note.title,
      subtitle: note.speaker,
      payload: { noteId: note.id, screenData },
    });
    toast({ title: "Note sent to screen", description: note.title });
    setPresentNote(null);
  };

  /** Send a piece of inspiration content (verse / fact / calendar event) to the screen. */
  const presentInspiration = (
    title: string,
    content: string,
    opts: { kind: "verse" | "fact" | "event"; idKey: string; subtitle?: string; fontSize?: number; alignment?: "left" | "center" | "right" }
  ) => {
    const baseStyle = screenState?.textStyle ?? { fontFamily: "Georgia", fontSize: 48, textColor: "#ffffff", alignment: "center" as const, animation: "fade_in" as const };
    const screenData = {
      isBlack: screenState?.isBlack ?? false,
      isClear: false,
      contentType: "custom_text" as const,
      title,
      content,
      textStyle: {
        ...baseStyle,
        fontSize: opts.fontSize ?? 56,
        alignment: opts.alignment ?? "center",
        fontFamily: baseStyle.fontFamily ?? "Georgia",
      },
      background: screenState?.background ?? { type: "color", value: "#000000" },
      tickerEnabled: screenState?.tickerEnabled ?? false,
      comparisonMode: false,
    };
    updateScreen({ data: screenData });
    addRecent({
      id: `inspiration-${opts.kind}-${opts.idKey}`,
      type: "note",
      title,
      subtitle: opts.subtitle ?? (opts.kind === "verse" ? "Scripture" : opts.kind === "fact" ? "Bible Fact" : "Christian Calendar"),
      payload: { screenData },
    });
    toast({ title: "Sent to screen", description: title });
  };

  const [tab, setTab] = useLocalStorage<string>("wf-notes-tab", "notes");

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary"><BookOpen className="w-6 h-6" /></div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sermon Notes & Inspiration</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Write your sermon notes, then explore the verse of the day, Bible facts, and the Christian calendar.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="notes" data-testid="tab-sermon-notes" className="gap-2">
            <BookOpen className="w-4 h-4" /> Sermon Notes
          </TabsTrigger>
          <TabsTrigger value="inspiration" data-testid="tab-daily-inspiration" className="gap-2">
            <Sparkles className="w-4 h-4" /> Daily Inspiration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-5 mt-0">

      {/* Search + new note (sermon notes tab only) */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" className="pl-8 w-48" />
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Note</Button>
      </div>

      {/* Notes grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
          {search ? `No notes match "${search}"` : "No notes yet. Create one to get started."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note: any) => (
            <Card key={note.id} className="group flex flex-col hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base leading-snug">{note.title}</CardTitle>
                  <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditNote(note)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(note.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  {note.speaker} · {format(new Date(note.date), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-3">
                <p className="text-sm text-muted-foreground line-clamp-4 flex-1 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>

                {note.scriptures?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.scriptures.map((s: string) => (
                      <Badge key={s} variant="outline" className="text-xs gap-1">
                        <Tag className="w-2.5 h-2.5" />{s}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full gap-2 mt-auto"
                  onClick={() => setPresentNote(note)}
                >
                  <Send className="w-3.5 h-3.5" /> Present to screen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        </TabsContent>

        <TabsContent value="inspiration" className="space-y-5 mt-0">
          <InspirationTab onPresent={presentInspiration} />
        </TabsContent>
      </Tabs>

      {/* ── Create dialog ── */}
      <NoteFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        saving={saving}
      />

      {/* ── Edit dialog ── */}
      {editNote && (
        <NoteFormDialog
          open={!!editNote}
          onClose={() => setEditNote(null)}
          initial={{
            title: editNote.title,
            speaker: editNote.speaker,
            date: editNote.date,
            content: editNote.content,
            scriptures: editNote.scriptures ?? [],
          }}
          onSave={handleEdit}
          saving={saving}
        />
      )}

      {/* ── Delete confirmation ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteNote({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Present confirmation ── */}
      <Dialog open={!!presentNote} onOpenChange={v => !v && setPresentNote(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Present to screen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">This will send the full note content to the presentation screen.</p>
            <div className="bg-muted/40 rounded-lg p-3 max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-primary mb-1">{presentNote?.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{presentNote?.content}</p>
            </div>

            {/* Styling controls */}
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Style on screen</p>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Text size</label>
                <div className="grid grid-cols-4 gap-1">
                  {([
                    { label: "S", v: 32 },
                    { label: "M", v: 48 },
                    { label: "L", v: 64 },
                    { label: "XL", v: 88 },
                  ] as const).map(opt => (
                    <button
                      key={opt.v}
                      data-testid={`button-notes-size-${opt.label.toLowerCase()}`}
                      onClick={() => setPresentFontSize(opt.v)}
                      className={`py-1.5 rounded-md text-xs border transition-colors ${presentFontSize === opt.v ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/60"}`}
                    >
                      {opt.label} <span className="opacity-60">({opt.v})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Alignment</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["left", "center", "right"] as const).map(a => (
                    <button
                      key={a}
                      data-testid={`button-notes-align-${a}`}
                      onClick={() => setPresentAlign(a)}
                      className={`py-1.5 rounded-md text-xs border transition-colors capitalize ${presentAlign === a ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/60"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Font</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["Georgia", "Inter", "Playfair Display"] as const).map(f => (
                    <button
                      key={f}
                      data-testid={`button-notes-font-${f.toLowerCase().replace(/\s+/g, "-")}`}
                      onClick={() => setPresentFont(f)}
                      className={`py-1.5 rounded-md text-xs border transition-colors truncate ${presentFont === f ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/60"}`}
                      style={{ fontFamily: f }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Tip: Use Stage Controls in the sidebar to fine-tune zoom and position after sending.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPresentNote(null)}>Cancel</Button>
            <Button
              data-testid="button-notes-send-to-screen"
              onClick={() => handlePresent(presentNote, { fontSize: presentFontSize, alignment: presentAlign, fontFamily: presentFont })}
              className="gap-2"
            >
              <Send className="w-4 h-4" /> Send to screen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
