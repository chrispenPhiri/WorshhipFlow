import { useState, useEffect, useRef } from "react";
import { Globe, Search, ChevronDown, Cast, Loader2, RefreshCw, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BIBLE_BOOKS } from "@/lib/constants";

interface Translation {
  translation: string;
  abbreviation: string;
  lang: string;
  language: string;
  direction: string;
}

interface ChapterVerse {
  chapter: number;
  verse: number;
  name: string;
  text: string;
}

interface Props {
  book: string;
  chapter: string;
  fromVerse: string;
  toVerse: string;
  onSendToScreen: (text: string, ref: string, abbr: string) => void;
}

const LANG_EMOJI: Record<string, string> = {
  English: "🇬🇧", Afrikaans: "🇿🇦", Arabic: "🇸🇦", Bulgarian: "🇧🇬",
  Chinese: "🇨🇳", Czech: "🇨🇿", Danish: "🇩🇰", Dutch: "🇳🇱",
  Estonian: "🇪🇪", Finnish: "🇫🇮", French: "🇫🇷", German: "🇩🇪",
  Greek: "🇬🇷", Hebrew: "🇮🇱", Hungarian: "🇭🇺", Italian: "🇮🇹",
  Japanese: "🇯🇵", Korean: "🇰🇷", Latin: "🇻🇦", Norwegian: "🇳🇴",
  Polish: "🇵🇱", Portuguese: "🇵🇹", Romanian: "🇷🇴", Russian: "🇷🇺",
  Serbian: "🇷🇸", Slovak: "🇸🇰", Slovenian: "🇸🇮", Spanish: "🇪🇸",
  Swedish: "🇸🇪", Tamil: "🇮🇳", Thai: "🇹🇭", Turkish: "🇹🇷",
  Ukrainian: "🇺🇦", Vietnamese: "🇻🇳",
};

export function DigitalLibrary({ book, chapter, fromVerse, toVerse, onSendToScreen }: Props) {
  const [open, setOpen] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [langFilter, setLangFilter] = useState("");
  const [selected, setSelected] = useState<Translation | null>(null);
  const [verses, setVerses] = useState<ChapterVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [translationsLoading, setTranslationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (open && !fetchedRef.current) {
      fetchedRef.current = true;
      setTranslationsLoading(true);
      fetch("https://api.getbible.net/v2/translations.json")
        .then(r => r.json())
        .then((data: Record<string, Translation>) => {
          const list = Object.values(data).sort((a, b) => a.language.localeCompare(b.language));
          setTranslations(list);
        })
        .catch(() => setError("Could not load translation list. Check your internet connection."))
        .finally(() => setTranslationsLoading(false));
    }
  }, [open]);

  const bookNum = BIBLE_BOOKS.indexOf(book) + 1;
  const chapterNum = parseInt(chapter) || 1;
  const fromV = parseInt(fromVerse) || 1;
  const toV = parseInt(toVerse) || fromV;

  const fetchVerses = async (t: Translation) => {
    if (bookNum < 1) { setError("Invalid book selection."); return; }
    setSelected(t);
    setLoading(true);
    setError(null);
    setVerses([]);
    try {
      const url = `https://api.getbible.net/v2/${t.abbreviation}/${bookNum}/${chapterNum}.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const chapter_data: Record<string, ChapterVerse> = data.chapter ?? {};
      const all = Object.values(chapter_data);
      const filtered = all.filter(v => v.verse >= fromV && v.verse <= toV);
      setVerses(filtered.length > 0 ? filtered : all.slice(0, 10));
    } catch {
      setError(`Could not fetch ${t.abbreviation.toUpperCase()} — this translation may not have this passage.`);
    } finally {
      setLoading(false);
    }
  };

  const groupedByLang = translations.reduce<Record<string, Translation[]>>((acc, t) => {
    const lang = t.language || "Other";
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(t);
    return acc;
  }, {});

  const filteredLangs = Object.entries(groupedByLang)
    .filter(([lang]) => !langFilter || lang.toLowerCase().includes(langFilter.toLowerCase()) ||
      groupedByLang[lang].some(t => t.translation.toLowerCase().includes(langFilter.toLowerCase()) || t.abbreviation.toLowerCase().includes(langFilter.toLowerCase())))
    .sort(([a], [b]) => a.localeCompare(b));

  const resultText = verses.map(v => `${v.verse} ${v.text.trim()}`).join("\n");
  const resultRef = selected ? `${book} ${chapterNum}:${verses[0]?.verse ?? fromV}–${verses[verses.length - 1]?.verse ?? toV} (${selected.abbreviation.toUpperCase()})` : "";

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <Globe className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">Digital Bible Library</span>
          <span className="text-xs text-muted-foreground ml-2">500+ translations across 100+ languages</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border/60 p-4 space-y-4">
          {translationsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading translations…
            </div>
          )}

          {!translationsLoading && translations.length > 0 && (
            <>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={langFilter}
                    onChange={e => setLangFilter(e.target.value)}
                    placeholder="Search language or translation…"
                    className="pl-8 h-8 text-xs"
                  />
                  {langFilter && (
                    <button onClick={() => setLangFilter("")} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{translations.length} translations</Badge>
              </div>

              <ScrollArea className="h-56 pr-1">
                <div className="space-y-2">
                  {filteredLangs.map(([lang, tList]) => (
                    <div key={lang}>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground/70 tracking-wider mb-1 flex items-center gap-1">
                        {LANG_EMOJI[lang] || "🌐"} {lang}
                      </p>
                      <div className="flex flex-wrap gap-1.5 ml-4">
                        {tList.map(t => (
                          <button
                            key={t.abbreviation}
                            type="button"
                            onClick={() => fetchVerses(t)}
                            className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                              selected?.abbreviation === t.abbreviation
                                ? "bg-primary/20 border-primary text-primary font-medium"
                                : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            }`}
                            title={t.translation}
                          >
                            {t.abbreviation.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredLangs.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No matches for "{langFilter}"</p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching {selected?.abbreviation.toUpperCase()}…
            </div>
          )}

          {verses.length > 0 && selected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium">{book} {chapterNum} — {selected.translation}</span>
                  <Badge variant="outline" className="text-[10px]">{selected.language}</Badge>
                  {selected.direction === "RTL" && <Badge variant="outline" className="text-[10px]">RTL</Badge>}
                </div>
                <button type="button" onClick={() => setVerses([])} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className={`p-3 rounded-lg bg-muted/30 border border-border space-y-1 ${selected.direction === "RTL" ? "text-right" : ""}`} dir={selected.direction}>
                {verses.map(v => (
                  <p key={v.verse} className="text-sm font-serif leading-relaxed">
                    <span className="text-primary/70 font-bold text-xs mr-1.5">{v.verse}</span>
                    {v.text.trim()}
                  </p>
                ))}
              </div>
              <Button size="sm" className="w-full gap-2" onClick={() => onSendToScreen(resultText, resultRef, selected.abbreviation.toUpperCase())}>
                <Cast className="w-3.5 h-3.5" /> Send to Screen
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
