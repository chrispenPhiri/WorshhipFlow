import { useState, useRef, useCallback } from "react";
import {
  Search, X, BookOpen, Cast, ArrowRight, ChevronDown, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BIBLE_BOOKS } from "@/lib/constants";

/* Chapter counts per book — same order as BIBLE_BOOKS */
const CHAPTER_COUNTS: number[] = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42,
  150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4,
  28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5,
  3, 5, 1, 1, 1, 22,
];

export interface BibleVerse { verse: number; text: string; }

export interface SearchHit {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const re = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p)
      ? <mark key={i} className="bg-amber-400/30 text-amber-200 rounded-sm px-0.5 not-italic">{p}</mark>
      : <span key={i}>{p}</span>
  );
}

interface Props {
  book: string;
  chapter: string;
  currentVerses: BibleVerse[];
  onGoTo: (book: string, chapter: string, fromVerse: string, toVerse: string) => void;
  onSendToScreen: (text: string, ref: string, abbr: string) => void;
}

type Scope = "chapter" | "book" | "bible";

export function BiblePhraseSearch({ book, chapter, currentVerses, onGoTo, onSendToScreen }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("book");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = useCallback(() => {
    setQuery("");
    setHits([]);
    setSearched(false);
    setProgress(0);
    setProgressTotal(0);
    abortRef.current?.abort();
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSearching(true);
    setHits([]);
    setSearched(false);
    setProgress(0);

    const lower = q.trim().toLowerCase();

    if (scope === "chapter") {
      // Instant — filter already-loaded verses
      const results: SearchHit[] = currentVerses
        .filter(v => v.text.toLowerCase().includes(lower))
        .map(v => ({
          book, chapter: parseInt(chapter) || 1,
          verse: v.verse, text: v.text,
          reference: `${book} ${chapter}:${v.verse}`,
        }));
      setHits(results);
      setSearched(true);
      setSearching(false);
      return;
    }

    // Helper to search one book
    const searchBook = async (
      targetBook: string,
      bookNum: number,
      totalChapters: number,
      progressOffset: number,
      allHits: SearchHit[],
    ) => {
      const BATCH = 12;
      for (let start = 1; start <= totalChapters; start += BATCH) {
        if (ctrl.signal.aborted) return;
        const end = Math.min(start + BATCH - 1, totalChapters);
        const batch = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const results = await Promise.allSettled(
          batch.map(ch =>
            fetch(`https://api.getbible.net/v2/kjv/${bookNum}/${ch}.json`, { signal: ctrl.signal })
              .then(r => r.json())
              .then((data: { chapter: Record<string, { verse: number; text: string }> }) => {
                const verses = Object.values(data.chapter ?? {});
                return verses
                  .filter(v => v.text.toLowerCase().includes(lower))
                  .map(v => ({
                    book: targetBook, chapter: ch, verse: v.verse, text: v.text,
                    reference: `${targetBook} ${ch}:${v.verse}`,
                  }));
              })
              .catch(() => [] as SearchHit[])
          )
        );
        for (const r of results) {
          if (r.status === "fulfilled") allHits.push(...r.value);
        }
        setProgress(progressOffset + Math.min(end, totalChapters));
        setHits([...allHits]);
      }
    };

    if (scope === "bible") {
      // Whole-Bible search — iterate all 66 books sequentially in small batches
      const totalChaptersAll = CHAPTER_COUNTS.reduce((a, b) => a + b, 0);
      setProgressTotal(totalChaptersAll);
      const allHits: SearchHit[] = [];
      let chaptersDone = 0;
      for (let bi = 0; bi < BIBLE_BOOKS.length; bi++) {
        if (ctrl.signal.aborted) break;
        const bName = BIBLE_BOOKS[bi];
        const bChapters = CHAPTER_COUNTS[bi] ?? 1;
        await searchBook(bName, bi + 1, bChapters, chaptersDone, allHits);
        chaptersDone += bChapters;
      }
      if (!ctrl.signal.aborted) { setSearched(true); setSearching(false); }
      return;
    }

    // Book-wide search via getbible.net KJV
    const bookIdx = BIBLE_BOOKS.indexOf(book);
    if (bookIdx < 0) { setSearching(false); return; }
    const bookNum = bookIdx + 1;
    const totalChapters = CHAPTER_COUNTS[bookIdx] ?? 1;
    setProgressTotal(totalChapters);
    const allHits: SearchHit[] = [];
    await searchBook(book, bookNum, totalChapters, 0, allHits);

    if (!ctrl.signal.aborted) {
      setSearched(true);
      setSearching(false);
    }
  }, [book, chapter, currentVerses, scope]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) runSearch(query);
  };

  const noChapterVerses = scope === "chapter" && currentVerses.length === 0;

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 120); }}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <Search className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium">Bible Phrase Search</span>
          {hits.length > 0 && (
            <Badge className="text-[10px] py-0 h-4 bg-primary/20 text-primary border-primary/30">
              {hits.length} match{hits.length !== 1 ? "es" : ""}
            </Badge>
          )}
          {!open && query && (
            <span className="text-xs text-muted-foreground truncate">"{query}"</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border/60 p-4 space-y-4">
          {/* Search bar */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${scope === "chapter" ? `${book} ${chapter}` : scope === "book" ? `the book of ${book}` : "the whole Bible"}…`}
                className="pl-9 pr-9"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={clear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" disabled={!query.trim() || searching} className="gap-2 shrink-0">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </form>

          {/* Scope toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Search in:</span>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(["chapter", "book", "bible"] as Scope[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setScope(s); setHits([]); setSearched(false); }}
                  className={`px-3 py-1 transition-colors border-r border-border/50 last:border-r-0 ${
                    scope === s
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {s === "chapter" ? `Chapter (${book} ${chapter})` : s === "book" ? `Book (${book})` : "Whole Bible"}
                </button>
              ))}
            </div>
            {noChapterVerses && scope === "chapter" && (
              <span className="text-xs text-amber-400">Fetch a passage first</span>
            )}
          </div>

          {/* Progress bar while fetching */}
          {searching && progressTotal > 1 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {scope === "bible"
                    ? `Scanning Bible… ${progress} of ${progressTotal} chapters`
                    : `Scanning ${book}… chapter ${progress} of ${progressTotal}`}
                </span>
                <button type="button" onClick={() => abortRef.current?.abort()}
                  className="text-muted-foreground hover:text-foreground">
                  Stop
                </button>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: progressTotal > 0 ? `${(progress / progressTotal) * 100}%` : "0%" }}
                />
              </div>
              {hits.length > 0 && (
                <p className="text-xs text-muted-foreground">{hits.length} match{hits.length !== 1 ? "es" : ""} so far…</p>
              )}
            </div>
          )}

          {/* Results */}
          {searched && !searching && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {hits.length === 0
                    ? `No matches for "${query}" in ${scope === "chapter" ? `${book} ${chapter}` : scope === "book" ? `the book of ${book}` : "the whole Bible"}`
                    : `${hits.length} match${hits.length !== 1 ? "es" : ""} for "${query}" in ${scope === "chapter" ? `${book} ${chapter}` : scope === "book" ? `the book of ${book}` : "the whole Bible"}`}
                </p>
                <button type="button" onClick={clear}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>

              {hits.length > 0 && (
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {hits.map((hit, i) => (
                    <div key={i}
                      className="group flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/40 transition-colors">
                      <BookOpen className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-primary mb-0.5">{hit.reference}</p>
                        <p className="text-sm font-serif leading-relaxed">{highlight(hit.text, query)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title="Go to this verse"
                          onClick={() => onGoTo(hit.book, String(hit.chapter), String(hit.verse), String(hit.verse))}
                          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Send to screen"
                          onClick={() => onSendToScreen(`${hit.verse} ${hit.text}`, hit.reference, "KJV")}
                          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Cast className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
