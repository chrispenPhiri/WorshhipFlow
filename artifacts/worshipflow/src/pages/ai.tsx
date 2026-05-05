import { useState, useRef, useEffect } from "react";
import {
  Sparkles, Send, Loader2, BookOpen, AlignLeft, Lightbulb, RotateCcw,
  ChevronDown, ChevronUp, X, User, Bot, Monitor, FileDown,
  FileText, HandHeart, ListMusic, Megaphone,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function streamPost(
  path: string,
  body: object,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch(`${BASE}/api/ai${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(await res.text());
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const json = JSON.parse(part.slice(6));
      if (json.content) onChunk(json.content);
    }
  }
}

/** Open a print-friendly window with the AI content. */
function exportToPDF(title: string, content: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  win.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 48px auto; line-height: 1.75; color: #1a1a1a; padding: 0 24px; }
  h1 { font-size: 1.6rem; margin-bottom: 0.5rem; color: #1e1b4b; }
  .meta { font-size: 0.85rem; color: #666; margin-bottom: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 1rem; }
  .content { font-size: 1rem; }
  @media print { body { margin: 24px; } }
</style>
</head><body>
<h1>${title}</h1>
<div class="meta">Exported from Phiri WorshipFlow · ${new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
<div class="content">${escaped}</div>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

type ProphetMsg = { role: "user" | "assistant"; content: string };

function ProphetChat({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [messages, setMessages] = useState<ProphetMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const SUGGESTED = [
    "What is the context of the Sermon on the Mount?",
    "Who were the Pharisees and why did they oppose Jesus?",
    "What does 'grace' mean in the New Testament?",
    "Explain the significance of Passover in Exodus",
    "What is the meaning of Psalm 23?",
  ];

  async function send(question: string = input) {
    if (!question.trim() || loading) return;
    const userMsg: ProphetMsg = { role: "user", content: question };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    const assistantMsg: ProphetMsg = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);
    try {
      await streamPost(
        "/prophet",
        { question, history: messages },
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: updated[updated.length - 1].content + chunk,
            };
            return updated;
          });
        }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  const lastAssistant = [...messages].reverse().find(m => m.role === "assistant" && m.content);

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Ask any theological question and get a rich, contextual answer grounded in Scripture and church tradition.</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button key={s} type="button"
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors text-left">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <ScrollArea className="h-[380px] pr-2">
          <div className="space-y-4 pb-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/50 text-foreground rounded-tl-sm border border-border/50"
                }`}>
                  {m.content || (loading && i === messages.length - 1 && (
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                    </span>
                  ))}
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      {lastAssistant && onSendToScreen && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm" variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => onSendToScreen(lastAssistant.content, "Ask a Prophet")}
          >
            <Monitor className="w-3.5 h-3.5" /> Send to screen
          </Button>
          <Button
            size="sm" variant="ghost"
            className="gap-1.5 text-xs"
            onClick={() => exportToPDF("Ask a Prophet — AI Response", lastAssistant.content)}
          >
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask a theological question…"
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={() => send()} disabled={!input.trim() || loading} className="gap-2 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Ask
        </Button>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setMessages([])} title="Clear chat">
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function AISummary({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const QUICK = [
    { book: "Genesis", chapter: "1" },
    { book: "Psalms", chapter: "23" },
    { book: "Isaiah", chapter: "53" },
    { book: "John", chapter: "3" },
    { book: "Romans", chapter: "8" },
    { book: "Revelation", chapter: "21" },
    { book: "Leviticus", chapter: "16" },
    { book: "Proverbs", chapter: "31" },
  ];

  async function generate(b = book, c = chapter) {
    if (!b.trim()) return;
    setLoading(true);
    setResult("");
    setError(null);
    try {
      await streamPost("/summary", { book: b, chapter: c || "1" }, (chunk) => {
        setResult((prev) => prev + chunk);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const bullets = result.split(/(?=•)/).filter(Boolean);
  const summaryTitle = book && chapter ? `${book} ${chapter} — Summary` : "AI Chapter Summary";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Get a 3-bullet TL;DR of any Bible chapter — great for understanding the main theme before a service or sermon.</p>

      <div className="flex gap-2">
        <Input value={book} onChange={(e) => setBook(e.target.value)}
          placeholder="Book (e.g. Leviticus)" className="flex-1" disabled={loading} />
        <Input value={chapter} onChange={(e) => setChapter(e.target.value)}
          placeholder="Ch." className="w-20" type="number" min={1} disabled={loading} />
        <Button onClick={() => generate()} disabled={!book.trim() || loading} className="gap-2 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlignLeft className="w-4 h-4" />}
          Summarise
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button key={`${q.book}${q.chapter}`} type="button"
            onClick={() => { setBook(q.book); setChapter(q.chapter); generate(q.book, q.chapter); }}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
            {q.book} {q.chapter}
          </button>
        ))}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {result && (
        <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{summaryTitle}</p>
            <div className="flex gap-1.5">
              {onSendToScreen && (
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                  onClick={() => onSendToScreen(result, summaryTitle)}>
                  <Monitor className="w-3 h-3" /> Send to screen
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs"
                onClick={() => exportToPDF(summaryTitle, result)}>
                <FileDown className="w-3 h-3" /> PDF
              </Button>
            </div>
          </div>
          {bullets.length > 0 ? (
            <ul className="space-y-3">
              {bullets.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="text-primary font-bold shrink-0">•</span>
                  <span>{b.replace(/^•\s*/, "")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{result}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ContextLens({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [passage, setPassage] = useState("");
  const [extraText, setExtraText] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const QUICK = [
    "Matthew 13:44-46",
    "John 3:16",
    "Romans 12:1-2",
    "1 Corinthians 13:4-7",
    "Revelation 3:20",
    "Ezekiel 37:1-14",
    "Luke 15:11-32",
    "Hebrews 11:1",
  ];

  async function explain(p = passage) {
    if (!p.trim()) return;
    setLoading(true);
    setResult("");
    setError(null);
    try {
      await streamPost(
        "/context-lens",
        { passage: p, text: extraText || undefined },
        (chunk) => setResult((prev) => prev + chunk)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const lensTitle = passage ? `${passage} — Plain English` : "Context Lens";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Paste any reference or confusing passage and get a plain-English explanation — perfect for new believers or children's ministry.</p>

      <div className="flex gap-2">
        <Input value={passage} onChange={(e) => setPassage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") explain(); }}
          placeholder="Passage (e.g. Revelation 3:20 or Matthew 13:44-46)"
          className="flex-1" disabled={loading} />
        <Button onClick={() => explain()} disabled={!passage.trim() || loading} className="gap-2 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
          Explain
        </Button>
      </div>

      <button type="button" onClick={() => setShowExtra(!showExtra)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {showExtra ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Paste the passage text (optional — for extra accuracy)
      </button>

      {showExtra && (
        <Textarea value={extraText} onChange={(e) => setExtraText(e.target.value)}
          placeholder="Paste the Bible text here…" rows={4} className="text-sm" disabled={loading} />
      )}

      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button key={q} type="button"
            onClick={() => { setPassage(q); explain(q); }}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
            {q}
          </button>
        ))}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {result && (
        <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{lensTitle}</p>
            <div className="flex items-center gap-1.5">
              {onSendToScreen && (
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                  onClick={() => onSendToScreen(result, lensTitle)}>
                  <Monitor className="w-3 h-3" /> Send to screen
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs"
                onClick={() => exportToPDF(lensTitle, result)}>
                <FileDown className="w-3 h-3" /> PDF
              </Button>
              <button type="button" onClick={() => setResult("")} className="text-muted-foreground hover:text-foreground ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}

function SermonOutline({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [topic, setTopic]   = useState("");
  const [verse, setVerse]   = useState("");
  const [style, setStyle]   = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const QUICK = [
    { topic: "Faith over Fear",       verse: "Isaiah 41:10" },
    { topic: "Grace & Forgiveness",   verse: "Ephesians 2:8-9" },
    { topic: "The Holy Spirit",        verse: "Acts 2:1-4" },
    { topic: "Power of Prayer",       verse: "Matthew 6:5-15" },
    { topic: "Hope in Suffering",     verse: "Romans 5:3-5" },
    { topic: "Love Your Neighbour",   verse: "Luke 10:25-37" },
  ];

  async function generate(t = topic) {
    if (!t.trim()) return;
    setLoading(true); setResult(""); setError(null);
    try {
      await streamPost("/sermon-outline", { topic: t, verse: verse || undefined, style: style || undefined }, chunk => setResult(p => p + chunk));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  }

  const outlineTitle = topic ? `Sermon Outline: ${topic}` : "Sermon Outline";
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Generate a structured, Scripture-rich sermon outline for any topic or passage.</p>
      <div className="grid grid-cols-2 gap-2">
        <Input value={topic} onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") generate(); }}
          placeholder="Topic (e.g. Faith over Fear)" className="col-span-2" disabled={loading} />
        <Input value={verse} onChange={e => setVerse(e.target.value)} placeholder="Key verse (optional)" disabled={loading} />
        <Input value={style} onChange={e => setStyle(e.target.value)} placeholder="Style (e.g. expository)" disabled={loading} />
      </div>
      <Button onClick={() => generate()} disabled={!topic.trim() || loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Generate Outline
      </Button>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map(q => (
          <button key={q.topic} type="button" onClick={() => { setTopic(q.topic); setVerse(q.verse); setTimeout(() => generate(q.topic), 0); }}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
            {q.topic}
          </button>
        ))}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {result && (
        <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{outlineTitle}</p>
            <div className="flex items-center gap-1.5">
              {onSendToScreen && <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => onSendToScreen(result, outlineTitle)}><Monitor className="w-3 h-3" /> Send to screen</Button>}
              <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs" onClick={() => exportToPDF(outlineTitle, result)}><FileDown className="w-3 h-3" /> PDF</Button>
              <button type="button" onClick={() => setResult("")} className="text-muted-foreground hover:text-foreground ml-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}

function PrayerGenerator({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [topic, setTopic]     = useState("");
  const [type, setType]       = useState("opening");
  const [occasion, setOccasion] = useState("");
  const [result, setResult]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const TYPES = [
    { value: "opening", label: "Opening" }, { value: "closing", label: "Closing" },
    { value: "intercessory", label: "Intercessory" }, { value: "thanksgiving", label: "Thanksgiving" },
    { value: "consecration", label: "Consecration" }, { value: "communion", label: "Communion" },
  ];

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setResult(""); setError(null);
    try {
      await streamPost("/prayer", { type, topic, occasion: occasion || undefined }, chunk => setResult(p => p + chunk));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  }

  const prayerTitle = `${type.charAt(0).toUpperCase() + type.slice(1)} Prayer: ${topic}`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Generate heartfelt, Scripture-inspired prayers for any church occasion.</p>
      <div className="grid grid-cols-3 gap-1.5">
        {TYPES.map(t => (
          <button key={t.value} type="button" onClick={() => setType(t.value)}
            className={`py-1.5 rounded text-xs border transition-colors ${type === t.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={topic} onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") generate(); }}
          placeholder="Prayer focus (e.g. healing, our nation, Sunday service)" className="flex-1" disabled={loading} />
        <Input value={occasion} onChange={e => setOccasion(e.target.value)} placeholder="Occasion (optional)" className="w-40" disabled={loading} />
      </div>
      <Button onClick={() => generate()} disabled={!topic.trim() || loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandHeart className="w-4 h-4" />}
        Write Prayer
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {result && (
        <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{prayerTitle}</p>
            <div className="flex items-center gap-1.5">
              {onSendToScreen && <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => onSendToScreen(result, prayerTitle)}><Monitor className="w-3 h-3" /> Send to screen</Button>}
              <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs" onClick={() => exportToPDF(prayerTitle, result)}><FileDown className="w-3 h-3" /> PDF</Button>
              <button type="button" onClick={() => setResult("")} className="text-muted-foreground hover:text-foreground ml-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}

function WorshipSetPlanner({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [theme, setTheme]     = useState("");
  const [occasion, setOccasion] = useState("");
  const [numSongs, setNumSongs] = useState(5);
  const [result, setResult]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const QUICK_THEMES = ["Grace & Mercy", "Victory & Praise", "Holy Spirit", "Christmas", "Easter / Resurrection", "Healing & Restoration", "Mission & Evangelism"];

  async function generate(t = theme) {
    if (!t.trim()) return;
    setLoading(true); setResult(""); setError(null);
    try {
      await streamPost("/worship-set", { theme: t, occasion: occasion || undefined, numSongs }, chunk => setResult(p => p + chunk));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  }

  const setTitle = theme ? `Worship Set: ${theme}` : "Worship Set Plan";
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Plan a cohesive worship set with suggested songs, flow, and Scripture readings.</p>
      <div className="grid grid-cols-3 gap-2">
        <Input value={theme} onChange={e => setTheme(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") generate(); }}
          placeholder="Theme (e.g. Grace & Mercy)" className="col-span-2" disabled={loading} />
        <select value={numSongs} onChange={e => setNumSongs(Number(e.target.value))}
          className="h-9 rounded border border-input bg-background text-sm px-2 text-foreground" disabled={loading}>
          {[3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} songs</option>)}
        </select>
      </div>
      <Input value={occasion} onChange={e => setOccasion(e.target.value)} placeholder="Occasion (e.g. Christmas Service, Youth Night) — optional" disabled={loading} />
      <Button onClick={() => generate()} disabled={!theme.trim() || loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListMusic className="w-4 h-4" />}
        Plan Worship Set
      </Button>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_THEMES.map(t => (
          <button key={t} type="button" onClick={() => { setTheme(t); generate(t); }}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
            {t}
          </button>
        ))}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {result && (
        <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{setTitle}</p>
            <div className="flex items-center gap-1.5">
              {onSendToScreen && <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => onSendToScreen(result, setTitle)}><Monitor className="w-3 h-3" /> Send to screen</Button>}
              <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs" onClick={() => exportToPDF(setTitle, result)}><FileDown className="w-3 h-3" /> PDF</Button>
              <button type="button" onClick={() => setResult("")} className="text-muted-foreground hover:text-foreground ml-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}

function AnnouncementWriter({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [topic, setTopic]     = useState("");
  const [details, setDetails] = useState("");
  const [tone, setTone]       = useState("warm and inviting");
  const [result, setResult]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const TONES = [
    { value: "warm and inviting", label: "Warm" }, { value: "formal and professional", label: "Formal" },
    { value: "energetic and exciting", label: "Energetic" }, { value: "solemn and reverent", label: "Solemn" },
  ];

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setResult(""); setError(null);
    try {
      await streamPost("/announcement", { topic, details: details || undefined, tone }, chunk => setResult(p => p + chunk));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  }

  const annTitle = topic ? `Announcement: ${topic}` : "Church Announcement";
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Write engaging church announcements for Sunday services, bulletins, and presentation slides.</p>
      <div className="grid grid-cols-4 gap-1.5">
        {TONES.map(t => (
          <button key={t.value} type="button" onClick={() => setTone(t.value)}
            className={`py-1.5 rounded text-xs border transition-colors ${tone === t.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <Input value={topic} onChange={e => setTopic(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") generate(); }}
        placeholder="Topic (e.g. Youth Camp, Baptism Sunday, Food Drive)" disabled={loading} />
      <Textarea value={details} onChange={e => setDetails(e.target.value)}
        placeholder="Extra details — date, time, location, contact info… (optional)" rows={2} className="text-sm" disabled={loading} />
      <Button onClick={() => generate()} disabled={!topic.trim() || loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
        Write Announcement
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {result && (
        <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{annTitle}</p>
            <div className="flex items-center gap-1.5">
              {onSendToScreen && <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => onSendToScreen(result, annTitle)}><Monitor className="w-3 h-3" /> Send to screen</Button>}
              <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs" onClick={() => exportToPDF(annTitle, result)}><FileDown className="w-3 h-3" /> PDF</Button>
              <button type="button" onClick={() => setResult("")} className="text-muted-foreground hover:text-foreground ml-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}

export default function AIPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: screenState } = useGetScreenState({ query: { queryKey: getGetScreenStateQueryKey() } });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }) }
  });

  function sendToScreen(content: string, title: string) {
    updateScreen({
      data: {
        isBlack: screenState?.isBlack ?? false,
        isClear: false,
        contentType: "custom_text",
        title,
        content,
        textStyle: {
          fontFamily: "Georgia",
          fontSize: 42,
          textColor: "#ffffff",
          alignment: "center",
          animation: "fade_in",
          bold: false,
          italic: false,
        },
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1c1665 100%)",
          overlay: 0,
        },
        tickerEnabled: screenState?.tickerEnabled ?? false,
        comparisonMode: false,
      }
    });
    toast({ title: "Sent to screen", description: title });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 pb-12">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">AI-Powered Features</h1>
          <Badge variant="secondary" className="text-[10px]">Online</Badge>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Powered by AI — requires an internet connection. All features are free to use.
        </p>
      </div>

      <Tabs defaultValue="prophet">
        <TabsList className="w-full h-auto flex-wrap gap-0.5">
          <TabsTrigger value="prophet" className="flex-1 gap-1.5 min-w-fit">
            <Bot className="w-4 h-4" /> Ask a Prophet
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex-1 gap-1.5 min-w-fit">
            <AlignLeft className="w-4 h-4" /> AI Summary
          </TabsTrigger>
          <TabsTrigger value="lens" className="flex-1 gap-1.5 min-w-fit">
            <Lightbulb className="w-4 h-4" /> Context Lens
          </TabsTrigger>
          <TabsTrigger value="sermon" className="flex-1 gap-1.5 min-w-fit">
            <FileText className="w-4 h-4" /> Sermon Outline
          </TabsTrigger>
          <TabsTrigger value="prayer" className="flex-1 gap-1.5 min-w-fit">
            <HandHeart className="w-4 h-4" /> Prayer
          </TabsTrigger>
          <TabsTrigger value="worship-set" className="flex-1 gap-1.5 min-w-fit">
            <ListMusic className="w-4 h-4" /> Worship Set
          </TabsTrigger>
          <TabsTrigger value="announcement" className="flex-1 gap-1.5 min-w-fit">
            <Megaphone className="w-4 h-4" /> Announcements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prophet" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" /> Ask a Prophet
              </CardTitle>
              <CardDescription>
                An AI assistant trained on theological commentaries, church history, and Scripture. Ask anything about the Bible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProphetChat onSendToScreen={sendToScreen} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-primary" /> AI Chapter Summary
                <Badge variant="outline" className="text-[10px] ml-auto">TL;DR</Badge>
              </CardTitle>
              <CardDescription>
                Get a 3-bullet summary of any Bible chapter — ideal for long books like Leviticus, Numbers, or Revelation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AISummary onSendToScreen={sendToScreen} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lens" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" /> Context Lens
                <Badge variant="outline" className="text-[10px] ml-auto">ELI5</Badge>
              </CardTitle>
              <CardDescription>
                Explain any passage in plain English — simplifies complex parables, archaic language, and dense theology.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContextLens onSendToScreen={sendToScreen} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sermon" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Sermon Outline Generator
              </CardTitle>
              <CardDescription>
                Generate structured, Scripture-rich sermon outlines for any topic — with main points, sub-points, application, and a call to action.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SermonOutline onSendToScreen={sendToScreen} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prayer" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandHeart className="w-4 h-4 text-primary" /> Prayer Generator
              </CardTitle>
              <CardDescription>
                Write heartfelt, Scripture-inspired prayers for any type of church service — opening, closing, intercessory, communion, and more.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrayerGenerator onSendToScreen={sendToScreen} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worship-set" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-primary" /> Worship Set Planner
              </CardTitle>
              <CardDescription>
                Plan a complete worship set with song suggestions, keys, tempo, Scripture readings, and a flow arc from gathering to response.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorshipSetPlanner onSendToScreen={sendToScreen} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcement" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" /> Announcement Writer
              </CardTitle>
              <CardDescription>
                Write polished church announcements for Sunday bulletins and slides — with a catchy headline, key details, and a clear call to action.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnnouncementWriter onSendToScreen={sendToScreen} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">About AI Features:</strong> Responses are AI-generated and should be used as a starting point for study, not as a replacement for Scripture or pastoral guidance.</p>
              <p>These features use <strong className="text-foreground">Replit AI Integrations</strong> and require an active internet connection. No data is stored after your session ends.</p>
              <p className="flex items-center gap-1.5 mt-1"><Monitor className="w-3 h-3 text-primary" /> Use <strong className="text-foreground">Send to screen</strong> to project any AI response on your presentation display. <FileDown className="w-3 h-3 text-primary ml-1" /> Use <strong className="text-foreground">Export PDF</strong> to print or save as a document.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
