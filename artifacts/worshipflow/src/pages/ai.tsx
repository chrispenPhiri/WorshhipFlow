import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, BookOpen, AlignLeft, Lightbulb, RotateCcw, ChevronDown, ChevronUp, X, User, Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

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

type ProphetMsg = { role: "user" | "assistant"; content: string };

function ProphetChat() {
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
        <ScrollArea className="h-[420px] pr-2">
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

function AISummary() {
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{book} {chapter} — Summary</p>
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

function ContextLens() {
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{passage} — Plain English</p>
            <button type="button" onClick={() => setResult("")} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}

export default function AIPage() {
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
        <TabsList className="w-full h-auto gap-0.5">
          <TabsTrigger value="prophet" className="flex-1 gap-1.5">
            <Bot className="w-4 h-4" /> Ask a Prophet
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex-1 gap-1.5">
            <AlignLeft className="w-4 h-4" /> AI Summary
          </TabsTrigger>
          <TabsTrigger value="lens" className="flex-1 gap-1.5">
            <Lightbulb className="w-4 h-4" /> Context Lens
          </TabsTrigger>
        </TabsList>

        {/* ── Ask a Prophet ── */}
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
              <ProphetChat />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI Summary ── */}
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
              <AISummary />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Context Lens ── */}
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
              <ContextLens />
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
