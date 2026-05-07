import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useSessionStorage } from "@/hooks/use-session-storage";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { CollapsibleTabsBar } from "@/components/ui/collapsible-tabs";
import {
  Sparkles, Send, Loader2, BookOpen, AlignLeft, Lightbulb, RotateCcw,
  ChevronDown, ChevronUp, X, User, Bot, Monitor, FileDown,
  FileText, HandHeart, ListMusic, Megaphone,
  Sunrise, ListChecks, Link2, Languages, Baby, Wand2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
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

import { getAiHeaders } from "@/lib/ai-headers";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function streamPost(
  path: string,
  body: object,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch(`${BASE}/api/ai${path}`, {
    method: "POST",
    headers: getAiHeaders(),
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

/* ─────────────────────────────────────────────────────────────────
   Refine panel — drop-in for any one-shot AI result.
   When user submits a refinement, calls /refine and streams the
   result back, replacing the original via setResult.
   ───────────────────────────────────────────────────────────────── */
function RefinePanel({
  kind, original, setResult,
}: {
  kind: string;
  original: string;
  setResult: (next: string | ((prev: string) => string)) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Live in-progress refine buffer — shown beneath the original until streaming
  // completes, then atomically swapped into the result. Keeps the original
  // visible if streaming fails mid-way.
  const [draft, setDraft] = useState("");

  async function refine() {
    if (!text.trim() || loading) return;
    const snapshot = original;
    setLoading(true);
    setError(null);
    setDraft("");
    let buffer = "";
    try {
      await streamPost("/refine", { kind, original: snapshot, refinement: text }, (chunk) => {
        buffer += chunk;
        setDraft(buffer);
      });
      // Only replace the original after a successful full stream
      if (buffer.trim()) setResult(buffer);
      setDraft("");
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refine failed");
      setDraft(""); // discard partial draft, original stays intact
    } finally {
      setLoading(false);
    }
  }

  const QUICK_REFINEMENTS = [
    "Make it shorter",
    "Make it longer / more detailed",
    "Use simpler language",
    "More Scripture references",
    "Warmer / more personal tone",
  ];

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
          <Wand2 className="w-3 h-3" /> Reply / refine this response
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Wand2 className="w-3 h-3" /> Tell the AI what to change
            </p>
            <button type="button" onClick={() => { setOpen(false); setText(""); setError(null); }}
              className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <Textarea
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); refine(); } }}
            placeholder="e.g. make it shorter, add more Scripture, change the tone…"
            rows={2} className="text-sm resize-none" disabled={loading} />
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REFINEMENTS.map((q) => (
              <button key={q} type="button" disabled={loading}
                onClick={() => setText(q)}
                className="text-[10.5px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
                {q}
              </button>
            ))}
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={refine} disabled={!text.trim() || loading} className="gap-1.5 h-8 text-xs">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {loading ? "Refining…" : "Refine"}
            </Button>
            <p className="text-[10px] text-muted-foreground self-center">⌘ / Ctrl + Enter to submit</p>
          </div>
          {(loading || draft) && draft && (
            <div className="mt-2 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-1">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                <Loader2 className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refined version (preview)
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ResultActions — Send-to-screen / Export PDF / Dismiss / Refine.
   Shared by every one-shot AI feature.
   ───────────────────────────────────────────────────────────────── */
function ResultBlock({
  title, content, kind, setResult, onSendToScreen, dismissable = true,
}: {
  title: string;
  content: string;
  kind: string;
  setResult: (next: string | ((prev: string) => string)) => void;
  onSendToScreen?: (content: string, title: string) => void;
  dismissable?: boolean;
}) {
  return (
    <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className="flex items-center gap-1.5">
          {onSendToScreen && (
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
              onClick={() => onSendToScreen(content, title)}>
              <Monitor className="w-3 h-3" /> Send to screen
            </Button>
          )}
          <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs"
            onClick={() => exportToPDF(title, content)}>
            <FileDown className="w-3 h-3" /> PDF
          </Button>
          {dismissable && (
            <button type="button" onClick={() => setResult("")}
              className="text-muted-foreground hover:text-foreground ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      <RefinePanel kind={kind} original={content} setResult={setResult} />
    </div>
  );
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
        <ResultBlock title={summaryTitle} content={result} kind="chapter summary"
          setResult={setResult} onSendToScreen={onSendToScreen} />
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
        <ResultBlock title={lensTitle} content={result} kind="plain-English Bible explanation"
          setResult={setResult} onSendToScreen={onSendToScreen} />
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
        <ResultBlock title={outlineTitle} content={result} kind="sermon outline"
          setResult={setResult} onSendToScreen={onSendToScreen} />
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
        <ResultBlock title={prayerTitle} content={result} kind={`${type} prayer`}
          setResult={setResult} onSendToScreen={onSendToScreen} />
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
        <ResultBlock title={setTitle} content={result} kind="worship set plan"
          setResult={setResult} onSendToScreen={onSendToScreen} />
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
        <ResultBlock title={annTitle} content={result} kind="church announcement"
          setResult={setResult} onSendToScreen={onSendToScreen} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NEW: Daily Devotional
   ───────────────────────────────────────────────────────────────── */
function Devotional({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [verse, setVerse] = useState("");
  const [theme, setTheme] = useState("");
  const [audience, setAudience] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const QUICK = ["Psalm 23:1", "Philippians 4:13", "Isaiah 40:31", "Proverbs 3:5-6", "Romans 8:28", "John 14:27"];

  async function generate(v = verse, t = theme) {
    if (!v.trim() && !t.trim()) return;
    setLoading(true); setResult(""); setError(null);
    try {
      await streamPost("/devotional", {
        verse: v || undefined,
        theme: t || undefined,
        audience: audience || undefined,
      }, chunk => setResult(p => p + chunk));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  }

  const devTitle = verse ? `Devotional — ${verse}` : (theme ? `Devotional — ${theme}` : "Daily Devotional");
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Generate a short, warm daily devotional from any verse or theme — perfect for newsletters, small groups, or personal quiet time.</p>
      <div className="grid grid-cols-2 gap-2">
        <Input value={verse} onChange={e => setVerse(e.target.value)} placeholder="Verse (e.g. Psalm 23:1)" disabled={loading} />
        <Input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Or theme (e.g. trust, joy)" disabled={loading} />
      </div>
      <Input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Audience (e.g. youth, mothers, men's group) — optional" disabled={loading} />
      <Button onClick={() => generate()} disabled={(!verse.trim() && !theme.trim()) || loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sunrise className="w-4 h-4" />}
        Write Devotional
      </Button>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map(q => (
          <button key={q} type="button" onClick={() => { setVerse(q); generate(q, theme); }}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
            {q}
          </button>
        ))}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {result && (
        <ResultBlock title={devTitle} content={result} kind="daily devotional"
          setResult={setResult} onSendToScreen={onSendToScreen} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NEW: Bible Quiz Generator
   ───────────────────────────────────────────────────────────────── */
function BibleQuiz({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const DIFF = [
    { value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" },
  ];
  const QUICK = [
    { book: "Matthew", chapter: "5" }, { book: "Genesis", chapter: "" }, { book: "Acts", chapter: "2" },
    { book: "Psalms", chapter: "23" }, { book: "John", chapter: "" }, { book: "Romans", chapter: "8" },
  ];

  async function generate(b = book, c = chapter) {
    if (!b.trim()) return;
    setLoading(true); setResult(""); setError(null);
    try {
      await streamPost("/quiz", { book: b, chapter: c || undefined, count, difficulty },
        chunk => setResult(p => p + chunk));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  }

  const quizTitle = book ? `Bible Quiz — ${book}${chapter ? ` ${chapter}` : ""}` : "Bible Quiz";
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Generate Sunday-school style multiple-choice quiz questions on any book or chapter — great for youth nights, small groups, or church games.</p>
      <div className="flex gap-2">
        <Input value={book} onChange={e => setBook(e.target.value)} placeholder="Book (e.g. Matthew)" className="flex-1" disabled={loading} />
        <Input value={chapter} onChange={e => setChapter(e.target.value)} placeholder="Ch. (opt)" className="w-24" disabled={loading} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground shrink-0">Questions:</label>
          <select value={count} onChange={e => setCount(Number(e.target.value))}
            className="h-9 rounded border border-input bg-background text-sm px-2 text-foreground flex-1" disabled={loading}>
            {[3, 5, 7, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex gap-1">
          {DIFF.map(d => (
            <button key={d.value} type="button" onClick={() => setDifficulty(d.value)}
              className={`flex-1 py-1.5 rounded text-xs border transition-colors ${difficulty === d.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <Button onClick={() => generate()} disabled={!book.trim() || loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
        Generate Quiz
      </Button>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map(q => (
          <button key={`${q.book}${q.chapter}`} type="button" onClick={() => { setBook(q.book); setChapter(q.chapter); generate(q.book, q.chapter); }}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
            {q.book}{q.chapter && ` ${q.chapter}`}
          </button>
        ))}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {result && (
        <ResultBlock title={quizTitle} content={result} kind="Bible quiz"
          setResult={setResult} onSendToScreen={onSendToScreen} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NEW: Cross-References Finder
   ───────────────────────────────────────────────────────────────── */
function CrossRefs({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [passage, setPassage] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const QUICK = ["John 3:16", "Isaiah 53", "Genesis 1:1", "Romans 8:28", "Matthew 28:19-20", "Hebrews 11:1", "Psalm 23"];

  async function find(p = passage) {
    if (!p.trim()) return;
    setLoading(true); setResult(""); setError(null);
    try {
      await streamPost("/cross-refs", { passage: p }, chunk => setResult(prev => prev + chunk));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  }

  const xrefTitle = passage ? `Cross-References for ${passage}` : "Cross-References";
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Discover related verses across the whole Bible — prophetic echoes, parallel teachings, and supporting passages for any verse you're studying or preaching.</p>
      <div className="flex gap-2">
        <Input value={passage} onChange={e => setPassage(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") find(); }}
          placeholder="Verse or passage (e.g. John 3:16)" className="flex-1" disabled={loading} />
        <Button onClick={() => find()} disabled={!passage.trim() || loading} className="gap-2 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          Find References
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map(q => (
          <button key={q} type="button" onClick={() => { setPassage(q); find(q); }}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
            {q}
          </button>
        ))}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {result && (
        <ResultBlock title={xrefTitle} content={result} kind="cross-references list"
          setResult={setResult} onSendToScreen={onSendToScreen} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NEW: Translate to Local Language
   ───────────────────────────────────────────────────────────────── */
function Translate({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("Chichewa");
  const [register, setRegister] = useState("respectful and reverent");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const LANGUAGES = [
    "Chichewa", "Tumbuka", "Swahili", "Yao", "Lomwe",
    "Zulu", "Xhosa", "Shona", "Ndebele", "Tswana",
    "Yoruba", "Igbo", "Hausa", "Twi", "Amharic",
    "French", "Portuguese", "Spanish", "Arabic", "Mandarin",
    "Hindi", "Tagalog", "Korean", "German", "Russian",
  ];
  const REGISTERS = [
    { value: "respectful and reverent", label: "Reverent" },
    { value: "warm and conversational", label: "Conversational" },
    { value: "formal liturgical", label: "Liturgical" },
    { value: "simple for children", label: "Simple" },
  ];

  async function translate() {
    if (!text.trim() || !language.trim()) return;
    setLoading(true); setResult(""); setError(null);
    try {
      await streamPost("/translate", { text, language, register }, chunk => setResult(p => p + chunk));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  }

  const trTitle = `Translation → ${language}`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Translate any verse, prayer, or announcement into a local or international language for a multilingual congregation.</p>
      <Textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Enter the text to translate (verse, prayer, announcement…)"
        rows={4} className="text-sm" disabled={loading} />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Target Language</label>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="h-9 w-full rounded border border-input bg-background text-sm px-2 text-foreground" disabled={loading}>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Register</label>
          <select value={register} onChange={e => setRegister(e.target.value)}
            className="h-9 w-full rounded border border-input bg-background text-sm px-2 text-foreground" disabled={loading}>
            {REGISTERS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>
      <Input value={language} onChange={e => setLanguage(e.target.value)}
        placeholder="Or type any other language…" disabled={loading} />
      <Button onClick={translate} disabled={!text.trim() || !language.trim() || loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
        Translate
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {result && (
        <ResultBlock title={trTitle} content={result} kind="translation"
          setResult={setResult} onSendToScreen={onSendToScreen} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NEW: Children's Sermon
   ───────────────────────────────────────────────────────────────── */
function ChildrensSermon({ onSendToScreen }: { onSendToScreen?: (content: string, title: string) => void }) {
  const [topic, setTopic] = useState("");
  const [verse, setVerse] = useState("");
  const [ageGroup, setAgeGroup] = useState("ages 5-10");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const AGES = [
    { value: "ages 3-5", label: "Pre-K" }, { value: "ages 5-10", label: "5-10" },
    { value: "ages 10-13", label: "Tweens" }, { value: "youth ages 13-17", label: "Teens" },
  ];
  const QUICK = [
    { topic: "God Loves You",          verse: "John 3:16" },
    { topic: "Be Kind",                verse: "Ephesians 4:32" },
    { topic: "Trust Jesus When Scared",verse: "Joshua 1:9" },
    { topic: "Sharing With Others",    verse: "Acts 2:44-45" },
    { topic: "Forgiving Others",       verse: "Matthew 6:14" },
    { topic: "Jesus Calms the Storm",  verse: "Mark 4:35-41" },
  ];

  async function generate(t = topic, v = verse) {
    if (!t.trim()) return;
    setLoading(true); setResult(""); setError(null);
    try {
      await streamPost("/childrens-sermon", { topic: t, verse: v || undefined, ageGroup },
        chunk => setResult(p => p + chunk));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setLoading(false); }
  }

  const csTitle = topic ? `Children's Sermon — ${topic}` : "Children's Sermon";
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Write a fun, age-appropriate children's sermon with a story, object lesson, and discussion questions — ready for Sunday School in seconds.</p>
      <div className="grid grid-cols-4 gap-1.5">
        {AGES.map(a => (
          <button key={a.value} type="button" onClick={() => setAgeGroup(a.value)}
            className={`py-1.5 rounded text-xs border transition-colors ${ageGroup === a.value ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
            {a.label}
          </button>
        ))}
      </div>
      <Input value={topic} onChange={e => setTopic(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") generate(); }}
        placeholder="Topic (e.g. Be Kind, God Loves You)" disabled={loading} />
      <Input value={verse} onChange={e => setVerse(e.target.value)}
        placeholder="Anchor verse (optional)" disabled={loading} />
      <Button onClick={() => generate()} disabled={!topic.trim() || loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Baby className="w-4 h-4" />}
        Write Children's Sermon
      </Button>
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map(q => (
          <button key={q.topic} type="button" onClick={() => { setTopic(q.topic); setVerse(q.verse); generate(q.topic, q.verse); }}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors">
            {q.topic}
          </button>
        ))}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {result && (
        <ResultBlock title={csTitle} content={result} kind="children's sermon"
          setResult={setResult} onSendToScreen={onSendToScreen} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   AI Page
   ───────────────────────────────────────────────────────────────── */
const TABS: Array<{
  value: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
  Component: React.ComponentType<{ onSendToScreen?: (content: string, title: string) => void }>;
}> = [
  { value: "prophet",     label: "Ask a Prophet",   Icon: Bot,          description: "Theological assistant trained on Scripture, church history, and biblical commentaries.",                              Component: ProphetChat },
  { value: "summary",     label: "Chapter Summary", Icon: AlignLeft,    badge: "TL;DR", description: "3-bullet TL;DR of any Bible chapter — ideal for long books like Leviticus or Revelation.",         Component: AISummary },
  { value: "lens",        label: "Context Lens",    Icon: Lightbulb,    badge: "ELI5",  description: "Explain any passage in plain English — great for new believers and children's ministry.",        Component: ContextLens },
  { value: "sermon",      label: "Sermon Outline",  Icon: FileText,     description: "Generate structured, Scripture-rich sermon outlines with main points, application, and call to action.",          Component: SermonOutline },
  { value: "prayer",      label: "Prayer",          Icon: HandHeart,    description: "Heartfelt, Scripture-inspired prayers — opening, closing, intercessory, communion, and more.",                     Component: PrayerGenerator },
  { value: "worship-set", label: "Worship Set",     Icon: ListMusic,    description: "Plan a complete worship set with song suggestions, keys, tempo, Scripture readings, and a flow arc.",             Component: WorshipSetPlanner },
  { value: "announcement",label: "Announcements",   Icon: Megaphone,    description: "Polished church announcements for bulletins and slides — catchy headline, key details, and a clear CTA.",          Component: AnnouncementWriter },
  { value: "devotional",  label: "Devotional",      Icon: Sunrise,      badge: "NEW",   description: "Short, warm daily devotional from any verse or theme — great for newsletters or quiet time.",     Component: Devotional },
  { value: "quiz",        label: "Bible Quiz",      Icon: ListChecks,   badge: "NEW",   description: "Sunday-school style multiple-choice quiz on any book or chapter — perfect for youth nights.",     Component: BibleQuiz },
  { value: "cross-refs",  label: "Cross-Refs",      Icon: Link2,        badge: "NEW",   description: "Find related verses across the Bible — prophetic echoes, parallel teachings, supporting passages.", Component: CrossRefs },
  { value: "translate",   label: "Translate",       Icon: Languages,    badge: "NEW",   description: "Translate any verse, prayer, or announcement into a local or international language.",            Component: Translate },
  { value: "kids",        label: "Kids' Sermon",    Icon: Baby,         badge: "NEW",   description: "Fun, age-appropriate children's sermon with story, object lesson, and discussion questions.",     Component: ChildrensSermon },
];

export default function AIPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Persist the active AI tab across route changes so coming back from
  // Bible / Songs / Media restores whichever AI tool the operator was using.
  const [aiActiveTab, setAiActiveTab] = useSessionStorage<string>("wf-ai-active-tab", "prophet");
  const [aiTabsCollapsed, setAiTabsCollapsed] = useLocalStorage<boolean>("wf-tabs:ai:collapsed", false);
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
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">AI-Powered Features</h1>
          <Badge variant="secondary" className="text-[10px]">Online</Badge>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Sparkles className="w-2.5 h-2.5" /> {TABS.length} tools · all free
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm sm:ml-12">
          Powered by AI — requires an internet connection. Every response can be refined with feedback.
        </p>
      </div>

      <Tabs value={aiActiveTab} onValueChange={setAiActiveTab}>
        {/* Scrollable / wrappable tab list (collapsible to save space) */}
        <CollapsibleTabsBar
          collapsed={aiTabsCollapsed}
          onToggle={() => setAiTabsCollapsed((c) => !c)}
          activeLabel={TABS.find((t) => t.value === aiActiveTab)?.label}
          className="mb-1"
        >
          <ScrollArea className="w-full">
            <TabsList className="w-full h-auto flex-wrap gap-0.5 p-1 justify-start">
              {TABS.map(({ value, label, Icon, badge }) => (
                <TabsTrigger key={value} value={value}
                  className="gap-1.5 min-w-fit relative px-3 py-1.5 text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                  {badge && (
                    <Badge variant="secondary" className="ml-0.5 px-1 py-0 text-[8.5px] leading-none h-3.5">
                      {badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
        </CollapsibleTabsBar>

        {TABS.map(({ value, label, Icon, description, Component, badge }) => (
          <TabsContent key={value} value={value} className="mt-4">
            <CollapsibleCard
              id={`ai-tool-${value}`}
              icon={Icon}
              title={badge ? <>{label} <Badge variant="outline" className="text-[10px] ml-1">{badge}</Badge></> : label}
              description={description}
            >
              <Component onSendToScreen={sendToScreen} />
            </CollapsibleCard>
          </TabsContent>
        ))}
      </Tabs>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">About AI Features:</strong> Responses are AI-generated and should be used as a starting point for study, not as a replacement for Scripture or pastoral guidance.</p>
              <p>These features use <strong className="text-foreground">Replit AI Integrations</strong> and require an active internet connection. No data is stored after your session ends.</p>
              <p className="flex items-center gap-1.5 mt-1 flex-wrap"><Wand2 className="w-3 h-3 text-primary" /> Use <strong className="text-foreground">Reply / refine</strong> on any result to ask the AI to revise it. <Monitor className="w-3 h-3 text-primary ml-1" /> Use <strong className="text-foreground">Send to screen</strong> to project on your display. <FileDown className="w-3 h-3 text-primary ml-1" /> Use <strong className="text-foreground">Export PDF</strong> to print or save.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
