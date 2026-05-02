import { useState } from "react";
import { BIBLE_BOOKS, BIBLE_TRANSLATIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Book, ChevronLeft, ChevronRight, Cast, Layers, Highlighter, X, Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BibleVerse { verse: number; text: string; }
interface BibleResult { reference: string; verses: BibleVerse[]; }

export default function BiblePage() {
  const [translationValue, setTranslationValue] = useState("kjv");
  const [book, setBook] = useState("John");
  const [chapter, setChapter] = useState("3");
  const [fromVerse, setFromVerse] = useState("16");
  const [toVerse, setToVerse] = useState("17");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BibleResult | null>(null);
  const [currentVerseIdx, setCurrentVerseIdx] = useState(0);
  const [showNumbers, setShowNumbers] = useState(true);
  const [sendMode, setSendMode] = useState<"all" | "one">("one");
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());

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
    textStyle: screenState?.textStyle ?? { fontFamily: "Georgia", fontSize: 64, textColor: "#ffffff", alignment: "center" as const, animation: "fade_in" as const },
    background: screenState?.background ?? { type: "color", value: "#000000" },
  };

  const buildText = (verses: BibleVerse[]) =>
    verses.map(v => showNumbers ? `${v.verse} ${v.text}` : v.text).join("\n");

  const buildRef = (verses: BibleVerse[], baseRef: string) => {
    if (verses.length === 1) return `${baseRef.split(":")[0]}:${verses[0].verse}`;
    return `${baseRef.split(":")[0]}:${verses[0].verse}–${verses[verses.length - 1].verse}`;
  };

  const sendVerses = (verses: BibleVerse[], ref: string) => {
    // Encode translation abbr after pipe so broadcast can display it
    const titleWithTranslation = `${ref}|${translationAbbr}`;
    updateScreen({ data: { ...safeBase, title: titleWithTranslation, content: buildText(verses) } });
    toast({ title: "Sent to screen", description: `${ref} (${translationAbbr})` });
  };

  const handleFetch = async () => {
    setLoading(true);
    setHighlighted(new Set());
    try {
      const to = toVerse || fromVerse;
      const res = await fetch(
        `https://bible-api.com/${encodeURIComponent(book)}+${chapter}:${fromVerse}-${to}?translation=${translationValue}`
      );
      const data = await res.json();
      if (data.error) {
        toast({ title: "Not found", description: data.error, variant: "destructive" });
        return;
      }
      if (data.verses?.length) {
        setResult({
          reference: data.reference,
          verses: data.verses.map((v: any) => ({ verse: v.verse, text: v.text.trim() })),
        });
        setCurrentVerseIdx(0);
      } else {
        toast({ title: "No verses found", description: "Check the reference and try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Fetch failed", description: "Could not reach the Bible API.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleHighlight = (verse: number) => {
    setHighlighted(prev => {
      const next = new Set(prev);
      if (next.has(verse)) next.delete(verse); else next.add(verse);
      return next;
    });
  };

  const highlightedVerses = result?.verses.filter(v => highlighted.has(v.verse)) ?? [];
  const currentVerse = result?.verses[currentVerseIdx];
  const total = result?.verses.length ?? 0;
  const translationMeta  = BIBLE_TRANSLATIONS.find(t => t.value === translationValue);
  const translationLabel = translationMeta?.label.split("—")[0].trim() ?? translationValue.toUpperCase();
  const translationAbbr  = translationMeta?.abbr ?? translationValue.toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary"><Book className="w-6 h-6" /></div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bible Passage</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Look up, highlight, and send scripture to the screen</p>
        </div>
      </div>

      {/* ── Lookup form ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1.5 col-span-2 md:col-span-1">
              <label className="text-sm font-medium">Translation</label>
              <Select value={translationValue} onValueChange={setTranslationValue}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BIBLE_TRANSLATIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
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
              <Input value={chapter} onChange={e => setChapter(e.target.value)} type="number" min={1} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Verses</label>
              <div className="flex items-center gap-1">
                <Input value={fromVerse} onChange={e => setFromVerse(e.target.value)} type="number" min={1} className="w-16" />
                <span className="text-muted-foreground text-sm">–</span>
                <Input value={toVerse} onChange={e => setToVerse(e.target.value)} type="number" min={1} className="w-16" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={showNumbers} onCheckedChange={setShowNumbers} />
              Verse numbers
            </label>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Send mode:</span>
              {(["one", "all"] as const).map(m => (
                <button key={m} onClick={() => setSendMode(m)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${sendMode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {m === "one" ? "One at a time" : "All together"}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <Button onClick={handleFetch} disabled={loading}>
                {loading ? "Fetching…" : "Get Verses"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold text-primary">{result.reference}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{translationLabel}</Badge>
              <Badge variant="secondary">{total} verse{total !== 1 ? "s" : ""}</Badge>
              {highlighted.size > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
                  <Highlighter className="w-3 h-3" /> {highlighted.size} highlighted
                  <button onClick={() => setHighlighted(new Set())} className="ml-1 hover:text-yellow-200">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>

          {/* ── Highlighted send bar ── */}
          {highlighted.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Highlighter className="w-4 h-4 text-yellow-400 shrink-0" />
              <p className="text-sm text-yellow-300 flex-1 font-medium">
                {highlighted.size} verse{highlighted.size !== 1 ? "s" : ""} highlighted
              </p>
              <Button
                size="sm"
                className="gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"
                onClick={() => sendVerses(highlightedVerses, buildRef(highlightedVerses, result.reference))}
              >
                <Send className="w-3.5 h-3.5" /> Send highlighted
              </Button>
            </div>
          )}

          {sendMode === "one" ? (
            /* ── Per-verse navigation ── */
            <Card className="border-primary/30">
              <CardContent className="p-6 space-y-4">
                <div
                  className={`min-h-32 flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    currentVerse && highlighted.has(currentVerse.verse)
                      ? "bg-yellow-500/15 border border-yellow-500/30"
                      : "hover:bg-muted/30"
                  }`}
                  onClick={() => currentVerse && toggleHighlight(currentVerse.verse)}
                  title="Click to highlight this verse"
                >
                  {showNumbers && currentVerse && (
                    <span className="text-2xl font-bold text-primary/60 leading-none mt-1 w-8 shrink-0 text-right">
                      {currentVerse.verse}
                    </span>
                  )}
                  <div className="flex-1">
                    <p className="text-lg font-serif italic leading-relaxed">"{currentVerse?.text}"</p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Highlighter className="w-3 h-3" /> Click verse to highlight
                    </p>
                  </div>
                  {currentVerse && highlighted.has(currentVerse.verse) && (
                    <Highlighter className="w-4 h-4 text-yellow-400 shrink-0 mt-1" />
                  )}
                </div>

                {/* Verse dots */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setCurrentVerseIdx(i => Math.max(0, i - 1))} disabled={currentVerseIdx === 0} className="gap-1">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>
                  <div className="flex items-center gap-1 flex-wrap justify-center max-w-xs">
                    {result.verses.map((v, i) => (
                      <button key={i} onClick={() => setCurrentVerseIdx(i)}
                        className={`w-6 h-6 rounded text-xs font-medium transition-colors relative ${
                          i === currentVerseIdx ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        {result.verses[i].verse}
                        {highlighted.has(v.verse) && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentVerseIdx(i => Math.min(total - 1, i + 1))} disabled={currentVerseIdx === total - 1} className="gap-1">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  {currentVerse && (
                    <Button onClick={() => sendVerses([currentVerse], `${result.reference.split(":")[0]}:${currentVerse.verse}`)} className="flex-1 gap-2">
                      <Cast className="w-4 h-4" /> Send verse {currentVerse.verse}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => sendVerses(result.verses, result.reference)} className="gap-2">
                    <Layers className="w-4 h-4" /> Send all
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* ── All verses list with highlight ── */
            <Card className="border-primary/30">
              <CardContent className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Highlighter className="w-3.5 h-3.5" /> Click any verse to highlight it, then send the selection to the screen
                </p>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {result.verses.map((v) => (
                    <div
                      key={v.verse}
                      onClick={() => toggleHighlight(v.verse)}
                      className={`flex items-start gap-2 text-sm p-2 rounded-md cursor-pointer transition-colors ${
                        highlighted.has(v.verse)
                          ? "bg-yellow-500/15 border border-yellow-500/30"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      {showNumbers && (
                        <span className="font-bold text-primary/70 w-6 shrink-0 text-right mt-0.5">{v.verse}</span>
                      )}
                      <span className="font-serif italic flex-1">{v.text}</span>
                      {highlighted.has(v.verse) && <Highlighter className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  {highlighted.size > 0 && (
                    <Button
                      onClick={() => sendVerses(highlightedVerses, buildRef(highlightedVerses, result.reference))}
                      className="flex-1 gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"
                    >
                      <Highlighter className="w-4 h-4" /> Send {highlighted.size} highlighted
                    </Button>
                  )}
                  <Button onClick={() => sendVerses(result.verses, result.reference)} className={highlighted.size > 0 ? "gap-2" : "flex-1 gap-2"} size="lg">
                    <Cast className="w-4 h-4" /> Send all {total}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
