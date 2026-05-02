import { useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookOpen, Plus, Trash2, Edit, Send, Search, X, Tag } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
    updateScreen({
      data: {
        isBlack: screenState?.isBlack ?? false,
        isClear: false,
        contentType: "custom_text",
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
      },
    });
    toast({ title: "Note sent to screen", description: note.title });
    setPresentNote(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary"><BookOpen className="w-6 h-6" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sermon Notes</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Write notes and present them to the screen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" className="pl-8 w-48" />
          </div>
          <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Note</Button>
        </div>
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
