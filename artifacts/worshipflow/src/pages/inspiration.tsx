import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Sun, Calendar as CalendarIcon, ChevronRight, Lightbulb, Quote, Image as ImageIcon } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRecentlyPresented } from "@/hooks/use-recently-presented";
import {
  VERSES, FACTS, getVerseOfDay, getFactOfDay, getUpcomingEvents,
  type DailyVerse, type BibleFact, type ChristianEvent,
} from "@/lib/inspiration";

export default function InspirationPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add: addRecent } = useRecentlyPresented();
  const { data: screenState } = useGetScreenState({ query: { queryKey: getGetScreenStateQueryKey() } });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }) }
  });

  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => format(today, "EEEE, MMMM d, yyyy"), [today]);

  const initialVerseIdx = useMemo(() => VERSES.indexOf(getVerseOfDay(today)), [today]);
  const initialFactIdx = useMemo(() => FACTS.indexOf(getFactOfDay(today)), [today]);
  const [verseIdx, setVerseIdx] = useState(initialVerseIdx);
  const [factIdx, setFactIdx] = useState(initialFactIdx);

  const verse: DailyVerse = VERSES[verseIdx];
  const fact: BibleFact = FACTS[factIdx];

  const upcoming = useMemo(() => getUpcomingEvents(12, today), [today]);
  const todayEvent = upcoming.find(ev =>
    ev.jsDate.getFullYear() === today.getFullYear() &&
    ev.jsDate.getMonth() === today.getMonth() &&
    ev.jsDate.getDate() === today.getDate()
  );

  const INSP_GRADIENTS: Record<"verse" | "fact" | "event", string> = {
    verse: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1a237e 100%)",
    fact:  "linear-gradient(135deg, #78350f 0%, #92400e 50%, #451a03 100%)",
    event: "linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #3b0764 100%)",
  };

  /** Send a piece of inspiration content to the projection screen.
   *  The category label (e.g. "Verse of the Day") is prepended to the content
   *  so the audience clearly sees what they are looking at on screen. */
  const presentInspiration = (
    title: string,
    content: string,
    opts: { kind: "verse" | "fact" | "event"; idKey: string; subtitle?: string; useGraphic?: boolean }
  ) => {
    const kindLabel =
      opts.kind === "verse" ? "Verse of the Day"
      : opts.kind === "fact" ? "Did You Know?"
      : "Christian Calendar";
    const baseStyle = screenState?.textStyle ?? { fontFamily: "Georgia", fontSize: 48, textColor: "#ffffff", alignment: "center" as const, animation: "fade_in" as const };
    const screenContent = `${kindLabel}\n\n${content}`;
    const background = opts.useGraphic
      ? { type: "gradient" as const, value: INSP_GRADIENTS[opts.kind], overlay: 0 }
      : (screenState?.background ?? { type: "color" as const, value: "#000000" });
    const screenData = {
      isBlack: screenState?.isBlack ?? false,
      isClear: false,
      contentType: "custom_text" as const,
      title,
      content: screenContent,
      textStyle: {
        ...baseStyle,
        fontSize: 56,
        alignment: "center" as const,
        fontFamily: baseStyle.fontFamily ?? "Georgia",
      },
      background,
      tickerEnabled: screenState?.tickerEnabled ?? false,
      comparisonMode: false,
    };
    updateScreen({ data: screenData });
    addRecent({
      id: `inspiration-${opts.kind}-${opts.idKey}`,
      type: "note",
      title,
      subtitle: opts.subtitle ?? kindLabel,
      payload: { screenData },
    });
    toast({ title: opts.useGraphic ? "Graphic sent to screen" : "Sent to screen", description: `${kindLabel} — ${title}` });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary"><Sparkles className="w-6 h-6" /></div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Inspiration</h1>
          <p className="text-muted-foreground text-sm mt-0.5">A verse for today, interesting facts about the Bible, and the Christian calendar.</p>
        </div>
      </div>

      {/* Today banner */}
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
                variant="outline"
                className="gap-1.5"
                onClick={() => presentInspiration(verse.reference, `"${verse.text}"\n\n— ${verse.reference}`, { kind: "verse", idKey: verse.reference, subtitle: "Verse of the Day" })}
                data-testid="button-present-verse"
              >
                <Send className="w-3.5 h-3.5" /> Send to screen
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => presentInspiration(verse.reference, `"${verse.text}"\n\n— ${verse.reference}`, { kind: "verse", idKey: verse.reference, subtitle: "Verse of the Day", useGraphic: true })}
                data-testid="button-present-verse-graphic"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Send as graphic
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
                variant="outline"
                className="gap-1.5"
                onClick={() => presentInspiration(fact.topic, `${fact.topic}\n\n${fact.fact}`, { kind: "fact", idKey: `${factIdx}`, subtitle: "Did You Know?" })}
                data-testid="button-present-fact"
              >
                <Send className="w-3.5 h-3.5" /> Send to screen
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => presentInspiration(fact.topic, `${fact.topic}\n\n${fact.fact}`, { kind: "fact", idKey: `${factIdx}`, subtitle: "Did You Know?", useGraphic: true })}
                data-testid="button-present-fact-graphic"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Send as graphic
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
                      onClick={() => presentInspiration(ev.name, `${ev.name}\n${format(ev.jsDate, "MMMM d, yyyy")}\n\n${ev.description}`, { kind: "event", idKey: `${ev.date}-${ev.name}`, subtitle: "Christian Calendar" })}
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
