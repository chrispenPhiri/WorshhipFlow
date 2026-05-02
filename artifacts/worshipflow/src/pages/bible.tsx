import { useState } from "react";
import { BIBLE_BOOKS, BIBLE_TRANSLATIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Book, ChevronLeft, ChevronRight, Cast, CastIcon, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BibleVerse {
  verse: number;
  text: string;
}

interface BibleResult {
  reference: string;
  verses: BibleVerse[];
  fullText: string;
}

export default function BiblePage() {
  const [translation, setTranslation] = useState("KJV");
  const [book, setBook] = useState("John");
  const [chapter, setChapter] = useState("3");
  const [fromVerse, setFromVerse] = useState("16");
  const [toVerse, setToVerse] = useState("17");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BibleResult | null>(null);
  const [currentVerseIdx, setCurrentVerseIdx] = useState(0);
  const [showNumbers, setShowNumbers] = useState(true);
  const [sendMode, setSendMode] = useState<"all" | "one">("one");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: screenState } = useGetScreenState({ query: { queryKey: getGetScreenStateQueryKey() } });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
      onError: () => toast({ title: "Failed to send", variant: "destructive" }),
    }
  });

  const safeBase = {
    isBlack: screenState?.isBlack ?? false,
    isClear: false,
    contentType: "verse" as const,
    tickerEnabled: screenState?.tickerEnabled ?? false,
    tickerText: screenState?.tickerText ?? undefined,
  };

  const handleFetch = async () => {
    setLoading(true);
    try {
      const to = toVerse || fromVerse;
      const res = await fetch(
        `https://bible-api.com/${encodeURIComponent(book)}+${chapter}:${fromVerse}-${to}?translation=${translation.toLowerCase()}`
      );
      const data = await res.json();
      if (data.verses?.length) {
        setResult({
          reference: data.reference,
          verses: data.verses.map((v: any) => ({ verse: v.verse, text: v.text.trim() })),
          fullText: data.verses.map((v: any) => (showNumbers ? `${v.verse} ${v.text.trim()}` : v.text.trim())).join("\n"),
        });
        setCurrentVerseIdx(0);
      } else {
        toast({ title: "No verses found", description: "Check the book/chapter/verse and try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Fetch failed", description: "Could not reach the Bible API. Check your connection.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const buildVerseText = (v: BibleVerse) =>
    showNumbers ? `${v.verse} ${v.text}` : v.text;

  const buildAllText = (verses: BibleVerse[]) =>
    verses.map(buildVerseText).join("\n");

  const sendVerse = (verses: BibleVerse[], ref: string) => {
    const text = sendMode === "all" ? buildAllText(verses) : buildVerseText(verses[0]);
    const title = sendMode === "all" ? ref : `${ref.split(":")[0]}:${verses[0].verse}`;
    updateScreen({
      data: {
        ...safeBase,
        title,
        content: text,
        textStyle: screenState?.textStyle ?? {
          fontFamily: "Georgia",
          fontSize: 64,
          textColor: "#ffffff",
          alignment: "center",
          animation: "fade_in",
        },
        background: screenState?.background ?? { type: "color", value: "#000000" },
      },
    });
    toast({ title: "Sent to screen", description: title });
  };

  const currentVerse = result?.verses[currentVerseIdx];
  const total = result?.verses.length ?? 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <Book className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bible Passage</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Look up and send scripture to the screen</p>
        </div>
      </div>

      {/* Lookup form */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Translation</label>
              <Select value={translation} onValueChange={setTranslation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BIBLE_TRANSLATIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Book</label>
              <Select value={book} onValueChange={setBook}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {BIBLE_BOOKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Chapter</label>
              <Input value={chapter} onChange={(e) => setChapter(e.target.value)} type="number" min={1} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Verses</label>
              <div className="flex items-center gap-1">
                <Input value={fromVerse} onChange={(e) => setFromVerse(e.target.value)} type="number" min={1} className="w-16" />
                <span className="text-muted-foreground text-sm">–</span>
                <Input value={toVerse} onChange={(e) => setToVerse(e.target.value)} type="number" min={1} className="w-16" />
              </div>
            </div>
          </div>

          {/* Options row */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={showNumbers} onCheckedChange={setShowNumbers} />
              Verse numbers
            </label>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Send mode:</span>
              <button
                onClick={() => setSendMode("one")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${sendMode === "one" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                One at a time
              </button>
              <button
                onClick={() => setSendMode("all")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${sendMode === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                All together
              </button>
            </div>
            <div className="ml-auto">
              <Button onClick={handleFetch} disabled={loading}>
                {loading ? "Fetching…" : "Get Verses"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">{result.reference}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{translation}</Badge>
              <Badge variant="secondary">{total} verse{total !== 1 ? "s" : ""}</Badge>
            </div>
          </div>

          {sendMode === "one" ? (
            /* ── Per-verse navigation ── */
            <Card className="border-primary/30">
              <CardContent className="p-6 space-y-4">
                {/* Verse display */}
                <div className="min-h-32 flex items-start gap-3">
                  {showNumbers && currentVerse && (
                    <span className="text-2xl font-bold text-primary/60 leading-none mt-1 w-8 shrink-0 text-right">
                      {currentVerse.verse}
                    </span>
                  )}
                  <p className="text-lg font-serif italic leading-relaxed flex-1">
                    "{currentVerse?.text}"
                  </p>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentVerseIdx(i => Math.max(0, i - 1))}
                    disabled={currentVerseIdx === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>

                  <div className="flex items-center gap-1">
                    {result.verses.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentVerseIdx(i)}
                        className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                          i === currentVerseIdx ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        {result.verses[i].verse}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentVerseIdx(i => Math.min(total - 1, i + 1))}
                    disabled={currentVerseIdx === total - 1}
                    className="gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Send actions */}
                <div className="flex gap-2">
                  {currentVerse && (
                    <Button
                      onClick={() => sendVerse([currentVerse], result.reference)}
                      className="flex-1 gap-2"
                    >
                      <Cast className="w-4 h-4" />
                      Send verse {currentVerse.verse}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => sendVerse(result.verses, result.reference)}
                    className="gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    Send all
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* ── All verses at once ── */
            <Card className="border-primary/30">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.verses.map((v) => (
                    <div key={v.verse} className="flex items-start gap-2 text-sm">
                      {showNumbers && (
                        <span className="font-bold text-primary/70 w-6 shrink-0 text-right">{v.verse}</span>
                      )}
                      <span className="font-serif italic">{v.text}</span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => sendVerse(result.verses, result.reference)}
                  className="w-full gap-2"
                  size="lg"
                >
                  <CastIcon className="w-4 h-4" />
                  Send all {total} verses to screen
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
