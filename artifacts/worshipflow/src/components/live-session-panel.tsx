import { useEffect, useRef, useState } from "react";
import {
  Users, Crown, Eye, Wrench, Copy, Check, LogOut, Wifi, WifiOff,
  Loader2, X, Minus, Plus, MonitorOff, Monitor, RefreshCw,
  MessageSquare, Mic, MicOff, Send,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type LiveSessionState, type ChatMessage, getSessionShareUrl } from "@/lib/live-session";
import { useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebRtcAudio } from "@/hooks/use-webrtc-audio";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionState: LiveSessionState;
  createSession: (displayName: string) => void;
  joinSession: (code: string, displayName: string) => void;
  leaveSession: () => void;
  changeRole: (memberId: string, role: "operator" | "viewer") => void;
  clearError: () => void;
  chatMessages?: ChatMessage[];
  sendChatMessage?: (text: string) => void;
  sendSignal?: (targetId: string, payload: unknown) => void;
  setSignalHandler?: (handler: (fromId: string, payload: unknown) => void) => void;
}

function RoleBadge({ role }: { role: string }) {
  if (role === "master") return (
    <Badge className="gap-1 bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0.5">
      <Crown className="w-2.5 h-2.5" /> Master
    </Badge>
  );
  if (role === "operator") return (
    <Badge className="gap-1 bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0.5">
      <Wrench className="w-2.5 h-2.5" /> Operator
    </Badge>
  );
  return (
    <Badge className="gap-1 bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0.5">
      <Eye className="w-2.5 h-2.5" /> Viewer
    </Badge>
  );
}

