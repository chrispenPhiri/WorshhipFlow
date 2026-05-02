import { useState, useEffect } from "react";
import { useGetScreenState, useUpdateScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { SliderWithButtons } from "./slider-with-buttons";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, ExternalLink, Monitor, MonitorSpeaker, ChevronDown, Loader2,
  ZoomIn, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Maximize2, Minimize2, EyeOff, Eye, RotateCcw, CheckCircle2, Tv2, PictureInPicture2,
  MonitorOff
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

  const handleClear = () => updateScreen({
    data: { isBlack: screenState.isBlack ?? false, isClear: true, contentType: screenState.contentType ?? "none", tickerEnabled: screenState.tickerEnabled ?? false }
  });
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

        {layoutOpen && <div className="mt-2 space-y-3 px-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs flex items-center gap-1.5 text-muted-foreground"><ZoomIn className="w-3 h-3" /> Zoom</label>
              <span className="text-xs font-mono text-foreground" data-testid="text-stage-zoom-value">{Math.round((layout.textScale ?? 1) * 100)}%</span>
            </div>
            {/* Big +/- buttons either side of the slider so the operator can
                nudge zoom one step at a time without precise pointer work. */}
            <SliderWithButtons
              data-testid="slider-stage-zoom"
              value={[Math.round((layout.textScale ?? 1) * 100)]}
              onValueChange={([v]) => updateLayout({ textScale: (v ?? 100) / 100 })}
              min={40} max={400} step={5}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Text Width</label>
              <span className="text-xs font-mono text-foreground">{layout.textWidthPct ?? 100}%</span>
            </div>
            <SliderWithButtons
              value={[layout.textWidthPct ?? 100]}
              onValueChange={([v]) => updateLayout({ textWidthPct: v ?? 100 })}
              min={30} max={100} step={5}
            />
          </div>

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

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">H Padding</label>
                <span className="text-xs font-mono">{layout.paddingX ?? 8}%</span>
              </div>
              <SliderWithButtons
                value={[layout.paddingX ?? 8]}
                onValueChange={([v]) => updateLayout({ paddingX: v ?? 8 })}
                min={0} max={30} step={1}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">V Padding</label>
                <span className="text-xs font-mono">{layout.paddingY ?? 8}%</span>
              </div>
              <SliderWithButtons
                value={[layout.paddingY ?? 8]}
                onValueChange={([v]) => updateLayout({ paddingY: v ?? 8 })}
                min={0} max={30} step={1}
              />
            </div>
          </div>

          <button
            onClick={() => updateLayout({ textScale: 1, verticalAlign: "center", horizontalAlign: "center", paddingX: 8, paddingY: 8, textWidthPct: 100 })}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
          >
            Reset to defaults
          </button>
        </div>}
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
