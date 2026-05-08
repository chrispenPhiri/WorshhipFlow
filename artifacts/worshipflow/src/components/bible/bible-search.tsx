import { useState, useRef, useCallback, useMemo } from "react";
import {
  Search, X, BookOpen, Cast, ArrowRight, ChevronDown, Loader2, Navigation
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

/* Book name aliases / abbreviations → canonical name */
const ALIASES: Record<string, string> = {
  gen: "Genesis", ex: "Exodus", exo: "Exodus", lev: "Leviticus",
  num: "Numbers", deut: "Deuteronomy", deu: "Deuteronomy", josh: "Joshua",
  judg: "Judges", jdg: "Judges", ruth: "Ruth", sam: "1 Samuel",
  "1sam": "1 Samuel", "2sam": "2 Samuel", "1ki": "1 Kings", "2ki": "2 Kings",
  "1chr": "1 Chronicles", "2chr": "2 Chronicles", ezra: "Ezra",
  neh: "Nehemiah", est: "Esther", esth: "Esther", job: "Job",
  ps: "Psalms", psa: "Psalms", psal: "Psalms", psalm: "Psalms",
  prov: "Proverbs", pro: "Proverbs", eccl: "Ecclesiastes", ecc: "Ecclesiastes",
  song: "Song of Solomon", sos: "Song of Solomon", cant: "Song of Solomon",
  isa: "Isaiah", jer: "Jeremiah", lam: "Lamentations",
  ezek: "Ezekiel", eze: "Ezekiel", dan: "Daniel", hos: "Hosea",
  joel: "Joel", amos: "Amos", obad: "Obadiah", jona: "Jonah", jon: "Jonah",
  mic: "Micah", nah: "Nahum", hab: "Habakkuk", zeph: "Zephaniah",
  hag: "Haggai", zech: "Zechariah", zec: "Zechariah", mal: "Malachi",
  matt: "Matthew", mat: "Matthew", mk: "Mark", mar: "Mark",
  lk: "Luke", luk: "Luke", jn: "John", joh: "John",
  acts: "Acts", rom: "Romans", "1cor": "1 Corinthians", "2cor": "2 Corinthians",
  gal: "Galatians", eph: "Ephesians", phil: "Philippians", php: "Philippians",
  col: "Colossians", "1thes": "1 Thessalonians", "2thes": "2 Thessalonians",
  "1tim": "1 Timothy", "2tim": "2 Timothy", tit: "Titus", phile: "Philemon",
  heb: "Hebrews", jas: "James", "1pet": "1 Peter", "2pet": "2 Peter",
  "1jn": "1 John", "2jn": "2 John", "3jn": "3 John", jude: "Jude",
  rev: "Revelation",
};

/* Sort books longest-first so "Song of Solomon" matches before "Song" */
const SORTED_BOOKS = [...BIBLE_BOOKS].sort((a, b) => b.length - a.length);

export interface ParsedReference {
  book: string;
  chapter: number;
  fromVerse: number;
  toVerse: number;
  label: string;
}

/**
 * Parse a human-typed reference into structured form.
 * Supports formats:
 *   John 3:16        John 3:16-17      John 3 V16-17
 *   1 Cor 13:4-7     Matt 5 v 3-10     Romans 8 28 (space-separated)
 *   jn 1:1           gen 1             psalm 23
 */
export function parseReference(input: string): ParsedReference | null {
  const s = input.trim();
  if (!s) return null;

  // Try canonical book names first (longest-first)
  let book: string | null = null;
  let rest = "";
  for (const b of SORTED_BOOKS) {
    if (s.toLowerCase().startsWith(b.toLowerCase())) {
      book = b;
      rest = s.slice(b.length).trim();
      break;
    }
  }

  // Try aliases if no canonical match
  if (!book) {
    // Try 1/2/3-prefixed abbreviations like "1cor", "2ki"
    const aliasMatch = s.match(/^([123]?\s*[a-z]+)/i);
    if (aliasMatch) {
      const key = aliasMatch[1].replace(/\s+/g, "").toLowerCase();
      const canonical = ALIASES[key];
      if (canonical) {
        book = canonical;
        rest = s.slice(aliasMatch[1].length).trim();
      }
    }
  }

  if (!book) return null;

  // rest is everything after the book name: "3:16-17", "3 V16-17", "3 v 16", "3 16", "3"
  // Remove any leading colon/space noise
  rest = rest.replace(/^[\s:]+/, "");

  if (!rest) {
    // Book only — default to chapter 1, all verses treated as 1–1
    return { book, chapter: 1, fromVerse: 1, toVerse: 999, label: book };
  }

  // Match: CHAPTER then optional verse part
  // Verse separator patterns: ":", " V ", " v ", " V", " v", space
  const chapterVerseRe = /^(\d+)[\s:]*(?:[Vv][Ee]?[Rr]?[Ss]?[Ee]?\.?\s*)?(\d+)?(?:\s*[-–]\s*(\d+))?/;
  const m = rest.match(chapterVerseRe);
  if (!m) {
    // Just try parsing as chapter number
    const ch = parseInt(rest);
    if (isNaN(ch)) return null;
    return { book, chapter: ch, fromVerse: 1, toVerse: 999, label: `${book} ${ch}` };
  }

  const chapter = parseInt(m[1]);
  const from = m[2] ? parseInt(m[2]) : null;
  const to = m[3] ? parseInt(m[3]) : null;

  if (from === null) {
    return { book, chapter, fromVerse: 1, toVerse: 999, label: `${book} ${chapter}` };
  }
  const toVerse = to ?? from;
  return {
    book,
    chapter,
    fromVerse: from,
    toVerse,
    label: from === toVerse ? `${book} ${chapter}:${from}` : `${book} ${chapter}:${from}–${toVerse}`,
  };
}

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

  /* Detect if the query looks like a Bible reference */
  const refMatch = useMemo(() => parseReference(query), [query]);
  const isRef = refMatch !== null && query.trim().length >= 2;

  const clear = useCallback(() => {
    setQuery("");
    setHits([]);
    setSearched(false);
    setProgress(0);
    setProgressTotal(0);
    abortRef.current?.abort();
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleJumpTo = () => {
    if (!refMatch) return;
    const toStr = refMatch.toVerse === 999 ? refMatch.fromVerse.toString() : refMatch.toVerse.toString();
    onGoTo(refMatch.book, String(refMatch.chapter), String(refMatch.fromVerse), toStr);
    setQuery("");
    setOpen(false);
  };

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
              .then((data: { verses: { verse: number; text: string }[] }) => {
                const verses = data.verses ?? [];
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
    if (isRef) {
      handleJumpTo();
    } else if (query.trim()) {
      runSearch(query);
    }
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
          <span className="text-sm font-medium">Bible Search</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">phrase or reference</span>
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
              {isRef
                ? <Navigation className="absolute left-2.5 top-2.5 w-4 h-4 text-primary pointer-events-none" />
                : <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              }
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='Type a phrase or reference (e.g. "John 3:16" or "love")'
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
            <Button
              type="submit"
              disabled={(!query.trim() || searching) && !isRef}
              className={`gap-2 shrink-0 ${isRef ? "bg-primary text-primary-foreground" : ""}`}
            >
              {searching
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isRef
                  ? <Navigation className="w-4 h-4" />
                  : <Search className="w-4 h-4" />
              }
              {isRef ? "Go to" : "Search"}
            </Button>
          </form>

          {/* Reference match preview */}
          {isRef && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/25">
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary">{refMatch!.label}</p>
                <p className="text-xs text-muted-foreground">
                  Press Go to or Enter to jump to this passage
                </p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={handleJumpTo}>
                <ArrowRight className="w-3.5 h-3.5 mr-1" /> Jump
              </Button>
            </div>
          )}

          {/* Scope toggle — only shown when doing a phrase search */}
          {!isRef && (
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
          )}

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

          {/* Hint — shown when no query yet */}
          {!query && !searched && (
            <div className="text-xs text-muted-foreground space-y-1 pt-1">
              <p className="font-medium text-foreground/60">Tip: type a reference or a phrase</p>
              <p>• <span className="text-foreground/70 font-mono">John 3:16</span> — jump to a specific verse</p>
              <p>• <span className="text-foreground/70 font-mono">John 1 V1-5</span> — verse range with "V" notation</p>
              <p>• <span className="text-foreground/70 font-mono">1 Cor 13</span> — jump to an entire chapter</p>
              <p>• <span className="text-foreground/70 font-mono">love</span> — search for a phrase</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
