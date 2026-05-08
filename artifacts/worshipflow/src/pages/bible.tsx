import { useMemo, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useSessionStorage } from "@/hooks/use-session-storage";
import { useRecentlyPresented } from "@/hooks/use-recently-presented";
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
  Book, ChevronLeft, ChevronRight, Cast, Layers, Highlighter, X, Send,
  Search as SearchIcon, Columns2, Clock, Trash2, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DigitalLibrary } from "@/components/bible/digital-library";
import { AmbientSoundscapes } from "@/components/bible/ambient-soundscapes";
import { CharacterPerspective } from "@/components/bible/character-perspective";
import { VerseToArt } from "@/components/bible/verse-to-art";
import { BiblePhraseSearch } from "@/components/bible/bible-search";

interface BibleVerse { verse: number; text: string; }
interface BibleResult { reference: string; verses: BibleVerse[]; }

/** Wrap each highlight term in markers «...» that the broadcast renderer detects (B3.3).
 * Single-pass replacement so substring overlaps (e.g. "He" + "Heart") never double-wrap. */
function applyWordHighlights(text: string, terms: string[]): string {
  const cleaned = terms.map(s => s.trim()).filter(Boolean);
  if (!cleaned.length) return text;
  // Longest-first ordering means the regex alternation prefers longer matches
  // (regex engines try alternatives left-to-right within each position).
  const sorted = [...cleaned].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // Strip any pre-existing « » markers from input first to avoid nesting on re-runs.
  const stripped = text.replace(/[«»]/g, "");
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  return stripped.replace(re, "«$1»");
}

