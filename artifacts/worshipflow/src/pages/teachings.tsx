import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  GraduationCap, Send, Search, BookOpen, MessageCircle, Activity, Heart,
  ChevronRight, Sparkles, X, Users, Baby, UserCircle, HeartHandshake, Shield,
  Smile, Cross, Droplets, Wine, HandHeart, Plus, Pencil, Trash2, Star, Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRecentlyPresented } from "@/hooks/use-recently-presented";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  TEACHINGS, TEACHING_CATEGORIES, getThemes,
  type Teaching, type TeachingCategory,
} from "@/lib/teachings";
import {
  loadCustomTeachings, addCustomTeaching, updateCustomTeaching,
  deleteCustomTeaching, type CustomTeaching,
} from "@/lib/custom-teachings";
import { TeachingFormDialog } from "@/components/teaching-form-dialog";

const CAT_ICONS: Record<TeachingCategory, typeof Baby> = {
  "Sunday School": Baby,
  "Youth": Users,
  "Mothers": HeartHandshake,
  "Fathers": Shield,
  "Adults": UserCircle,
  "Happiness": Smile,
  "Funeral": Cross,
  "Baptism": Droplets,
  "Holy Communion": Wine,
  "Marriage": Heart,
  "Healing": HandHeart,
};

const CAT_COLOURS: Record<TeachingCategory, string> = {
  "Sunday School": "bg-pink-500/15 text-pink-300 border-pink-500/30",
  "Youth": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "Mothers": "bg-rose-500/15 text-rose-300 border-rose-500/30",
  "Fathers": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Adults": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "Happiness": "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  "Funeral": "bg-slate-500/15 text-slate-300 border-slate-500/30",
  "Baptism": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "Holy Communion": "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "Marriage": "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  "Healing": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export default function TeachingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add: addRecent } = useRecentlyPresented();
  const { data: screenState } = useGetScreenState({ query: { queryKey: getGetScreenStateQueryKey() } });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }) }
  });

  const [search, setSearch] = useLocalStorage("wf-teach-search", "");
  const [catFilter, setCatFilter] = useLocalStorage<TeachingCategory | "All">("wf-teach-cat", "All");
  const [themeFilter, setThemeFilter] = useLocalStorage<string>("wf-teach-theme", "All");
  const [selectedId, setSelectedId] = useLocalStorage<string | null>("wf-teach-selected", TEACHINGS[0]?.id ?? null);

  // Custom teachings live in localStorage. We keep a reactive copy that re-reads
  // whenever a save / delete happens (custom event fires from the helper functions).
  const [customTeachings, setCustomTeachings] = useState<CustomTeaching[]>(() => loadCustomTeachings());
  useEffect(() => {
    const onChange = () => setCustomTeachings(loadCustomTeachings());
    window.addEventListener("wf-custom-teachings-changed", onChange);
    window.addEventListener("storage", onChange); // cross-tab
    return () => {
      window.removeEventListener("wf-custom-teachings-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // Built-in + custom merged. Custom appear first so they're easy to find.
  const allTeachings: Teaching[] = useMemo(() =>
    [...customTeachings, ...TEACHINGS],
    [customTeachings],
  );
  const customIds = useMemo(() => new Set(customTeachings.map(t => t.id)), [customTeachings]);

  // Form / delete dialog state.
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeaching, setEditingTeaching] = useState<Teaching | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const themes = useMemo(() => getThemes(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTeachings.filter(l => {
      if (catFilter !== "All" && l.category !== catFilter) return false;
      if (themeFilter !== "All" && l.theme !== themeFilter) return false;
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        l.theme.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        l.keyVerse.reference.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
      );
    });
  }, [allTeachings, search, catFilter, themeFilter]);

  const selected: Teaching | undefined =
    allTeachings.find(l => l.id === selectedId) ?? filtered[0];

  /** Call the api-server's AI proxy to draft a teaching. Returns the draft for the form. */
  const generateWithAI = async (topic: string, category: TeachingCategory): Promise<Omit<Teaching, "id">> => {
    const res = await fetch(`${import.meta.env.BASE_URL}api/teachings/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, category }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Server returned ${res.status}`);
    }
    return res.json();
  };

  const openNewTeachingDialog = () => {
    setEditingTeaching(undefined);
    setFormOpen(true);
  };

  const openEditTeachingDialog = (t: Teaching) => {
    setEditingTeaching(t);
    setFormOpen(true);
  };

  const handleSaveTeaching = (data: Omit<Teaching, "id">) => {
    if (editingTeaching && customIds.has(editingTeaching.id)) {
      updateCustomTeaching(editingTeaching.id, data);
      toast({ title: "Teaching updated", description: data.title });
    } else {
      const created = addCustomTeaching(data);
      setSelectedId(created.id);
      toast({ title: "Teaching added", description: data.title });
    }
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    deleteCustomTeaching(deletingId);
    if (selectedId === deletingId) setSelectedId(TEACHINGS[0]?.id ?? null);
    setDeletingId(null);
    toast({ title: "Teaching deleted" });
  };

  const CATEGORY_GRADIENTS: Record<string, string> = {
    "Sunday School": "linear-gradient(135deg, #be185d 0%, #9d174d 50%, #500724 100%)",
    "Youth":         "linear-gradient(135deg, #0369a1 0%, #075985 50%, #0c4a6e 100%)",
    "Mothers":       "linear-gradient(135deg, #be123c 0%, #9f1239 50%, #4c0519 100%)",
    "Fathers":       "linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)",
    "Adults":        "linear-gradient(135deg, #b45309 0%, #92400e 50%, #451a03 100%)",
    "Happiness":     "linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%)",
    "Funeral":       "linear-gradient(135deg, #374151 0%, #1f2937 50%, #111827 100%)",
    "Baptism":       "linear-gradient(135deg, #0e7490 0%, #155e75 50%, #083344 100%)",
    "Holy Communion":"linear-gradient(135deg, #5b21b6 0%, #4c1d95 50%, #2e1065 100%)",
    "Marriage":      "linear-gradient(135deg, #c026d3 0%, #a21caf 50%, #701a75 100%)",
    "Healing":       "linear-gradient(135deg, #047857 0%, #065f46 50%, #022c22 100%)",
  };

  /** Send a piece of a teaching to the projection screen with a clear category label. */
  const presentTeaching = (
    title: string,
    bodyContent: string,
    opts: { lessonId: string; sectionKey: string; categoryLabel: string; alignment?: "left" | "center"; useGraphic?: boolean }
  ) => {
    const baseStyle = screenState?.textStyle ?? { fontFamily: "Georgia", fontSize: 48, textColor: "#ffffff", alignment: "center" as const, animation: "fade_in" as const };
    const screenContent = `${opts.categoryLabel}\n\n${bodyContent}`;
    const category = (opts.categoryLabel ?? "").split(" · ")[0];
    const background = opts.useGraphic
      ? { type: "gradient" as const, value: CATEGORY_GRADIENTS[category] ?? "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1c1665 100%)", overlay: 0 }
      : (screenState?.background ?? { type: "color" as const, value: "#000000" });
    const screenData = {
      isBlack: screenState?.isBlack ?? false,
      isClear: false,
      contentType: "custom_text" as const,
      title,
      content: screenContent,
      textStyle: {
        ...baseStyle,
        fontSize: 48,
        alignment: opts.alignment ?? "center",
        fontFamily: baseStyle.fontFamily ?? "Georgia",
      },
      background,
      tickerEnabled: screenState?.tickerEnabled ?? false,
      comparisonMode: false,
    };
    updateScreen({ data: screenData });
    addRecent({
      id: `teach-${opts.lessonId}-${opts.sectionKey}`,
      type: "note",
      title,
      subtitle: opts.categoryLabel,
      payload: { screenData },
    });
    toast({ title: opts.useGraphic ? "Graphic sent to screen" : "Sent to screen", description: title });
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Teachings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Ready-to-use lessons for every audience and occasion — pick a category, open a lesson, and send each section to the screen.
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:flex">
          {allTeachings.length} lessons
        </Badge>
        <Button
          onClick={openNewTeachingDialog}
          className="gap-2"
          data-testid="button-add-teaching"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Add Teaching
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="teach-search-input" className="sr-only">Search teachings</label>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="teach-search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search teachings by title, theme, verse, or category…"
                className="pl-8"
                data-testid="input-teach-search"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-clear-teach-search"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Category buttons */}
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter teachings by category"
          >
            <span className="text-xs uppercase tracking-wider text-muted-foreground self-center mr-1">
              Category:
            </span>
            <Button
              size="sm"
              variant={catFilter === "All" ? "default" : "outline"}
              onClick={() => setCatFilter("All")}
              aria-pressed={catFilter === "All"}
              data-testid="button-cat-all"
            >
              All
            </Button>
            {TEACHING_CATEGORIES.map(c => {
              const Icon = CAT_ICONS[c];
              return (
                <Button
                  key={c}
                  size="sm"
                  variant={catFilter === c ? "default" : "outline"}
                  onClick={() => setCatFilter(c)}
                  aria-pressed={catFilter === c}
                  className="gap-1.5"
                  data-testid={`button-cat-${c.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {c}
                </Button>
              );
            })}
          </div>

          {/* Theme pills */}
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter teachings by theme"
          >
            <span className="text-xs uppercase tracking-wider text-muted-foreground self-center mr-1">
              Theme:
            </span>
            <button
              type="button"
              onClick={() => setThemeFilter("All")}
              aria-pressed={themeFilter === "All"}
              data-testid="badge-theme-all"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Badge variant={themeFilter === "All" ? "default" : "outline"} className="cursor-pointer">All</Badge>
            </button>
            {themes.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setThemeFilter(t)}
                aria-pressed={themeFilter === t}
                data-testid={`badge-theme-${t.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Badge variant={themeFilter === t ? "default" : "outline"} className="cursor-pointer">
                  {t}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Master / Detail */}
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Lesson list */}
        <Card className="lg:max-h-[calc(100vh-380px)] flex flex-col">
          <CardHeader className="pb-2">
            <CardDescription>
              {filtered.length} of {allTeachings.length} lessons
              {customTeachings.length > 0 && (
                <> · {customTeachings.length} custom</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-[420px] lg:h-full">
              <div className="px-4 pb-4 space-y-2" data-testid="teach-lesson-list">
                {filtered.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No teachings match your filters.
                  </div>
                ) : (
                  filtered.map(l => {
                    const Icon = CAT_ICONS[l.category];
                    const active = selected?.id === l.id;
                    const isCustom = customIds.has(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() => setSelectedId(l.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40 hover:bg-muted/50"
                        }`}
                        data-testid={`button-lesson-${l.id}`}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm leading-snug flex items-center gap-1.5">
                              {l.title}
                              {isCustom && (
                                <Star className="w-3 h-3 text-amber-400 shrink-0" aria-label="Custom teaching" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {l.keyVerse.reference}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${CAT_COLOURS[l.category]}`}>
                                {l.category}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                {l.theme}
                              </Badge>
                              {isCustom && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/15 text-amber-300 border-amber-500/30">
                                  Custom
                                </Badge>
                              )}
                            </div>
                          </div>
                          {active && <ChevronRight className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Lesson detail */}
        {selected ? (
          <div className="space-y-4" data-testid="teach-lesson-detail">
            {/* Title & key verse */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={CAT_COLOURS[selected.category]}>
                        {selected.category}
                      </Badge>
                      <Badge variant="outline">{selected.theme}</Badge>
                      {customIds.has(selected.id) && (
                        <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 gap-1">
                          <Star className="w-3 h-3" aria-hidden="true" /> Custom
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl">{selected.title}</CardTitle>
                    <CardDescription className="mt-1.5">{selected.summary}</CardDescription>
                  </div>
                  {customIds.has(selected.id) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditTeachingDialog(selected)}
                        className="gap-1.5"
                        data-testid="button-edit-teaching"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingId(selected.id)}
                        className="gap-1.5 text-rose-300 hover:text-rose-200 border-rose-500/40 hover:border-rose-500/60"
                        data-testid="button-delete-teaching"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-1.5">
                    <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> Key Verse
                  </div>
                  <blockquote className="text-base italic leading-relaxed">
                    "{selected.keyVerse.text}"
                  </blockquote>
                  <div className="text-sm text-muted-foreground mt-1.5">
                    — {selected.keyVerse.reference}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() =>
                        presentTeaching(
                          selected.keyVerse.reference,
                          `"${selected.keyVerse.text}"\n\n— ${selected.keyVerse.reference}`,
                          {
                            lessonId: selected.id,
                            sectionKey: "verse",
                            categoryLabel: `${selected.category} · ${selected.title} — Key Verse`,
                          }
                        )
                      }
                      data-testid="button-present-key-verse"
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" /> Send to screen
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        presentTeaching(
                          selected.keyVerse.reference,
                          `"${selected.keyVerse.text}"\n\n— ${selected.keyVerse.reference}`,
                          {
                            lessonId: selected.id,
                            sectionKey: "verse-graphic",
                            categoryLabel: `${selected.category} · ${selected.title} — Key Verse`,
                            useGraphic: true,
                          }
                        )
                      }
                      data-testid="button-present-key-verse-graphic"
                    >
                      <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" /> Send as graphic
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Teaching points */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
                  Teaching Points
                </CardTitle>
                <CardDescription>Send each point to the screen as you teach it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.points.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border p-3" data-testid={`point-${i}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold leading-snug">{p.heading}</div>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{p.body}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 gap-1.5"
                          onClick={() =>
                            presentTeaching(p.heading, `${p.heading}\n\n${p.body}`, {
                              lessonId: selected.id,
                              sectionKey: `point-${i}`,
                              categoryLabel: `${selected.category} · ${selected.title} — Point ${i + 1}`,
                              alignment: "left",
                            })
                          }
                          data-testid={`button-present-point-${i}`}
                        >
                          <Send className="w-3.5 h-3.5" aria-hidden="true" /> Send to screen
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Discussion questions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="w-5 h-5 text-primary" aria-hidden="true" />
                  Discussion Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.discussionQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <div className="text-sm font-semibold text-muted-foreground">Q{i + 1}.</div>
                    <div className="flex-1 text-sm leading-relaxed">{q}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Send discussion question ${i + 1} to screen`}
                      onClick={() =>
                        presentTeaching(`Discussion ${i + 1}`, `Discussion Question ${i + 1}\n\n${q}`, {
                          lessonId: selected.id,
                          sectionKey: `q-${i}`,
                          categoryLabel: `${selected.category} · ${selected.title} — Discussion`,
                        })
                      }
                      data-testid={`button-present-question-${i}`}
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 gap-2 w-full"
                  onClick={() =>
                    presentTeaching(
                      "Discussion Questions",
                      selected.discussionQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n\n"),
                      {
                        lessonId: selected.id,
                        sectionKey: "all-questions",
                        categoryLabel: `${selected.category} · ${selected.title} — Discussion Questions`,
                        alignment: "left",
                      }
                    )
                  }
                  data-testid="button-present-all-questions"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" /> Send All Questions to Screen
                </Button>
              </CardContent>
            </Card>

            {/* Activity & Prayer */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-primary" aria-hidden="true" />
                    Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selected.activity}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 gap-2"
                    onClick={() =>
                      presentTeaching("Activity", `Activity\n\n${selected.activity}`, {
                        lessonId: selected.id,
                        sectionKey: "activity",
                        categoryLabel: `${selected.category} · ${selected.title} — Activity`,
                        alignment: "left",
                      })
                    }
                    data-testid="button-present-activity"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" /> Send to screen
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="w-5 h-5 text-primary" aria-hidden="true" />
                    Closing Prayer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic leading-relaxed">{selected.prayer}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      presentTeaching("Closing Prayer", `Closing Prayer\n\n${selected.prayer}`, {
                        lessonId: selected.id,
                        sectionKey: "prayer",
                        categoryLabel: `${selected.category} · ${selected.title} — Prayer`,
                      })
                    }
                    data-testid="button-present-prayer"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" /> Send Prayer to Screen
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      presentTeaching("Closing Prayer", `Closing Prayer\n\n${selected.prayer}`, {
                        lessonId: selected.id,
                        sectionKey: "prayer-graphic",
                        categoryLabel: `${selected.category} · ${selected.title} — Prayer`,
                        useGraphic: true,
                      })
                    }
                    data-testid="button-present-prayer-graphic"
                  >
                    <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" /> Send as graphic
                  </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {selected.memoryVerse && (
              <Card>
                <CardContent className="pt-5 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Memory Verse
                    </div>
                    <div className="font-semibold mt-0.5">{selected.memoryVerse}</div>
                  </div>
                  <Badge variant="outline" className="gap-1.5">
                    <BookOpen className="w-3 h-3" aria-hidden="true" /> Memorise this week
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="flex items-center justify-center min-h-[400px]">
            <CardContent className="text-center text-muted-foreground">
              Select a teaching from the list to see its content.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add / Edit dialog (manual + AI generation) */}
      <TeachingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editingTeaching}
        onSave={handleSaveTeaching}
        onGenerate={generateWithAI}
        title={editingTeaching ? "Edit Teaching" : "New Teaching"}
      />

      {/* Delete confirm */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent data-testid="dialog-delete-teaching">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this teaching?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your custom teaching from this device. Built-in teachings are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
