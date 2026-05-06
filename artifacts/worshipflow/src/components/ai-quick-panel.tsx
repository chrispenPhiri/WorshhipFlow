import { useRef, useState } from "react";
import { Sparkles, Send, Loader2, X, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useGameBroadcast } from "@/lib/game-broadcast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function streamPost(
  path: string,
  body: object,
  onChunk: (text: string) => void,
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

interface QuickPrompt {
  label: string;
  /** API path under /api/ai */
  path: string;
  body: object;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: "Opening prayer",
    path: "/prayer",
    body: { type: "opening", topic: "worship service", occasion: "Sunday service" },
  },
  {
    label: "Closing prayer",
    path: "/prayer",
    body: { type: "closing", topic: "blessing", occasion: "end of service" },
  },
  {
    label: "Sermon outline",
    path: "/sermon-outline",
    body: { topic: "grace and faith", style: "expository" },
  },
  {
    label: "Devotional",
    path: "/devotional",
    body: { passage: "Psalm 23", length: "short" },
  },
  {
    label: "Announcements",
    path: "/announcement",
    body: { topic: "Sunday service", tone: "warm" },
  },
  {
    label: "Ask the prophet",
    path: "/prophet",
    body: { messages: [{ role: "user", content: "What is an encouraging Bible verse for today?" }] },
  },
];

export function AiQuickPanel() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const { presentOnScreen } = useGameBroadcast();

  async function runPath(path: string, body: object) {
    setError(null);
    setResult("");
    setLoading(true);
    try {
      await streamPost(path, body, (chunk) => {
        setResult(prev => {
          requestAnimationFrame(() => {
            resultRef.current?.scrollTo({ top: resultRef.current.scrollHeight, behavior: "smooth" });
          });
          return prev + chunk;
        });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function run(question: string) {
    if (!question.trim() || loading) return;
    runPath("/prophet", { messages: [{ role: "user", content: question }] });
  }

  function handleSubmit() {
    if (!prompt.trim()) return;
    run(prompt);
    setPrompt("");
  }

  function sendToScreen() {
    if (!result) return;
    presentOnScreen("AI Assistant", "AI", result);
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-150 text-sm font-semibold"
        aria-label="Open AI assistant"
        data-testid="button-ai-quick-panel"
      >
        <Sparkles className="w-4 h-4" />
        <span>Ask AI</span>
      </button>

      {/* Slide-over sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col bg-background border-border"
          data-testid="sheet-ai-quick-panel"
        >
          <SheetHeader className="p-4 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Assistant
            </SheetTitle>
          </SheetHeader>

          {/* Quick prompts */}
          <div className="p-4 border-b border-border shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">Quick prompts</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map(({ label, path, body }) => (
                <button
                  key={label}
                  type="button"
                  disabled={loading}
                  onClick={() => runPath(path, body)}
                  className="px-2.5 py-1 rounded-full text-xs border border-border bg-muted/30 hover:bg-muted/70 hover:border-primary/40 transition-colors disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Result area */}
          <div ref={resultRef} className="flex-1 overflow-y-auto p-4">
            {loading && !result && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </div>
            )}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-3">{error}</div>
            )}
            {result && (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
                {!loading && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs"
                      onClick={sendToScreen}
                    >
                      <Monitor className="w-3 h-3" />
                      Send to screen
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 h-7 text-xs text-muted-foreground"
                      onClick={() => setResult("")}
                    >
                      <X className="w-3 h-3" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            )}
            {!result && !loading && !error && (
              <p className="text-sm text-muted-foreground">
                Use a quick prompt above or type your question below. Results can be sent directly to the screen.
              </p>
            )}
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask anything about the Bible, sermon, prayer…"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={2}
                className="resize-none text-sm"
                disabled={loading}
              />
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={!prompt.trim() || loading}
                className="shrink-0 self-end"
                aria-label="Send"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Enter to send · Shift+Enter for new line</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
