import { useMemo, useState } from "react";
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
  GraduationCap, Send, Search, BookOpen, MessageCircle, Activity, Heart,
  ChevronRight, Sparkles, X, Users, Baby, UserCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRecentlyPresented } from "@/hooks/use-recently-presented";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  LESSONS, AGE_GROUPS, getThemes,
  type SundaySchoolLesson, type AgeGroup,
} from "@/lib/sunday-school";

const AGE_ICONS: Record<AgeGroup, typeof Baby> = {
  Children: Baby,
  Youth: Users,
  Adult: UserCircle,
};

const AGE_COLOURS: Record<AgeGroup, string> = {
  Children: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  Youth: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  Adult: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export default function SundaySchoolPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add: addRecent } = useRecentlyPresented();
  const { data: screenState } = useGetScreenState({ query: { queryKey: getGetScreenStateQueryKey() } });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }) }
  });

  const [search, setSearch] = useLocalStorage("wf-ss-search", "");
  const [ageFilter, setAgeFilter] = useLocalStorage<AgeGroup | "All">("wf-ss-age", "All");
  const [themeFilter, setThemeFilter] = useLocalStorage<string>("wf-ss-theme", "All");
  const [selectedId, setSelectedId] = useLocalStorage<string | null>("wf-ss-selected", LESSONS[0].id);

  const themes = useMemo(() => getThemes(), []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return LESSONS.filter(l => {
      if (ageFilter !== "All" && l.ageGroup !== ageFilter) return false;
      if (themeFilter !== "All" && l.theme !== themeFilter) return false;
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        l.theme.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        l.keyVerse.reference.toLowerCase().includes(q)
      );
    });
  }, [search, ageFilter, themeFilter]);

  const selected: SundaySchoolLesson | undefined =
    LESSONS.find(l => l.id === selectedId) ?? filtered[0];

  /** Send a piece of a Sunday School lesson to the projection screen. */
  const presentLesson = (
    title: string,
    content: string,
    opts: { lessonId: string; sectionKey: string; subtitle?: string; alignment?: "left" | "center" }
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
        fontSize: 52,
        alignment: opts.alignment ?? "center",
        fontFamily: baseStyle.fontFamily ?? "Georgia",
      },
      background: screenState?.background ?? { type: "color", value: "#000000" },
      tickerEnabled: screenState?.tickerEnabled ?? false,
      comparisonMode: false,
    };
    updateScreen({ data: screenData });
    addRecent({
      id: `ss-${opts.lessonId}-${opts.sectionKey}`,
      type: "note",
      title,
      subtitle: opts.subtitle ?? "Sunday School",
      payload: { screenData },
    });
    toast({ title: "Sent to screen", description: title });
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Sunday School Teachings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Ready-to-use lessons for Children, Youth, and Adult classes — pick a lesson and send each section to the screen.
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:flex">
          {LESSONS.length} lessons
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="ss-search-input" className="sr-only">
                Search Sunday School lessons
              </label>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="ss-search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search lessons by title, theme, or verse…"
                className="pl-8"
                data-testid="input-ss-search"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-clear-ss-search"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Age group buttons */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground self-center mr-1">Age:</span>
            <Button
              size="sm"
              variant={ageFilter === "All" ? "default" : "outline"}
              onClick={() => setAgeFilter("All")}
              data-testid="button-age-all"
            >
              All
            </Button>
            {AGE_GROUPS.map(g => {
              const Icon = AGE_ICONS[g];
              return (
                <Button
                  key={g}
                  size="sm"
                  variant={ageFilter === g ? "default" : "outline"}
                  onClick={() => setAgeFilter(g)}
                  className="gap-1.5"
                  data-testid={`button-age-${g.toLowerCase()}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {g}
                </Button>
              );
            })}
          </div>

          {/* Theme pills */}
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter lessons by theme"
          >
            <span className="text-xs uppercase tracking-wider text-muted-foreground self-center mr-1">Theme:</span>
            <button
              type="button"
              onClick={() => setThemeFilter("All")}
              aria-pressed={themeFilter === "All"}
              data-testid="badge-theme-all"
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Badge
                variant={themeFilter === "All" ? "default" : "outline"}
                className="cursor-pointer"
              >
                All
              </Badge>
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
                <Badge
                  variant={themeFilter === t ? "default" : "outline"}
                  className="cursor-pointer"
                >
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
        <Card className="lg:max-h-[calc(100vh-340px)] flex flex-col">
          <CardHeader className="pb-2">
            <CardDescription>
              {filtered.length} of {LESSONS.length} lessons
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-[420px] lg:h-full">
              <div className="px-4 pb-4 space-y-2" data-testid="ss-lesson-list">
                {filtered.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No lessons match your filters.
                  </div>
                ) : (
                  filtered.map(l => {
                    const Icon = AGE_ICONS[l.ageGroup];
                    const active = selected?.id === l.id;
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
                          <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm leading-snug">{l.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {l.keyVerse.reference}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0 px-1.5 ${AGE_COLOURS[l.ageGroup]}`}
                              >
                                {l.ageGroup}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                {l.theme}
                              </Badge>
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
          <div className="space-y-4" data-testid="ss-lesson-detail">
            {/* Title & key verse */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={AGE_COLOURS[selected.ageGroup]}>
                        {selected.ageGroup}
                      </Badge>
                      <Badge variant="outline">{selected.theme}</Badge>
                    </div>
                    <CardTitle className="text-2xl">{selected.title}</CardTitle>
                    <CardDescription className="mt-1.5">{selected.summary}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Key Verse
                  </div>
                  <blockquote className="text-base italic leading-relaxed">
                    "{selected.keyVerse.text}"
                  </blockquote>
                  <div className="text-sm text-muted-foreground mt-1.5">
                    — {selected.keyVerse.reference}
                  </div>
                  <Button
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() =>
                      presentLesson(selected.keyVerse.reference, selected.keyVerse.text, {
                        lessonId: selected.id,
                        sectionKey: "verse",
                        subtitle: `${selected.title} — Key Verse`,
                      })
                    }
                    data-testid="button-present-key-verse"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Key Verse to Screen
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Teaching points */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Teaching Points
                </CardTitle>
                <CardDescription>Send each point to the screen as you teach it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.points.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border p-3"
                    data-testid={`point-${i}`}
                  >
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
                            presentLesson(p.heading, p.body, {
                              lessonId: selected.id,
                              sectionKey: `point-${i}`,
                              subtitle: `${selected.title} — Point ${i + 1}`,
                              alignment: "left",
                            })
                          }
                          data-testid={`button-present-point-${i}`}
                        >
                          <Send className="w-3.5 h-3.5" /> Send to screen
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
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Discussion Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.discussionQuestions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="text-sm font-semibold text-muted-foreground">Q{i + 1}.</div>
                    <div className="flex-1 text-sm leading-relaxed">{q}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Send discussion question ${i + 1} to screen`}
                      onClick={() =>
                        presentLesson(`Discussion ${i + 1}`, q, {
                          lessonId: selected.id,
                          sectionKey: `q-${i}`,
                          subtitle: `${selected.title} — Discussion`,
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
                    presentLesson(
                      "Discussion Questions",
                      selected.discussionQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n\n"),
                      {
                        lessonId: selected.id,
                        sectionKey: "all-questions",
                        subtitle: `${selected.title} — Discussion`,
                        alignment: "left",
                      }
                    )
                  }
                  data-testid="button-present-all-questions"
                >
                  <Send className="w-3.5 h-3.5" /> Send All Questions to Screen
                </Button>
              </CardContent>
            </Card>

            {/* Activity & Prayer */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-primary" />
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
                      presentLesson("Activity", selected.activity, {
                        lessonId: selected.id,
                        sectionKey: "activity",
                        subtitle: `${selected.title} — Activity`,
                        alignment: "left",
                      })
                    }
                    data-testid="button-present-activity"
                  >
                    <Send className="w-3.5 h-3.5" /> Send to screen
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="w-5 h-5 text-primary" />
                    Closing Prayer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic leading-relaxed">{selected.prayer}</p>
                  <Button
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() =>
                      presentLesson("Closing Prayer", selected.prayer, {
                        lessonId: selected.id,
                        sectionKey: "prayer",
                        subtitle: `${selected.title} — Prayer`,
                      })
                    }
                    data-testid="button-present-prayer"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Prayer to Screen
                  </Button>
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
                    <BookOpen className="w-3 h-3" /> Memorise this week
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="flex items-center justify-center min-h-[400px]">
            <CardContent className="text-center text-muted-foreground">
              Select a lesson from the list to see its content.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
