import { useState, useMemo, useRef, useCallback } from "react";
import { User, Search, Cast, X, ChevronDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BIBLE_BOOKS } from "@/lib/constants";

export interface BibleVerse { verse: number; text: string; }

const CHAPTER_COUNTS: number[] = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42,
  150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4,
  28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5,
  3, 5, 1, 1, 1, 22,
];

const CHARACTERS: { name: string; emoji: string; terms: string[] }[] = [
  { name: "Jesus",       emoji: "✝️",  terms: ["Jesus","Christ","Lord Jesus","Son of Man","Son of God","Lamb","Messiah","Savior","Saviour","Emmanuel","Immanuel"] },
  { name: "Holy Spirit", emoji: "🕊️",  terms: ["Holy Spirit","Holy Ghost","Spirit of God","Spirit of the Lord","Comforter","Helper"] },
  { name: "God/Father",  emoji: "👑",  terms: ["God said","Lord said","Father said","the Lord","LORD God","Almighty"] },
  { name: "Peter",       emoji: "⛵",  terms: ["Peter","Simon Peter","Cephas","Simon son of John","Simon the fisherman"] },
  { name: "Paul",        emoji: "✉️",  terms: ["Paul","Saul of Tarsus"] },
  { name: "Moses",       emoji: "📜",  terms: ["Moses"] },
  { name: "David",       emoji: "🎵",  terms: ["David","king David"] },
  { name: "Abraham",     emoji: "🌟",  terms: ["Abraham","Abram"] },
  { name: "Mary",        emoji: "🌹",  terms: ["Mary","Mary Magdalene","mother of Jesus"] },
  { name: "Joseph",      emoji: "🛡️",  terms: ["Joseph"] },
  { name: "John",        emoji: "📖",  terms: ["John the Baptist","John the apostle","beloved disciple"] },
  { name: "Elijah",      emoji: "⚡",  terms: ["Elijah","Elias"] },
  { name: "Isaiah",      emoji: "🔥",  terms: ["Isaiah"] },
  { name: "Daniel",      emoji: "🦁",  terms: ["Daniel"] },
  { name: "Jonah",       emoji: "🐋",  terms: ["Jonah"] },
  { name: "Ruth",        emoji: "🌾",  terms: ["Ruth"] },
  { name: "Esther",      emoji: "👸",  terms: ["Esther"] },
  { name: "Solomon",     emoji: "💎",  terms: ["Solomon","king Solomon"] },
  { name: "Noah",        emoji: "🌈",  terms: ["Noah"] },
  { name: "Adam",        emoji: "🌱",  terms: ["Adam"] },
  { name: "Eve",         emoji: "🍎",  terms: ["Eve"] },
  { name: "Jacob/Israel",emoji: "🪨",  terms: ["Jacob","Israel"] },
  { name: "Elisha",      emoji: "💧",  terms: ["Elisha"] },
  { name: "Samuel",      emoji: "🕯️",  terms: ["Samuel"] },
  { name: "Saul (King)", emoji: "⚔️",  terms: ["king Saul","Saul the king"] },
  { name: "Judas",       emoji: "🪙",  terms: ["Judas","Iscariot","Judas Iscariot"] },
  { name: "James",       emoji: "📝",  terms: ["James"] },
  { name: "Angels",      emoji: "✨",  terms: ["angel","Angel","Gabriel","Michael","seraph","cherub"] },
  { name: "Satan/Devil", emoji: "🐍",  terms: ["Satan","devil","adversary","Lucifer","serpent","enemy"] },
  { name: "Pharaoh",     emoji: "🏛️",  terms: ["Pharaoh"] },
  { name: "Pilate",      emoji: "🏛️",  terms: ["Pilate","Pontius Pilate"] },
];

type CPScope = "chapter" | "book" | "bible";

interface SearchHit { book: string; chapter: number; verse: number; text: string; }

interface Props {
  verses: BibleVerse[];
  reference: string;
  book: string;
  chapter: string;
  onSendVerses: (verses: BibleVerse[], ref: string) => void;
}

