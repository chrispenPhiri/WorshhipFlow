import { useState, useMemo } from "react";
import { User, Search, Cast, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface BibleVerse { verse: number; text: string; }

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

interface Props {
  verses: BibleVerse[];
  reference: string;
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

export function CharacterPerspective({ verses, reference, onSendVerses }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof CHARACTERS[number] | null>(null);

  const filtered = CHARACTERS.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const verseMatches = useMemo(() => {
    if (!selected || !verses.length) return new Set<number>();
    const terms = selected.terms.map(t => t.toLowerCase());
    return new Set(
      verses
        .filter(v => terms.some(term => v.text.toLowerCase().includes(term)))
        .map(v => v.verse)
    );
  }, [selected, verses]);

  const matchingVerses = verses.filter(v => verseMatches.has(v.verse));
  const refForSelected = selected
    ? `${reference.split(":")[0]} — ${selected.name}`
    : "";

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
              {selected.emoji} {selected.name} — {verseMatches.size} verse{verseMatches.size !== 1 ? "s" : ""}
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
          {!verses.length && (
            <p className="text-sm text-muted-foreground text-center py-2">Fetch a Bible passage first, then select a character to highlight their verses.</p>
          )}

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search character…" className="pl-8 h-8 text-xs" />
            </div>
            {selected && (
              <button type="button" onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {filtered.map(c => (
              <button key={c.name} type="button"
                onClick={() => setSelected(s => s?.name === c.name ? null : c)}
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

          {selected && verses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {verseMatches.size === 0
                    ? `${selected.emoji} ${selected.name} is not mentioned in this passage.`
                    : `${selected.emoji} ${selected.name} appears in ${verseMatches.size} of ${verses.length} verses`}
                </p>
                {matchingVerses.length > 0 && (
                  <Button size="sm" className="gap-1.5 h-7 text-xs"
                    onClick={() => onSendVerses(matchingVerses, refForSelected)}>
                    <Cast className="w-3 h-3" /> Send {matchingVerses.length}
                  </Button>
                )}
              </div>

              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {verses.map(v => {
                  const isMatch = verseMatches.has(v.verse);
                  const parts = isMatch ? highlightTerms(v.text, selected.terms) : [];
                  return (
                    <div key={v.verse}
                      className={`flex gap-2 text-sm p-2 rounded-md transition-colors ${
                        isMatch
                          ? "bg-primary/10 border border-primary/20"
                          : "opacity-30"
                      }`}>
                      <span className={`font-bold text-xs w-5 shrink-0 mt-0.5 text-right ${isMatch ? "text-primary" : "text-muted-foreground"}`}>
                        {v.verse}
                      </span>
                      <span className="font-serif leading-relaxed">
                        {isMatch
                          ? parts.map((p, i) =>
                              p.match
                                ? <mark key={i} className="bg-amber-400/30 text-amber-200 rounded-sm px-0.5 not-italic">{p.part}</mark>
                                : <span key={i}>{p.part}</span>
                            )
                          : v.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
