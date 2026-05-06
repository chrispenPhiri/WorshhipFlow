import { useRef, useState } from "react";
import {
  Sparkles, Send, Loader2, X, Monitor, Music2, ImageIcon,
  MessageSquare, RefreshCw, Download, Copy, Check, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameBroadcast } from "@/lib/game-broadcast";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { checkImageLimit, incrementDailyImageCount } from "@/lib/ai-usage";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ChatMessage { role: "user" | "assistant"; content: string; }

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

async function postJson<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}/api/ai${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

const QUICK_PROMPTS: { label: string; message: string }[] = [
  { label: "Opening prayer", message: "Write an opening prayer for our Sunday worship service." },
  { label: "Closing prayer", message: "Write a warm closing prayer and blessing for our congregation." },
  { label: "Devotional", message: "Give me a short daily devotional based on Psalm 23." },
  { label: "Encouragement", message: "Share an encouraging Bible verse and a brief reflection for today." },
  { label: "Sermon intro", message: "Write a compelling sermon introduction on the topic of grace and faith." },
  { label: "Announcement", message: "Write a warm church announcement inviting the congregation to our upcoming Sunday service." },
];

const SONG_STYLES = ["Contemporary Gospel", "Traditional Hymn", "African Gospel", "Praise & Worship", "Soft Acoustic", "R&B Gospel"];

export function AiQuickPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [songTheme, setSongTheme] = useState("");
  const [songStyle, setSongStyle] = useState("Contemporary Gospel");
  const [songVerses, setSongVerses] = useState("2");
  const [songResult, setSongResult] = useState("");
  const [songLoading, setSongLoading] = useState(false);
  const [songError, setSongError] = useState<string | null>(null);
  const songResultRef = useRef<HTMLDivElement>(null);

  const [imgPrompt, setImgPrompt] = useState("");
  const [imgResult, setImgResult] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const { presentOnScreen } = useGameBroadcast();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const aiEnabled = settings?.aiEnabled !== false;
  const chatEnabled = aiEnabled && settings?.aiChatEnabled !== false;
  const songEnabled = aiEnabled && settings?.aiSongEnabled !== false;
  const imageEnabled = aiEnabled && settings?.aiImageEnabled !== false;
  const dailyImageLimit = typeof settings?.aiDailyImageLimit === "number" ? settings.aiDailyImageLimit : 20;

  function scrollChat() {
    requestAnimationFrame(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  async function sendChat(userText: string) {
    if (!userText.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: userText };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages(m => [...m, assistantMsg]);
    scrollChat();

    try {
      await streamPost("/chat", { messages: nextMessages }, (chunk) => {
        setMessages(m => {
          const updated = [...m];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
        scrollChat();
      });
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Something went wrong.");
      setMessages(m => m.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  }

  async function generateSong() {
    if (!songTheme.trim() || songLoading) return;
    setSongLoading(true);
    setSongError(null);
    setSongResult("");
    try {
      await streamPost(
        "/generate-song",
        { theme: songTheme, style: songStyle, numVerses: parseInt(songVerses) },
        (chunk) => {
          setSongResult(p => {
            requestAnimationFrame(() =>
              songResultRef.current?.scrollTo({ top: songResultRef.current.scrollHeight, behavior: "smooth" })
            );
            return p + chunk;
          });
        },
      );
    } catch (e) {
      setSongError(e instanceof Error ? e.message : "Failed to generate song.");
    } finally {
      setSongLoading(false);
    }
  }

  async function generateImage() {
    if (!imgPrompt.trim() || imgLoading) return;
    const { allowed, current } = checkImageLimit(dailyImageLimit);
    if (!allowed) {
      setImgError(`Daily limit reached (${current} / ${dailyImageLimit} images). Reset tomorrow or raise the limit in Settings → AI Features.`);
      return;
    }
    setImgLoading(true);
    setImgError(null);
    setImgResult(null);
    try {
      const data = await postJson<{ b64_json: string }>("/custom-image", { prompt: imgPrompt });
      setImgResult(`data:image/png;base64,${data.b64_json}`);
      incrementDailyImageCount();
    } catch (e) {
      setImgError(e instanceof Error ? e.message : "Image generation failed.");
    } finally {
      setImgLoading(false);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadImage() {
    if (!imgResult) return;
    const a = document.createElement("a");
    a.href = imgResult;
    a.download = "ai-image.png";
    a.click();
  }

  function sendSongToScreen() {
    if (songResult) presentOnScreen("AI Song", "AI", songResult);
  }

  function sendChatToScreen() {
    const last = messages.filter(m => m.role === "assistant" && m.content).pop();
    if (last) presentOnScreen("AI Assistant", "AI", last.content);
  }

  function sendImageAsBackground() {
    if (!imgResult) return;
    fetch(`${BASE}/api/screen`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ background: { type: "image", value: imgResult, overlay: 0 }, contentType: "none", isClear: false }),
    }).catch(() => {});
  }

  const lastAssistantMsg = messages.filter(m => m.role === "assistant" && m.content).pop();

  return (
    <>
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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col bg-background border-border"
          data-testid="sheet-ai-quick-panel"
        >
          <SheetHeader className="p-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Assistant
              </SheetTitle>
              <Link href="/settings" onClick={() => setOpen(false)}>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" title="AI Settings">
                  <Settings2 className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </SheetHeader>

          {!aiEnabled && (
            <div className="mx-4 mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              AI features are currently disabled.{" "}
              <Link href="/settings" onClick={() => setOpen(false)} className="text-primary underline-offset-2 hover:underline">
                Enable in Settings
              </Link>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-4 mt-3 shrink-0 grid grid-cols-3">
              <TabsTrigger value="chat" className="gap-1.5 text-xs" disabled={!chatEnabled}>
                <MessageSquare className="w-3.5 h-3.5" />Chat
              </TabsTrigger>
              <TabsTrigger value="song" className="gap-1.5 text-xs" disabled={!songEnabled}>
                <Music2 className="w-3.5 h-3.5" />Song
              </TabsTrigger>
              <TabsTrigger value="image" className="gap-1.5 text-xs" disabled={!imageEnabled}>
                <ImageIcon className="w-3.5 h-3.5" />Image
              </TabsTrigger>
            </TabsList>

            {/* ── CHAT TAB ─────────────────────────────────── */}
            <TabsContent value="chat" className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
              <div className="px-4 pt-3 pb-2 border-b border-border shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Quick prompts</p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_PROMPTS.map(({ label, message }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={chatLoading}
                      onClick={() => sendChat(message)}
                      className="px-2.5 py-1 rounded-full text-xs border border-border bg-muted/30 hover:bg-muted/70 hover:border-primary/40 transition-colors disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {messages.length === 0 && !chatLoading && (
                  <p className="text-sm text-muted-foreground">
                    Ask me anything — Bible questions, real-life advice, sermon help, creative writing, or any topic at all.
                  </p>
                )}
                {chatError && (
                  <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{chatError}</div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted/60 text-foreground rounded-bl-sm"
                    }`}>
                      {msg.content || (chatLoading && i === messages.length - 1
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : null)}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {lastAssistantMsg && !chatLoading && (
                <div className="px-4 pb-2 shrink-0 flex items-center gap-2 flex-wrap border-t border-border pt-2">
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={sendChatToScreen}>
                    <Monitor className="w-3 h-3" />Send to screen
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs" onClick={() => copyText(lastAssistantMsg.content)}>
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs text-muted-foreground" onClick={() => setMessages([])}>
                    <RefreshCw className="w-3 h-3" />Clear
                  </Button>
                </div>
              )}

              <div className="p-4 border-t border-border shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ask anything…"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
                    rows={2}
                    className="resize-none text-sm"
                    disabled={chatLoading}
                  />
                  <Button
                    size="icon"
                    onClick={() => sendChat(chatInput)}
                    disabled={!chatInput.trim() || chatLoading}
                    className="shrink-0 self-end"
                    aria-label="Send"
                  >
                    {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Enter to send · Shift+Enter for new line</p>
              </div>
            </TabsContent>

            {/* ── SONG TAB ─────────────────────────────────── */}
            <TabsContent value="song" className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
              <div className="p-4 border-b border-border shrink-0 space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Song theme or message</label>
                  <Input
                    placeholder="e.g. God's faithfulness, healing, praise, surrender…"
                    value={songTheme}
                    onChange={e => setSongTheme(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") generateSong(); }}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium mb-1 block">Style</label>
                    <Select value={songStyle} onValueChange={setSongStyle}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SONG_STYLES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <label className="text-xs font-medium mb-1 block">Verses</label>
                    <Select value={songVerses} onValueChange={setSongVerses}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["1","2","3","4"].map(n => <SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full gap-2" onClick={generateSong} disabled={!songTheme.trim() || songLoading}>
                  {songLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music2 className="w-4 h-4" />}
                  {songLoading ? "Writing song…" : "Generate Song Lyrics"}
                </Button>
                {songError && <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{songError}</p>}
              </div>

              <div ref={songResultRef} className="flex-1 overflow-y-auto p-4 min-h-0">
                {!songResult && !songLoading && (
                  <p className="text-sm text-muted-foreground">
                    Enter a theme to generate original worship song lyrics with verses, chorus, and bridge.
                  </p>
                )}
                {songLoading && !songResult && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />Writing lyrics…
                  </div>
                )}
                {songResult && (
                  <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{songResult}</pre>
                )}
              </div>

              {songResult && !songLoading && (
                <div className="px-4 pb-4 shrink-0 flex items-center gap-2 flex-wrap border-t border-border pt-3">
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={sendSongToScreen}>
                    <Monitor className="w-3 h-3" />Send to screen
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs" onClick={() => copyText(songResult)}>
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs text-muted-foreground" onClick={() => setSongResult("")}>
                    <RefreshCw className="w-3 h-3" />New song
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ── IMAGE TAB ─────────────────────────────────── */}
            <TabsContent value="image" className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
              <div className="p-4 border-b border-border shrink-0 space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Describe the image</label>
                  <Textarea
                    placeholder="e.g. A majestic sunrise over mountains with rays of light breaking through the clouds, biblical, cinematic…"
                    value={imgPrompt}
                    onChange={e => setImgPrompt(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>
                <Button className="w-full gap-2" onClick={generateImage} disabled={!imgPrompt.trim() || imgLoading}>
                  {imgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  {imgLoading ? "Generating…" : "Generate Image"}
                </Button>
                {imgError && <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{imgError}</p>}
              </div>

              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {!imgResult && !imgLoading && (
                  <p className="text-sm text-muted-foreground">
                    Describe any image — worship backgrounds, biblical scenes, nature, abstract art, or anything you can imagine.
                  </p>
                )}
                {imgLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm">Creating your image…</p>
                  </div>
                )}
                {imgResult && (
                  <img src={imgResult} alt="AI generated" className="w-full rounded-lg shadow-md" />
                )}
              </div>

              {imgResult && !imgLoading && (
                <div className="px-4 pb-4 shrink-0 flex items-center gap-2 flex-wrap border-t border-border pt-3">
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={sendImageAsBackground}>
                    <Monitor className="w-3 h-3" />Set as background
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs" onClick={downloadImage}>
                    <Download className="w-3 h-3" />Download
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs text-muted-foreground" onClick={() => setImgResult(null)}>
                    <X className="w-3 h-3" />Clear
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
