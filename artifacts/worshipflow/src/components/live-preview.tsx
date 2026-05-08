import { useState, useEffect } from "react";
import { useGetScreenState, useUpdateScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, ExternalLink, Monitor, MonitorSpeaker, ChevronDown, Loader2,
  ZoomIn, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Maximize2, Minimize2, EyeOff, Eye, RotateCcw, CheckCircle2, Tv2, PictureInPicture2,
  MonitorOff, ChevronUp, ArrowUp, ArrowDown, RefreshCw, Play, Pause, Gauge,
} from "lucide-react";
import { useBroadcast, CHANNEL_NAME } from "@/hooks/use-broadcast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { subscribeScreenChanges } from "@/lib/local-api";
import { GameStageView } from "@/components/game-stage-view";
import { tryDecodeGamePayload } from "@/lib/game-stage-payload";

export function LivePreview() {
  const queryClient = useQueryClient();
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Auto-scroll (teleprompter) state — mirrors the authoritative state
  // the broadcast window emits as `scroll_auto_state`. We never write
  // these from local user clicks; we send commands and let the next
  // status echo update us.  This prevents UI desync when the teleprompter
  // auto-stops at end-of-text or someone toggles it from a keyboard shortcut.
  const [autoScrollOn, setAutoScrollOn] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(60);
  const { toast } = useToast();

  const { data: screenState, isLoading, error } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 2000 }
  });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }) }
  });

  // Cross-tab sync — see broadcast.tsx for rationale.
  useEffect(() => subscribeScreenChanges(() => {
    queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() });
  }), [queryClient]);

  const {
    screens, secondaryScreen, permissionState,
    detectScreens, openBroadcast, autoLaunchBroadcast, sendCommand,
    isWindowManagementSupported, broadcastWin,
  } = useBroadcast();

  // Auto-detect screens on mount
  useEffect(() => {
    if (isWindowManagementSupported && screens.length === 0 && permissionState === "idle") {
      detectScreens().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWindowManagementSupported]);

  // Subscribe to broadcast-window status messages so our toggle reflects the real fullscreen state.
  // Also send a one-shot 'get_fullscreen_state' query so we hydrate even if the broadcast was already
  // open and fullscreen before this controller mounted (BroadcastChannel doesn't replay history).
  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = (e) => {
      const m = e.data;
      if (!m?.type) return;
      if (m.type === "fullscreen_state") setIsFullscreen(!!m.value);
      else if (m.type === "fullscreen_blocked") {
        setIsFullscreen(false);
        toast({
          title: "Couldn't enter fullscreen automatically",
          description: "The browser blocks fullscreen without a click in the broadcast window. Click on it, or press F.",
          variant: "destructive",
        });
      }
      else if (m.type === "scroll_auto_state") {
        // Authoritative auto-scroll state from the broadcast window — used to
        // keep the toggle button in sync when the teleprompter auto-stops at
        // end-of-text or someone toggled it from the global keyboard shortcut.
        setAutoScrollOn(!!m.running);
        if (typeof m.speed === "number" && m.speed > 0) setAutoScrollSpeed(m.speed);
      }
    };
    // Ask for current state on mount (handles late-mounting / reload after broadcast is already fullscreen)
    try { ch.postMessage({ type: "get_fullscreen_state" }); } catch {}
    return () => ch.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <div className="animate-pulse h-48 bg-muted rounded-md" />;
  if (error) return <div className="text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Error loading preview</div>;
  if (!screenState) return null;

  const layout = screenState.layout ?? { textScale: 1, verticalAlign: "center", horizontalAlign: "center", paddingX: 8, paddingY: 8, textWidthPct: 100 };

  const updateLayout = (patch: Partial<typeof layout>) => {
    const safeState = {
      isBlack: screenState.isBlack ?? false,
      isClear: screenState.isClear ?? false,
      contentType: screenState.contentType ?? "none",
      title: screenState.title ?? undefined,
      content: screenState.content ?? undefined,
      textStyle: screenState.textStyle ?? undefined,
      background: screenState.background ?? undefined,
      tickerEnabled: screenState.tickerEnabled ?? false,
      tickerText: screenState.tickerText ?? undefined,
    };
    updateScreen({ data: { ...safeState, layout: { ...layout, ...patch } } });
  };

  const handleClear = () => {
    const defaultWpId = localStorage.getItem("wf-default-wallpaper") ?? "bokeh";
    updateScreen({
      data: {
        isBlack: screenState.isBlack ?? false,
        isClear: true,
        contentType: "none",
        title: undefined,
        content: undefined,
        background: { type: "live_wallpaper", value: defaultWpId, overlay: 0 },
        tickerEnabled: screenState.tickerEnabled ?? false,
      }
    });
  };
  const handleBlackScreen = () => updateScreen({
    data: { isBlack: !(screenState.isBlack ?? false), isClear: screenState.isClear ?? false, contentType: screenState.contentType ?? "none", tickerEnabled: screenState.tickerEnabled ?? false }
  });

  const handleAutoLaunch = async () => {
    setLaunching(true);
    try {
      const { screen } = await autoLaunchBroadcast();
      if (screen && !screen.isPrimary) {
        toast({ title: "Broadcast launched", description: `Opened on ${screen.label} (${screen.width}×${screen.height})` });
      } else {
        toast({ title: "Broadcast opened", description: "No secondary display found — opened in a new tab." });
      }
    } catch {
      toast({ title: "Could not open broadcast", variant: "destructive" });
    } finally {
      setLaunching(false);
    }
  };

  const handleOpenDropdown = async () => {
    if (isWindowManagementSupported && screens.length === 0) await detectScreens();
    setPickerOpen(true);
  };

  const handleOpenOnScreen = async (screenIndex?: number) => {
    const target = screenIndex !== undefined ? screens[screenIndex] : undefined;
    await openBroadcast(target);
    setPickerOpen(false);
  };

  // ── Remote control helpers ──
  const remoteFullscreen = () => {
    // Bring the broadcast window to the front so the user can give it a gesture if needed.
    try { broadcastWin?.focus(); } catch {}
    sendCommand({ type: "fullscreen" });
    // NOTE: do NOT optimistically set isFullscreen here — the broadcast window will report back via
    // the 'fullscreen_state' status message once requestFullscreen() actually succeeds. If it was
    // blocked (no user gesture), 'fullscreen_blocked' will fire instead.
    toast({
      title: "Sent to broadcast window",
      description: "If it doesn't go fullscreen, click on the broadcast window or press F.",
    });
  };
  const remoteExitFullscreen = () => {
    sendCommand({ type: "exit_fullscreen" });
    // exitFullscreen doesn't need a gesture, so it always works — optimistic update is safe here.
    setIsFullscreen(false);
    toast({ title: "Presentation → Windowed" });
  };
  const remoteToggleCursor = () => {
    const next = !cursorHidden;
    sendCommand(next ? { type: "hide_cursor" } : { type: "show_cursor" });
    setCursorHidden(next);
  };
  const remotePip = () => {
    sendCommand({ type: "pip_open" });
    toast({ title: "Presentation → Picture-in-Picture" });
  };
  const remoteReload = () => {
    sendCommand({ type: "reload" });
    toast({ title: "Presentation reloading…" });
  };

  const broadcastLive = broadcastWin && !broadcastWin.closed;

  const getPreviewStyle = () => {
    if (!screenState.textStyle) return {};
    return {
      fontFamily: screenState.textStyle.fontFamily,
      fontSize: `${(screenState.textStyle.fontSize * (layout.textScale ?? 1)) / 3}px`,
      color: screenState.textStyle.textColor,
      fontWeight: screenState.textStyle.bold ? "bold" : "normal",
      fontStyle: screenState.textStyle.italic ? "italic" : "normal",
      textAlign: (layout.horizontalAlign === "left" ? "left" : layout.horizontalAlign === "right" ? "right" : screenState.textStyle.alignment) as "left" | "center" | "right",
    };
  };

  const vAlign = layout.verticalAlign ?? "center";
  const hAlign = layout.horizontalAlign ?? "center";
  const previewJustify = vAlign === "top" ? "start" : vAlign === "bottom" ? "end" : "center";
  const previewAlign = hAlign === "left" ? "start" : hAlign === "right" ? "end" : "center";

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Screen controls ── */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2">
          <Button
            variant={screenState.isBlack ? "default" : "outline"}
            size="sm"
            onClick={handleBlackScreen}
            className={screenState.isBlack ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
          >
            Black
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>Clear</Button>
        </div>

        {/* Split Broadcast button */}
        <div className="flex items-stretch rounded-md overflow-hidden border border-primary/40 h-8">
          <button
            onClick={handleAutoLaunch}
            disabled={launching}
            title={secondaryScreen ? `Launch on ${secondaryScreen.label}` : "Open broadcast"}
            className="flex items-center gap-1.5 px-2.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/15 transition-colors disabled:opacity-60 border-r border-primary/20"
          >
            {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : broadcastLive ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              : secondaryScreen ? <Tv2 className="w-3.5 h-3.5" />
              : <MonitorSpeaker className="w-3.5 h-3.5" />}
            {broadcastLive ? "Live" : "Broadcast"}
          </button>
          <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
            <DropdownMenuTrigger asChild>
              <button onClick={handleOpenDropdown} title="Choose display manually" className="px-1.5 text-primary bg-primary/5 hover:bg-primary/15 transition-colors">
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Choose display</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {screens.length === 0 && permissionState !== "requesting" && (
                <DropdownMenuItem onClick={() => handleOpenOnScreen(undefined)}>
                  <ExternalLink className="w-4 h-4 mr-2" /> Open in new tab
                </DropdownMenuItem>
              )}
              {screens.map((s, i) => (
                <DropdownMenuItem key={i} onClick={() => handleOpenOnScreen(i)}>
                  <Monitor className="w-4 h-4 mr-2 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{s.label}</span>
                      {!s.isPrimary && <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">2nd</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.width}×{s.height}{s.isPrimary ? " · Primary" : " · Secondary"}</div>
                  </div>
                </DropdownMenuItem>
              ))}
              {screens.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => handleOpenOnScreen(undefined)}>
                <ExternalLink className="w-4 h-4 mr-2" /> Open in new tab
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Display status ── */}
      {isWindowManagementSupported && (
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${secondaryScreen ? "bg-green-500/10 text-green-400" : "bg-muted/50 text-muted-foreground"}`}>
          {permissionState === "requesting" ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Detecting displays…</>
          ) : secondaryScreen ? (
            <><CheckCircle2 className="w-3 h-3" /> <span className="font-medium">{secondaryScreen.label}</span> ({secondaryScreen.width}×{secondaryScreen.height})</>
          ) : permissionState === "denied" ? (
            <><AlertCircle className="w-3 h-3 text-amber-500" /><span className="text-amber-400">Display permission denied</span></>
          ) : (
            <><Monitor className="w-3 h-3" /> No secondary display detected</>
          )}
        </div>
      )}

      {/* ── Preview (16:9) ── */}
      <div
        className="relative w-full aspect-video bg-black rounded overflow-hidden border border-border shadow-lg"
        style={{
          display: "flex",
          alignItems: previewJustify,
          justifyContent: previewAlign,
          padding: `${(layout.paddingY ?? 8) / 3}% ${(layout.paddingX ?? 8) / 3}%`
        }}
      >
        {screenState.isBlack && <div className="absolute inset-0 bg-black z-50" />}
        {!screenState.isClear && screenState.content && (() => {
          // Game payloads get the same rich stage view, just shrunk to
          // fit the preview pane.  Anything else falls through to the
          // legacy plain-text preview.
          if (screenState.contentType === "game") {
            const payload = tryDecodeGamePayload(screenState.content);
            if (payload) {
              const ts = screenState.textStyle;
              // Preview pane is roughly 1/5 the broadcast.  Floor at 8px
              // so the card stays readable even on tiny operator screens.
              const rawSize = ts?.fontSize ?? 64;
              const baseFs = Math.max(8, Math.round((rawSize * (layout.textScale ?? 1)) / 5));
              return (
                <div
                  style={{ width: `${layout.textWidthPct ?? 100}%`, height: "100%" }}
                  data-testid="preview-game-stage"
                >
                  <GameStageView
                    payload={payload}
                    baseFontSize={baseFs}
                    textStyle={{
                      fontFamily: ts?.fontFamily,
                      textColor: ts?.textColor,
                      accentColor: ts?.accentColor,
                    }}
                  />
                </div>
              );
            }
          }
          return (
            <div style={{ ...getPreviewStyle(), width: `${layout.textWidthPct ?? 100}%` }} className="whitespace-pre-wrap">
              {screenState.content}
            </div>
          );
        })()}
        {screenState.tickerEnabled && (
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-zinc-900 border-t border-zinc-800 text-white text-[8px] flex items-center px-1 overflow-hidden">
            <div className="whitespace-nowrap animate-[marquee_10s_linear_infinite]">{screenState.tickerText}</div>
          </div>
        )}
        {broadcastLive && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-green-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Now: <span className="font-medium text-foreground">{screenState.title || "None"}</span></p>
        <p className="capitalize">Type: {screenState.contentType}</p>
      </div>

      {/* ── Presentation Remote ── */}
      <div>
        <button
          onClick={() => setRemoteOpen(v => !v)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
        >
          <div className="flex items-center gap-2">
            <MonitorSpeaker className="w-3.5 h-3.5 text-primary" />
            Presentation Screen
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${remoteOpen ? "rotate-180" : ""}`} />
        </button>

        {remoteOpen && (
          <div className="mt-2 space-y-2 px-1">
            {!broadcastLive && (
              <p className="text-xs text-muted-foreground text-center py-1">Open the broadcast window first</p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <RemoteBtn
                onClick={isFullscreen ? remoteExitFullscreen : remoteFullscreen}
                icon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                active={isFullscreen}
                disabled={!broadcastLive}
              />
              <RemoteBtn
                onClick={remoteToggleCursor}
                icon={cursorHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                label={cursorHidden ? "Cursor Hidden" : "Show Cursor"}
                active={cursorHidden}
                disabled={!broadcastLive}
              />
              <RemoteBtn
                onClick={remotePip}
                icon={<PictureInPicture2 className="w-4 h-4" />}
                label="Picture-in-Picture"
                disabled={!broadcastLive}
              />
              <RemoteBtn
                onClick={remoteReload}
                icon={<RotateCcw className="w-4 h-4" />}
                label="Reload Screen"
                disabled={!broadcastLive}
                destructive
              />
            </div>

            {/* Text scroll controls */}
            <div className="pt-1.5 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Text Scroll</p>
              <div className="grid grid-cols-3 gap-1.5">
                <RemoteBtn
                  onClick={() => { sendCommand({ type: "scroll_auto_stop" }); setAutoScrollOn(false); sendCommand({ type: "scroll_up" }); }}
                  icon={<ArrowUp className="w-4 h-4" />}
                  label="Scroll Up"
                  disabled={!broadcastLive}
                />
                <RemoteBtn
                  onClick={() => { sendCommand({ type: "scroll_auto_stop" }); setAutoScrollOn(false); sendCommand({ type: "scroll_reset" }); }}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  label="Reset"
                  disabled={!broadcastLive}
                />
                <RemoteBtn
                  onClick={() => { sendCommand({ type: "scroll_auto_stop" }); setAutoScrollOn(false); sendCommand({ type: "scroll_down" }); }}
                  icon={<ArrowDown className="w-4 h-4" />}
                  label="Scroll Down"
                  disabled={!broadcastLive}
                />
              </div>

              {/* Auto-scroll (teleprompter) — continuous scroll at chosen speed.
                  Useful for long Bible passages or sermon notes where pressing
                  arrows repeatedly is impractical. */}
              <div className="mt-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3 h-3 text-primary/80" />
                    <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">Auto-scroll</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Fire-and-forget toggle — the broadcast decides start vs
                      // stop and echoes back via `scroll_auto_state`, which
                      // updates `autoScrollOn`.  No optimistic local flip.
                      sendCommand({ type: "scroll_auto_toggle", speed: autoScrollSpeed });
                    }}
                    disabled={!broadcastLive}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      autoScrollOn
                        ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                        : "bg-primary/15 text-primary hover:bg-primary/25"
                    }`}
                    data-testid="button-auto-scroll-toggle"
                  >
                    {autoScrollOn ? <><Pause className="w-3 h-3" /> Stop</> : <><Play className="w-3 h-3" /> Start</>}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: "Slow",   value: 30  },
                    { label: "Medium", value: 60  },
                    { label: "Fast",   value: 120 },
                  ].map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setAutoScrollSpeed(p.value);
                        // If running, restart at new speed (broadcast echoes the
                        // updated speed back via `scroll_auto_state`).
                        if (autoScrollOn) sendCommand({ type: "scroll_auto_start", speed: p.value });
                      }}
                      disabled={!broadcastLive}
                      className={`py-0.5 rounded text-[10px] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        autoScrollSpeed === p.value
                          ? "bg-primary/20 border-primary text-primary font-medium"
                          : "border-border/60 text-muted-foreground hover:bg-muted/50"
                      }`}
                      data-testid={`button-auto-scroll-${p.label.toLowerCase()}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                <kbd className="px-1 py-px rounded bg-muted/60 border border-border text-[9px] font-mono">↑</kbd>
                <kbd className="px-1 py-px rounded bg-muted/60 border border-border text-[9px] font-mono ml-0.5">↓</kbd>
                <span className="ml-1">scroll</span>
                <span className="mx-1.5">·</span>
                <kbd className="px-1 py-px rounded bg-muted/60 border border-border text-[9px] font-mono">Space</kbd>
                <span className="ml-1">auto</span>
                <span className="mx-1.5">·</span>
                <kbd className="px-1 py-px rounded bg-muted/60 border border-border text-[9px] font-mono">Home</kbd>
                <span className="ml-1">reset</span>
                <span className="block text-[9px] mt-0.5 italic opacity-70">Works anywhere in the app</span>
              </p>
            </div>

            {broadcastLive && (
              <button
                onClick={() => { broadcastWin?.close(); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-destructive/70 hover:text-destructive py-1 transition-colors"
              >
                <MonitorOff className="w-3 h-3" /> Close presentation window
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Stage Controls ── */}
      <div>
        <button
          onClick={() => setLayoutOpen(v => !v)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
        >
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-primary" />
            Stage Controls
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${layoutOpen ? "rotate-180" : ""}`} />
        </button>

        {layoutOpen && (
          <div className="mt-2 space-y-3 px-1">

            {/* Zoom */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <ZoomIn className="w-3 h-3" /> Zoom
                </label>
              </div>
              <NudgeControl
                data-testid="text-stage-zoom-value"
                value={Math.round((layout.textScale ?? 1) * 100)}
                onChange={v => updateLayout({ textScale: v / 100 })}
                min={40} max={400} step={5} unit="%" bigStep={25}
              />
            </div>

            {/* Text Width */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Text Width</label>
              <NudgeControl
                value={layout.textWidthPct ?? 100}
                onChange={v => updateLayout({ textWidthPct: v })}
                min={30} max={100} step={5} unit="%"
              />
            </div>

            {/* Vertical Position */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Vertical Position</label>
              <div className="grid grid-cols-3 gap-1">
                {(["top", "center", "bottom"] as const).map(v => (
                  <button key={v} onClick={() => updateLayout({ verticalAlign: v })}
                    className={`flex flex-col items-center gap-1 py-1.5 rounded-md text-xs transition-colors border ${vAlign === v ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/60"}`}
                  >
                    {v === "top" && <AlignStartVertical className="w-4 h-4" />}
                    {v === "center" && <AlignCenterVertical className="w-4 h-4" />}
                    {v === "bottom" && <AlignEndVertical className="w-4 h-4" />}
                    <span className="capitalize">{v}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontal Position */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Horizontal Position</label>
              <div className="grid grid-cols-3 gap-1">
                {(["left", "center", "right"] as const).map(h => (
                  <button key={h} onClick={() => updateLayout({ horizontalAlign: h })}
                    className={`flex flex-col items-center gap-1 py-1.5 rounded-md text-xs transition-colors border ${hAlign === h ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/60"}`}
                  >
                    {h === "left" && <AlignLeft className="w-4 h-4" />}
                    {h === "center" && <AlignCenter className="w-4 h-4" />}
                    {h === "right" && <AlignRight className="w-4 h-4" />}
                    <span className="capitalize">{h}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">H Padding</label>
                <NudgeControl
                  value={layout.paddingX ?? 8}
                  onChange={v => updateLayout({ paddingX: v })}
                  min={0} max={30} step={1} unit="%"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">V Padding</label>
                <NudgeControl
                  value={layout.paddingY ?? 8}
                  onChange={v => updateLayout({ paddingY: v })}
                  min={0} max={30} step={1} unit="%"
                />
              </div>
            </div>

            <button
              onClick={() => updateLayout({ textScale: 1, verticalAlign: "center", horizontalAlign: "center", paddingX: 8, paddingY: 8, textWidthPct: 100 })}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      ` }} />
    </div>
  );
}

function RemoteBtn({
  onClick, icon, label, active, disabled, destructive,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all border ${
        disabled
          ? "opacity-30 cursor-not-allowed border-border text-muted-foreground"
          : active
          ? "bg-primary/20 border-primary text-primary"
          : destructive
          ? "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive hover:bg-destructive/10"
          : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Replaces the old SliderWithButtons — a clean ± nudge control with value chip. */
function NudgeControl({
  value, onChange, min, max, step, unit = "", bigStep,
  "data-testid": testId,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number; max: number; step: number; unit?: string; bigStep?: number;
  "data-testid"?: string;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const decBig = () => bigStep !== undefined && onChange(Math.max(min, value - bigStep));
  const incBig = () => bigStep !== undefined && onChange(Math.min(max, value + bigStep));

  const btnCls = "w-7 h-7 rounded border border-border bg-muted/40 hover:bg-muted/70 hover:border-primary/40 text-foreground text-sm font-bold flex items-center justify-center transition-all active:scale-95 select-none";
  const bigBtnCls = "w-6 h-7 rounded border border-border/50 bg-transparent hover:bg-muted/50 text-muted-foreground text-[10px] font-bold flex items-center justify-center transition-all active:scale-95 select-none";

  return (
    <div className="flex items-center gap-1">
      {bigStep !== undefined && (
        <button onClick={decBig} className={bigBtnCls} title={`−${bigStep}`}>«</button>
      )}
      <button onClick={dec} className={btnCls}>−</button>
      <span
        data-testid={testId}
        className="flex-1 text-center text-xs font-mono font-semibold bg-muted/30 rounded py-1 px-1 min-w-0 tabular-nums"
      >
        {value}{unit}
      </span>
      <button onClick={inc} className={btnCls}>+</button>
      {bigStep !== undefined && (
        <button onClick={incBig} className={bigBtnCls} title={`+${bigStep}`}>»</button>
      )}
    </div>
  );
}