export default function BiblePage() {
  // Persisted selections — remembered across page reloads
  const [translationValue, setTranslationValue] = useLocalStorage("wf-bible-translation", "kjv");
  const [book, setBook]                         = useLocalStorage("wf-bible-book", "John");
  const [chapter, setChapter]                   = useLocalStorage("wf-bible-chapter", "3");
  const [fromVerse, setFromVerse]               = useLocalStorage("wf-bible-from", "16");
  const [toVerse, setToVerse]                   = useLocalStorage("wf-bible-to", "17");
  const [showNumbers, setShowNumbers]           = useLocalStorage("wf-bible-show-numbers", true);
  const [sendMode, setSendMode]                 = useLocalStorage<"all" | "one">("wf-bible-send-mode", "one");

  // B3.3 — word highlighting input
  const [highlightWords, setHighlightWords]     = useLocalStorage("wf-bible-highlight-words", "");

  // B3.5 — side-by-side comparison
  const [compareEnabled, setCompareEnabled]     = useLocalStorage("wf-bible-compare-enabled", false);
  const [compareTranslation, setCompareTranslation] = useLocalStorage("wf-bible-compare-translation", "asv");

  // Transient state — not persisted
  const [loading, setLoading]                   = useState(false);
  // Persist the LOOKED-UP verse across navigation so switching tabs and coming
  // back doesn't make the operator click "Look up" again.  sessionStorage
  // (not localStorage) so it clears when the tab is closed.
  const [result, setResult]                     = useSessionStorage<BibleResult | null>("wf-bible-result", null);
  const [secondaryResult, setSecondaryResult]   = useSessionStorage<BibleResult | null>("wf-bible-result-2", null);
  const [currentVerseIdx, setCurrentVerseIdx]   = useSessionStorage<number>("wf-bible-current-verse-idx", 0);
  const [highlighted, setHighlighted]           = useState<Set<number>>(new Set());

  // B3.4 — phrase search within current passage
  const [verseSearch, setVerseSearch]           = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: screenState } = useGetScreenState({ query: { queryKey: getGetScreenStateQueryKey() } });
  const { items: recentItems, add: addRecent, remove: removeRecent, clear: clearRecent } = useRecentlyPresented();

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

  // Parse highlight words once per render
  const highlightTerms = useMemo(
    () => highlightWords.split(",").map(s => s.trim()).filter(Boolean),
    [highlightWords]
  );

  const buildText = (verses: BibleVerse[]) =>
    verses.map(v => {
      const text = applyWordHighlights(v.text, highlightTerms);
      return showNumbers ? `${v.verse} ${text}` : text;
    }).join("\n");

  const buildRef = (verses: BibleVerse[], baseRef: string) => {
    if (verses.length === 1) return `${baseRef.split(":")[0]}:${verses[0].verse}`;
    return `${baseRef.split(":")[0]}:${verses[0].verse}–${verses[verses.length - 1].verse}`;
  };

  const sendVerses = (verses: BibleVerse[], ref: string) => {
    // Encode translation abbr after pipe so broadcast can display it
    const titleWithTranslation = `${ref}|${translationAbbr}`;

    // B3.5 — if comparison enabled and we have a secondary result, send both
    let secondaryFields: Record<string, unknown> = {
      comparisonMode: false,
      secondaryTitle: "",
      secondaryContent: "",
    };
    if (compareEnabled && secondaryResult) {
      // Find matching verses in secondary by verse number
      const secondaryVerses = verses
        .map(v => secondaryResult.verses.find(sv => sv.verse === v.verse))
        .filter((v): v is BibleVerse => Boolean(v));
      if (secondaryVerses.length) {
        const secondaryText = secondaryVerses
          .map(v => {
            const text = applyWordHighlights(v.text, highlightTerms);
            return showNumbers ? `${v.verse} ${text}` : text;
          }).join("\n");
        secondaryFields = {
          comparisonMode: true,
          secondaryTitle: `${ref}|${compareTranslationAbbr}`,
          secondaryContent: secondaryText,
        };
      }
    }

    const screenData = { ...safeBase, title: titleWithTranslation, content: buildText(verses), ...secondaryFields };
    updateScreen({ data: screenData });

    // Track in recently-presented (B3.6)
    const compareSuffix = compareEnabled && secondaryResult ? ` + ${compareTranslationAbbr}` : "";
    addRecent({
      id: `verse-${ref}-${translationAbbr}${compareSuffix}`,
      type: "verse",
      title: ref,
      subtitle: `${translationAbbr}${compareSuffix}`,
      payload: {
        translation: translationValue,
        book, chapter,
        fromVerse: String(verses[0].verse),
        toVerse: String(verses[verses.length - 1].verse),
        compareEnabled,
        compareTranslation: compareEnabled ? compareTranslation : undefined,
        // Snapshot of exact data sent — used by restoreRecent to re-send instantly (Bug fix May 2026).
        screenData,
      },
    });

    toast({ title: "Sent to screen", description: `${ref} (${translationAbbr}${compareSuffix})` });
  };

  const fetchTranslation = async (translationCode: string): Promise<BibleResult | null> => {
    const to = toVerse || fromVerse;
    const res = await fetch(
      `https://bible-api.com/${encodeURIComponent(book)}+${chapter}:${fromVerse}-${to}?translation=${translationCode}`
    );
    const data = await res.json();
    if (data.error) {
      toast({ title: "Not found", description: `${translationCode.toUpperCase()}: ${data.error}`, variant: "destructive" });
      return null;
    }
    if (!data.verses?.length) return null;
    return {
      reference: data.reference,
      verses: data.verses.map((v: any) => ({ verse: v.verse, text: v.text.trim() })),
    };
  };

  const handleFetch = async () => {
    setLoading(true);
    setHighlighted(new Set());
    setVerseSearch("");
    try {
      const primary = await fetchTranslation(translationValue);
      if (primary) {
        setResult(primary);
        setCurrentVerseIdx(0);
      } else {
        toast({ title: "No verses found", description: "Check the reference and try again.", variant: "destructive" });
      }
      // B3.5 — also fetch secondary translation when compare is on
      if (compareEnabled) {
        const secondary = await fetchTranslation(compareTranslation);
        setSecondaryResult(secondary);
      } else {
        setSecondaryResult(null);
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

  const restoreRecent = async (item: typeof recentItems[number]) => {
    const p = item.payload ?? {};

    // For verse items, also restore the form params so the lookup matches what's on screen.
    if (item.type === "verse") {
      if (typeof p.translation === "string") setTranslationValue(p.translation);
      if (typeof p.book === "string") setBook(p.book);
      if (typeof p.chapter === "string") setChapter(p.chapter);
      if (typeof p.fromVerse === "string") setFromVerse(p.fromVerse);
      if (typeof p.toVerse === "string") setToVerse(p.toVerse);
      if (typeof p.compareEnabled === "boolean") setCompareEnabled(p.compareEnabled);
      if (typeof p.compareTranslation === "string") setCompareTranslation(p.compareTranslation);
    }

    // Re-send the previously displayed screen payload (verse / song / note / text).
    // Snapshot stored in payload.screenData by each page's send handler.
    if (p.screenData && typeof p.screenData === "object") {
      updateScreen({ data: p.screenData as any });
      toast({ title: "Re-sent to screen", description: `${item.title}${item.subtitle ? ` (${item.subtitle})` : ""}` });
    } else {
      // Legacy items (saved before May 2026 fix) without snapshot → just restore form
      toast({ title: "Restored", description: `${item.title} — click Get Verses then Send to display.` });
    }
  };

  const highlightedVerses = result?.verses.filter(v => highlighted.has(v.verse)) ?? [];
  const currentVerse = result?.verses[currentVerseIdx];
  const total = result?.verses.length ?? 0;
  const translationMeta  = BIBLE_TRANSLATIONS.find(t => t.value === translationValue);
  const translationLabel = translationMeta?.label.split("—")[0].trim() ?? translationValue.toUpperCase();
  const translationAbbr  = translationMeta?.abbr ?? translationValue.toUpperCase();
  const compareTranslationMeta = BIBLE_TRANSLATIONS.find(t => t.value === compareTranslation);
  const compareTranslationAbbr = compareTranslationMeta?.abbr ?? compareTranslation.toUpperCase();

  // B3.4 — filter visible verses by phrase search (when in "all" mode)
  const matchesSearch = (text: string) =>
    !verseSearch.trim() || text.toLowerCase().includes(verseSearch.trim().toLowerCase());
  const searchMatches = result?.verses.filter(v => matchesSearch(v.text)) ?? [];

  // Verse-only recent items (others are surfaced from their own pages too)
  const recentBibleItems = recentItems.slice(0, 6);

  /* ── Digital Library send-to-screen handler ── */
  const sendLibraryText = (text: string, ref: string, abbr: string) => {
    const screenData = { ...safeBase, title: `${ref}|${abbr}`, content: text, comparisonMode: false, secondaryTitle: "", secondaryContent: "" };
    updateScreen({ data: screenData });
    addRecent({ id: `lib-${ref}-${abbr}`, type: "verse", title: ref, subtitle: abbr, payload: { screenData } });
    toast({ title: "Sent to screen", description: `${ref}` });
  };

  /* ── Character Perspective send handler ── */
  const sendCharacterVerses = (verses: BibleVerse[], ref: string) => sendVerses(verses, ref);

  /* ── Bible Phrase Search: go-to handler ── */
  const goToSearchResult = (b: string, ch: string, from: string, to: string) => {
    setBook(b);
    setChapter(ch);
    setFromVerse(from);
    setToVerse(to);
  };

  /* ── Verse-to-Art: set background handler ── */
  const setArtAsBackground = (dataUrl: string) => {
    const screenData = { ...safeBase, background: { type: "image" as const, value: dataUrl } };
    updateScreen({ data: screenData });
    toast({ title: "Background updated", description: "Verse art set as screen background." });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary"><Book className="w-6 h-6" /></div>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Bible Passage</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Look up, highlight, and send scripture to the screen</p>
        </div>
      </div>

      {/* ── B3.6 Recently presented widget ───────────────────────────────── */}
      {recentBibleItems.length > 0 && (
        <Card data-testid="card-recent-items">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="w-4 h-4" /> Recently presented
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={clearRecent}
                data-testid="button-clear-recent"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentBibleItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted text-xs"
                  data-testid={`recent-item-${item.id}`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    item.type === "verse" ? "bg-primary" :
                    item.type === "song"  ? "bg-blue-400" :
                    item.type === "note"  ? "bg-amber-400" : "bg-emerald-400"
                  }`} />
                  <button
                    onClick={() => restoreRecent(item)}
                    className="font-medium text-foreground hover:text-primary"
                    data-testid={`button-recent-${item.id}`}
                  >
                    {item.title}
                  </button>
                  {item.subtitle && (
                    <span className="text-muted-foreground">· {item.subtitle}</span>
                  )}
                  <button
                    onClick={() => removeRecent(item.id)}
                    className="ml-0.5 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-opacity"
                    aria-label="Remove from recent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Lookup form ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1.5 col-span-2 md:col-span-1">
              <label className="text-sm font-medium">Translation</label>
              <Select value={translationValue} onValueChange={setTranslationValue}>
                <SelectTrigger data-testid="select-translation"><SelectValue /></SelectTrigger>
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

          {/* B3.3 — word highlighting input + B3.5 compare toggle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Highlight words
                <span className="text-xs text-muted-foreground font-normal">(comma-separated)</span>
              </label>
              <Input
                value={highlightWords}
                onChange={e => setHighlightWords(e.target.value)}
                placeholder="love, world, faith"
                data-testid="input-highlight-words"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Columns2 className="w-3.5 h-3.5 text-cyan-400" /> Compare with
                <Switch
                  checked={compareEnabled}
                  onCheckedChange={setCompareEnabled}
                  data-testid="switch-compare-enabled"
                  className="ml-1"
                />
              </label>
              <Select
                value={compareTranslation}
                onValueChange={setCompareTranslation}
                disabled={!compareEnabled}
              >
                <SelectTrigger data-testid="select-compare-translation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BIBLE_TRANSLATIONS
                    .filter(t => t.value !== translationValue)
                    .map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
              <Button onClick={handleFetch} disabled={loading} data-testid="button-fetch-verses">
                {loading ? "Fetching…" : "Get Verses"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Immersive tools ── */}
      <div className="space-y-2">
        <BiblePhraseSearch
          book={book}
          chapter={chapter}
          currentVerses={result?.verses ?? []}
          onGoTo={goToSearchResult}
          onSendToScreen={sendLibraryText}
        />
        <DigitalLibrary
          book={book}
          chapter={chapter}
          fromVerse={fromVerse}
          toVerse={toVerse}
          onSendToScreen={sendLibraryText}
        />
        <AmbientSoundscapes book={book} />
        <CharacterPerspective
          verses={result?.verses ?? []}
          reference={result?.reference ?? `${book} ${chapter}`}
          book={book}
          chapter={chapter}
          onSendVerses={sendCharacterVerses}
        />
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold text-primary">{result.reference}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{translationLabel}</Badge>
              {compareEnabled && secondaryResult && (
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-300">
                  <Columns2 className="w-3 h-3 mr-1" /> + {compareTranslationAbbr}
                </Badge>
              )}
              <Badge variant="secondary">{total} verse{total !== 1 ? "s" : ""}</Badge>
              {highlightTerms.length > 0 && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1">
                  <Sparkles className="w-3 h-3" /> {highlightTerms.length} word{highlightTerms.length !== 1 ? "s" : ""}
                </Badge>
              )}
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

          {/* B3.4 — phrase search within passage */}
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={verseSearch}
              onChange={e => setVerseSearch(e.target.value)}
              placeholder="Search within this passage…"
              className="pl-9 pr-24"
              data-testid="input-verse-search"
            />
            {verseSearch && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground" data-testid="text-search-count">
                  {searchMatches.length} / {total}
                </span>
                <button
                  onClick={() => setVerseSearch("")}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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
                    {/* B3.5 — show secondary translation alongside in compare mode */}
                    {compareEnabled && secondaryResult && currentVerse && (
                      (() => {
                        const sv = secondaryResult.verses.find(v => v.verse === currentVerse.verse);
                        return sv ? (
                          <div className="mt-3 pt-3 border-t border-cyan-500/20" data-testid="text-compare-verse">
                            <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-300 mb-1.5">
                              {compareTranslationAbbr}
                            </Badge>
                            <p className="text-sm font-serif italic leading-relaxed text-cyan-100/90">"{sv.text}"</p>
                          </div>
                        ) : null;
                      })()
                    )}
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
                    {result.verses.map((v, i) => {
                      const matches = matchesSearch(v.text);
                      return (
                        <button key={i} onClick={() => setCurrentVerseIdx(i)}
                          className={`w-6 h-6 rounded text-xs font-medium transition-colors relative ${
                            i === currentVerseIdx
                              ? "bg-primary text-primary-foreground"
                              : verseSearch && !matches
                                ? "bg-muted/30 text-muted-foreground/40"
                                : verseSearch && matches
                                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          }`}
                        >
                          {result.verses[i].verse}
                          {highlighted.has(v.verse) && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full" />
                          )}
                        </button>
                      );
                    })}
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

                {/* ── Verse-to-Art ── */}
                {currentVerse && (
                  <div className="pt-2 border-t border-border">
                    <VerseToArt
                      verse={currentVerse.text}
                      reference={`${result.reference.split(":")[0]}:${currentVerse.verse}`}
                      book={book}
                      onSetAsBackground={setArtAsBackground}
                    />
                  </div>
                )}
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
                  {result.verses
                    .filter(v => matchesSearch(v.text))
                    .map((v) => {
                      const sv = compareEnabled && secondaryResult
                        ? secondaryResult.verses.find(s => s.verse === v.verse)
                        : null;
                      return (
                        <div
                          key={v.verse}
                          onClick={() => toggleHighlight(v.verse)}
                          className={`flex flex-col gap-1 text-sm p-2 rounded-md cursor-pointer transition-colors ${
                            highlighted.has(v.verse)
                              ? "bg-yellow-500/15 border border-yellow-500/30"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {showNumbers && (
                              <span className="font-bold text-primary/70 w-6 shrink-0 text-right mt-0.5">{v.verse}</span>
                            )}
                            <span className="font-serif italic flex-1">{v.text}</span>
                            {highlighted.has(v.verse) && <Highlighter className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />}
                          </div>
                          {sv && (
                            <div className="flex items-start gap-2 pl-8">
                              <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-300 shrink-0">
                                {compareTranslationAbbr}
                              </Badge>
                              <span className="font-serif italic text-cyan-100/80 text-xs">{sv.text}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {searchMatches.length === 0 && verseSearch && (
                    <p className="text-center text-muted-foreground text-sm py-6">
                      No verses match "{verseSearch}"
                    </p>
                  )}
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