function RemoteControl({ myRole }: { myRole: string | null }) {
  const isViewer = myRole === "viewer";
  const queryClient = useQueryClient();
  const { data: raw } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 3000 },
  });
  const screen = raw as Record<string, unknown> | undefined;
  const textStyle = (screen?.textStyle ?? {}) as Record<string, unknown>;
  const fontSize = typeof textStyle.fontSize === "number" ? textStyle.fontSize : 64;
  const isBlack = !!screen?.isBlack;

  const patch = async (changes: Record<string, unknown>) => {
    if (!screen) return;
    const updated = { ...screen, ...changes };
    await fetch("/api/screen", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() });
  };

  const changeFontSize = async (delta: number) => {
    const next = Math.min(200, Math.max(16, fontSize + delta));
    await patch({ textStyle: { ...textStyle, fontSize: next } });
    // Viewers save their personal preference so it survives incoming screen updates
    if (isViewer) localStorage.setItem("wf-viewer-font-size", String(next));
  };

  const toggleBlack = async () => {
    await patch({ isBlack: !isBlack });
  };

  return (
    <div className="rounded-xl border border-border bg-background/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {isViewer ? "My View Size" : "Remote Control"}
        </p>
        {isViewer && (
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Your device only
          </span>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Font size</span>
          <span className="text-sm font-mono font-bold text-foreground">{fontSize}px</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon"
            className="h-12 w-12 shrink-0 text-lg rounded-xl border-border active:scale-95 transition-transform"
            onClick={() => changeFontSize(-8)} aria-label="Decrease font size">
            <Minus className="w-5 h-5" />
          </Button>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.round(((fontSize - 16) / (200 - 16)) * 100)}%` }} />
          </div>
          <Button variant="outline" size="icon"
            className="h-12 w-12 shrink-0 text-lg rounded-xl border-border active:scale-95 transition-transform"
            onClick={() => changeFontSize(8)} aria-label="Increase font size">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
      {isViewer ? (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Adjusts text size on <strong className="text-foreground/70">your screen only</strong> — does not affect the operator or projection. Your preference is remembered.
        </p>
      ) : (
        <Button
          variant={isBlack ? "default" : "outline"}
          className={`w-full h-12 rounded-xl text-sm font-medium active:scale-95 transition-transform ${
            isBlack ? "bg-slate-800 hover:bg-slate-700 text-white border-0" : ""
          }`}
          onClick={toggleBlack}>
          {isBlack
            ? <><Monitor className="w-4 h-4 mr-2" />Unblank Screen</>
            : <><MonitorOff className="w-4 h-4 mr-2" />Blank Screen</>
          }
        </Button>
      )}
    </div>
  );
}

function ChatPanel({ messages, sendMessage, myId }: {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  myId: string | null;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-72 rounded-xl border border-border bg-background/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <MessageSquare className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team Chat</span>
        {messages.length > 0 && (
          <Badge className="ml-auto text-[9px] py-0 h-4 bg-primary/15 text-primary border-primary/25">
            {messages.length}
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center pt-6">No messages yet. Say hi!</p>
        ) : (
          messages.map(m => {
            const isMe = m.memberId === myId;
            return (
              <div key={m.id} className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                <div className={`flex items-center gap-1.5 text-[10px] text-muted-foreground ${isMe ? "flex-row-reverse" : ""}`}>
                  <span className="font-medium">{isMe ? "You" : m.displayName}</span>
                  <span>{fmt(m.timestamp)}</span>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-sm max-w-[85%] break-words ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}>
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-2 flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message the team…"
          className="h-8 text-sm"
          maxLength={500}
        />
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={send} disabled={!input.trim()}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function VoicePanel({ micEnabled, remoteMicIds, toggleMic, members, myId }: {
  micEnabled: boolean;
  remoteMicIds: Set<string>;
  toggleMic: () => void;
  members: LiveSessionState["members"];
  myId: string | null;
}) {
  const voiceMembers = members.filter(m => m.id === myId ? micEnabled : remoteMicIds.has(m.id));

  return (
    <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice</p>
        <span className="text-[10px] text-muted-foreground">Browser WebRTC · free</span>
      </div>

      <Button
        variant={micEnabled ? "default" : "outline"}
        className={`w-full h-11 rounded-xl text-sm font-medium active:scale-95 transition-transform ${
          micEnabled ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0" : ""
        }`}
        onClick={toggleMic}
      >
        {micEnabled
          ? <><Mic className="w-4 h-4 mr-2" />Mic On — Click to Mute</>
          : <><MicOff className="w-4 h-4 mr-2" />Enable Microphone</>
        }
      </Button>

      {voiceMembers.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">On voice:</p>
          <div className="flex flex-wrap gap-1.5">
            {voiceMembers.map(m => (
              <span key={m.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <Mic className="w-3 h-3" />
                {m.id === myId ? "You" : m.displayName}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Voice uses your browser's built-in WebRTC — peer-to-peer, no server cost. Works best on the same network. Allow microphone access when prompted.
      </p>
    </div>
  );
}

export function LiveSessionPanel({
  open, onOpenChange, sessionState,
  createSession, joinSession, leaveSession, changeRole, clearError,
  chatMessages = [], sendChatMessage = () => {}, sendSignal = () => {}, setSignalHandler = () => {},
}: Props) {
  const [tab, setTab] = useState<"start" | "join">("start");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [sessionTab, setSessionTab] = useState<"control" | "chat" | "voice">("control");
  const nameRef = useRef<HTMLInputElement>(null);

  const { micEnabled, remoteMicIds, toggleMic } = useWebRtcAudio(
    sessionState.myId,
    sessionState.members,
    sendSignal,
    setSignalHandler,
  );

  // Unread chat badge
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const unreadCount = chatMessages.length - lastSeenCount;
  useEffect(() => {
    if (sessionTab === "chat") setLastSeenCount(chatMessages.length);
  }, [sessionTab, chatMessages.length]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) { setJoinCode(code.toUpperCase()); setTab("join"); }
  }, []);

  useEffect(() => {
    if (open && sessionState.status === "idle") {
      setTimeout(() => nameRef.current?.focus(), 150);
    }
  }, [open, sessionState.status]);

  const handleCreate = () => { if (!name.trim()) return; createSession(name.trim()); };
  const handleJoin = () => { if (!name.trim() || !joinCode.trim()) return; joinSession(joinCode.trim(), name.trim()); };

  const handleCopyLink = async () => {
    if (!sessionState.code) return;
    try { await navigator.clipboard.writeText(getSessionShareUrl(sessionState.code)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const handleCopyCode = async () => {
    if (!sessionState.code) return;
    try { await navigator.clipboard.writeText(sessionState.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const inSession = (sessionState.status === "connected" || sessionState.status === "reconnecting") && sessionState.code;
  const connecting = sessionState.status === "connecting";
  const reconnecting = sessionState.status === "reconnecting";
  const canControl = sessionState.myRole === "master" || sessionState.myRole === "operator";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 bg-sidebar border-border flex flex-col">
        <SheetHeader className="p-4 border-b border-border text-left shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Live Session
            {reconnecting && (
              <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-amber-400">
                <RefreshCw className="w-3 h-3 animate-spin" /> Reconnecting…
              </span>
            )}
            {sessionState.status === "connected" && inSession && (
              <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-emerald-400">
                <Wifi className="w-3.5 h-3.5" /> Connected
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {sessionState.error && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-sm text-destructive">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{sessionState.error}</span>
              <button type="button" onClick={clearError} className="shrink-0 opacity-60 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Not in session ── */}
          {!inSession && (
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect multiple devices so your whole worship team sees the same screen — or let others help control it.
              </p>
              <Tabs value={tab} onValueChange={(v) => setTab(v as "start" | "join")}>
                <TabsList className="w-full">
                  <TabsTrigger value="start" className="flex-1">Start Session</TabsTrigger>
                  <TabsTrigger value="join" className="flex-1">Join Session</TabsTrigger>
                </TabsList>
                <TabsContent value="start" className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Your name</label>
                    <Input ref={nameRef} placeholder="e.g. John" value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()} maxLength={40} />
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={!name.trim() || connecting}>
                    {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                    {connecting ? "Creating…" : "Create Session"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">You'll get a code to share with your team.</p>
                </TabsContent>
                <TabsContent value="join" className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Your name</label>
                    <Input placeholder="e.g. Mary" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Room code</label>
                    <Input placeholder="e.g. ABC123" value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                      onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                      className="font-mono tracking-widest uppercase" maxLength={6} />
                  </div>
                  <Button className="w-full" onClick={handleJoin} disabled={!name.trim() || joinCode.trim().length < 4 || connecting}>
                    {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {connecting ? "Joining…" : "Join Session"}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* ── In session ── */}
          {inSession && (
            <div className="p-4 space-y-4">
              {/* Room code */}
              <div className="rounded-xl border border-border bg-background/50 p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Room Code</p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-3xl font-bold tracking-[0.2em] text-primary">{sessionState.code}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleCopyCode} aria-label="Copy code">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleCopyLink}>
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  Copy invite link
                </Button>
              </div>

              {/* Role */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Your role:</span>
                <RoleBadge role={sessionState.myRole ?? "viewer"} />
                {sessionState.myRole === "master" && <span className="text-xs text-muted-foreground ml-auto">You control the session</span>}
                {sessionState.myRole === "operator" && <span className="text-xs text-muted-foreground ml-auto">You can send to screen</span>}
                {sessionState.myRole === "viewer" && <span className="text-xs text-muted-foreground ml-auto">Watch-only</span>}
              </div>

              {/* Sub-tabs: Control / Chat / Voice */}
              <Tabs value={sessionTab} onValueChange={v => {
                setSessionTab(v as "control" | "chat" | "voice");
              }}>
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="control">Control</TabsTrigger>
                  <TabsTrigger value="chat" className="relative">
                    Chat
                    {unreadCount > 0 && sessionTab !== "chat" && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="voice">Voice</TabsTrigger>
                </TabsList>

                <TabsContent value="control" className="space-y-4 mt-3">
                  <RemoteControl myRole={sessionState.myRole} />

                  {/* Members list */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Members ({sessionState.members.length})
                    </p>
                    <div className="space-y-1.5">
                      {sessionState.members.map((member) => {
                        const isMe = member.id === sessionState.myId;
                        const isMaster = sessionState.myRole === "master";
                        const canToggle = isMaster && member.role !== "master" && !isMe;
                        const hasMic = member.id === sessionState.myId ? micEnabled : remoteMicIds.has(member.id);
                        return (
                          <div key={member.id}
                            className="flex items-center gap-2 rounded-lg border border-border bg-background/30 px-3 py-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {member.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm truncate font-medium">{member.displayName}</span>
                                {isMe && <span className="text-xs text-muted-foreground shrink-0">(you)</span>}
                                {hasMic && <Mic className="w-3 h-3 text-emerald-400 shrink-0" />}
                              </div>
                              <RoleBadge role={member.role} />
                            </div>
                            {canToggle && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0 px-2"
                                onClick={() => changeRole(member.id, member.role === "operator" ? "viewer" : "operator")}>
                                {member.role === "operator"
                                  ? <><Eye className="w-3 h-3 mr-1" />Viewer</>
                                  : <><Wrench className="w-3 h-3 mr-1" />Operator</>
                                }
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground/70">How roles work</p>
                    <p><Crown className="w-3 h-3 inline mr-1 text-amber-400" /><strong>Master</strong> — full control, manages roles</p>
                    <p><Wrench className="w-3 h-3 inline mr-1 text-blue-400" /><strong>Operator</strong> — can send content to screen</p>
                    <p><Eye className="w-3 h-3 inline mr-1" /><strong>Viewer</strong> — sees screen state, read-only</p>
                  </div>
                </TabsContent>

                <TabsContent value="chat" className="mt-3">
                  <ChatPanel messages={chatMessages} sendMessage={sendChatMessage} myId={sessionState.myId} />
                </TabsContent>

                <TabsContent value="voice" className="mt-3">
                  <VoicePanel
                    micEnabled={micEnabled}
                    remoteMicIds={remoteMicIds}
                    toggleMic={toggleMic}
                    members={sessionState.members}
                    myId={sessionState.myId}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {inSession && (
          <div className="p-4 border-t border-border shrink-0">
            <Button variant="destructive" className="w-full" onClick={leaveSession}>
              <LogOut className="w-4 h-4 mr-2" />
              {sessionState.myRole === "master" ? "End Session" : "Leave Session"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