function highlightTerms(text: string, terms: string[]): { part: string; match: boolean }[] {
  if (!terms.length) return [{ part: text, match: false }];
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts: { part: string; match: boolean }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ part: text.slice(last, m.index), match: false });
    parts.push({ part: m[0], match: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ part: text.slice(last), match: false });
  return parts;
}

export function CharacterPerspective({ verses, reference, book, chapter, onSendVerses }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof CHARACTERS[number] | null>(null);
  const [scope, setScope] = useState<CPScope>("chapter");

  const [fetchedHits, setFetchedHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const filtered = CHARACTERS.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const chapterVerseMatches = useMemo(() => {
    if (!selected || !verses.length) return new Set<number>();
    const terms = selected.terms.map(t => t.toLowerCase());
    return new Set(
      verses
        .filter(v => terms.some(term => v.text.toLowerCase().includes(term)))
        .map(v => v.verse)
    );
  }, [selected, verses]);

  const runWideSearch = useCallback(async (char: typeof CHARACTERS[number], newScope: CPScope) => {
    if (newScope === "chapter") return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSearching(true);
    setFetchedHits([]);
    setProgress(0);

    const lower = char.terms.map(t => t.toLowerCase());

    const fetchBook = async (targetBook: string, bookNum: number, chapters: number, offset: number, allHits: SearchHit[]) => {
      const BATCH = 12;
      for (let start = 1; start <= chapters; start += BATCH) {
        if (ctrl.signal.aborted) return;
        const end = Math.min(start + BATCH - 1, chapters);
        const batch = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const results = await Promise.allSettled(
          batch.map(ch =>
            fetch(`https://api.getbible.net/v2/kjv/${bookNum}/${ch}.json`, { signal: ctrl.signal })
              .then(r => r.json())
              .then((data: { chapter: Record<string, { verse: number; text: string }> }) => {
                const vs = Object.values(data.chapter ?? {});
                return vs
                  .filter(v => lower.some(t => v.text.toLowerCase().includes(t)))
                  .map(v => ({ book: targetBook, chapter: ch, verse: v.verse, text: v.text }));
              })
              .catch(() => [] as SearchHit[])
          )
        );
        for (const r of results) {
          if (r.status === "fulfilled") allHits.push(...r.value);
        }
        setProgress(offset + Math.min(end, chapters));
        setFetchedHits([...allHits]);
      }
    };

    const allHits: SearchHit[] = [];

    if (newScope === "book") {
      const bookIdx = BIBLE_BOOKS.indexOf(book);
      if (bookIdx >= 0) {
        const chapters = CHAPTER_COUNTS[bookIdx] ?? 1;
        setProgressTotal(chapters);
        await fetchBook(book, bookIdx + 1, chapters, 0, allHits);
      }
    } else {
      const total = CHAPTER_COUNTS.reduce((a, b) => a + b, 0);
      setProgressTotal(total);
      let done = 0;
      for (let bi = 0; bi < BIBLE_BOOKS.length; bi++) {
        if (ctrl.signal.aborted) break;
        const bChapters = CHAPTER_COUNTS[bi] ?? 1;
        await fetchBook(BIBLE_BOOKS[bi], bi + 1, bChapters, done, allHits);
        done += bChapters;
      }
    }

    if (!ctrl.signal.aborted) setSearching(false);
  }, [book]);

  const handleSelectScope = (s: CPScope) => {
    setScope(s);
    setFetchedHits([]);
    setProgress(0);
    setProgressTotal(0);
    abortRef.current?.abort();
    if (selected && s !== "chapter") {
      runWideSearch(selected, s);
    }
  };

  const handleSelectChar = (c: typeof CHARACTERS[number]) => {
    const next = selected?.name === c.name ? null : c;
    setSelected(next);
    setFetchedHits([]);
    setProgress(0);
    abortRef.current?.abort();
    if (next && scope !== "chapter") {
      runWideSearch(next, scope);
    }
  };

  const displayVerses: { book: string; chapter: number; verse: number; text: string }[] =
    scope === "chapter"
      ? verses.filter(v => chapterVerseMatches.has(v.verse)).map(v => ({
          book, chapter: parseInt(chapter) || 1, verse: v.verse, text: v.text,
        }))
      : fetchedHits;

  const matchCount = displayVerses.length;

  const refForSelected = selected
    ? `${scope === "chapter" ? reference.split(":")[0] : scope === "book" ? `Book of ${book}` : "Whole Bible"} — ${selected.name}`
    : "";

  const scopeLabel = scope === "chapter" ? reference : scope === "book" ? `Book of ${book}` : "Whole Bible";

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <User className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium">Character Perspective</span>
          {selected && (
            <Badge variant="outline" className="text-[10px] gap-1">
              {selected.emoji} {selected.name} — {matchCount} verse{matchCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {!selected && (
            <span className="text-xs text-muted-foreground">Select a character to highlight their verses</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border/60 p-4 space-y-4">
          {/* Scope */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Search in:</span>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(["chapter", "book", "bible"] as CPScope[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelectScope(s)}
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
          </div>

          {scope === "chapter" && !verses.length && (
            <p className="text-sm text-muted-foreground text-center py-2">Fetch a Bible passage first, then select a character to highlight their verses.</p>
          )}

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search character…" className="pl-8 h-8 text-xs" />
            </div>
            {selected && (
              <button type="button" onClick={() => { setSelected(null); setFetchedHits([]); abortRef.current?.abort(); }}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {filtered.map(c => (
              <button key={c.name} type="button"
                onClick={() => handleSelectChar(c)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-colors ${
                  selected?.name === c.name
                    ? "bg-primary/20 border-primary text-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>

          {/* Progress while searching */}
          {searching && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Scanning {scope === "bible" ? `Bible… ${progress} of ${progressTotal} chapters` : `${book}… chapter ${progress} of ${progressTotal}`}
                </span>
                <button type="button" onClick={() => abortRef.current?.abort()} className="hover:text-foreground">Stop</button>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: progressTotal > 0 ? `${(progress / progressTotal) * 100}%` : "5%" }}
                />
              </div>
              {fetchedHits.length > 0 && (
                <p className="text-xs text-muted-foreground">{fetchedHits.length} match{fetchedHits.length !== 1 ? "es" : ""} found so far…</p>
              )}
            </div>
          )}

          {selected && (scope === "chapter" ? verses.length > 0 : true) && !searching && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {matchCount === 0
                    ? `${selected.emoji} ${selected.name} is not mentioned in ${scopeLabel}.`
                    : `${selected.emoji} ${selected.name} appears in ${matchCount} verse${matchCount !== 1 ? "s" : ""} in ${scopeLabel}`}
                </p>
                {matchCount > 0 && (
                  <Button size="sm" className="gap-1.5 h-7 text-xs"
                    onClick={() => onSendVerses(
                      displayVerses.map(v => ({ verse: v.verse, text: v.text })),
                      refForSelected
                    )}>
                    <Cast className="w-3 h-3" /> Send {matchCount}
                  </Button>
                )}
              </div>

              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {displayVerses.map((v, idx) => {
                  const parts = highlightTerms(v.text, selected.terms);
                  return (
                    <div key={idx}
                      className="flex gap-2 text-sm p-2 rounded-md bg-primary/10 border border-primary/20">
                      <div className="shrink-0 mt-0.5 text-right min-w-[2rem]">
                        {scope !== "chapter" && (
                          <span className="text-[10px] font-bold text-primary block">{v.book} {v.chapter}</span>
                        )}
                        <span className="font-bold text-xs text-primary">{v.verse}</span>
                      </div>
                      <span className="font-serif leading-relaxed">
                        {parts.map((p, i) =>
                          p.match
                            ? <mark key={i} className="bg-amber-400/30 text-amber-200 rounded-sm px-0.5 not-italic">{p.part}</mark>
                            : <span key={i}>{p.part}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {scope === "chapter" && matchCount === 0 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  Try switching to "Book" or "Whole Bible" to search beyond this chapter.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
