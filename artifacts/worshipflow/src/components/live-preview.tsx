import { useState } from "react";
import { useGetScreenState, useUpdateScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, ExternalLink, Monitor, MonitorSpeaker, ChevronDown, Loader2,
  ZoomIn, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical, Maximize2
} from "lucide-react";
import { useBroadcast } from "@/hooks/use-broadcast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LivePreview() {
  const queryClient = useQueryClient();
  const [layoutOpen, setLayoutOpen] = useState(false);

  const { data: screenState, isLoading, error } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 2000 }
  });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }) }
  });

  const { screens, permissionState, detectScreens, openBroadcast, isWindowManagementSupported } = useBroadcast();
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const handleClear = () => updateScreen({ data: { isBlack: screenState.isBlack ?? false, isClear: true, contentType: screenState.contentType ?? "none", tickerEnabled: screenState.tickerEnabled ?? false } });
  const handleBlackScreen = () => updateScreen({ data: { isBlack: !(screenState.isBlack ?? false), isClear: screenState.isClear ?? false, contentType: screenState.contentType ?? "none", tickerEnabled: screenState.tickerEnabled ?? false } });

  const handleOpenDropdown = async () => {
    if (isWindowManagementSupported && screens.length === 0) await detectScreens();
    setPickerOpen(true);
  };

  const handleOpenOnScreen = async (screenIndex?: number) => {
    const target = screenIndex !== undefined ? screens[screenIndex] : undefined;
    await openBroadcast(target);
    setPickerOpen(false);
  };

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
      {/* ── Control bar ── */}
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

        {isWindowManagementSupported ? (
          <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-primary border-primary/40 hover:bg-primary/10" onClick={handleOpenDropdown}>
                {permissionState === "requesting" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MonitorSpeaker className="w-3.5 h-3.5" />}
                Broadcast<ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
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
                    <div className="truncate">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.width}×{s.height}{s.isPrimary ? " · Primary" : ""}</div>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenOnScreen(undefined)}>
                <ExternalLink className="w-4 h-4 mr-2" /> Open in new tab
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" onClick={() => openBroadcast()} className="gap-1.5 text-primary border-primary/40 hover:bg-primary/10">
            <ExternalLink className="w-3.5 h-3.5" /> Broadcast
          </Button>
        )}
      </div>

      {/* ── Screen preview (16:9) ── */}
      <div
        className="relative w-full aspect-video bg-black rounded overflow-hidden border border-border shadow-lg"
        style={{ display: "flex", alignItems: previewJustify, justifyContent: previewAlign, padding: `${(layout.paddingY ?? 8) / 3}% ${(layout.paddingX ?? 8) / 3}%` }}
      >
        {screenState.isBlack && <div className="absolute inset-0 bg-black z-50" />}

        {!screenState.isClear && screenState.content && (
          <div
            style={{ ...getPreviewStyle(), width: `${layout.textWidthPct ?? 100}%` }}
            className="whitespace-pre-wrap"
          >
            {screenState.content}
          </div>
        )}

        {screenState.tickerEnabled && (
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-zinc-900 border-t border-zinc-800 text-white text-[8px] flex items-center px-1 overflow-hidden">
            <div className="whitespace-nowrap animate-[marquee_10s_linear_infinite]">{screenState.tickerText}</div>
          </div>
        )}
      </div>

      {/* ── Current info ── */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Now: <span className="font-medium text-foreground">{screenState.title || "None"}</span></p>
        <p className="capitalize">Type: {screenState.contentType}</p>
        {isWindowManagementSupported && screens.length > 1 && (
          <p className="text-primary/70">{screens.length} displays detected</p>
        )}
      </div>

      {/* ── Stage / Layout controls ── */}
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
          {/* Zoom */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <ZoomIn className="w-3 h-3" /> Zoom
              </label>
              <span className="text-xs font-mono text-foreground">{Math.round((layout.textScale ?? 1) * 100)}%</span>
            </div>
            <Slider
              value={[Math.round((layout.textScale ?? 1) * 100)]}
              onValueChange={([v]) => updateLayout({ textScale: v / 100 })}
              min={40} max={200} step={5}
              className="w-full"
            />
          </div>

          {/* Text Width */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Text Width</label>
              <span className="text-xs font-mono text-foreground">{layout.textWidthPct ?? 100}%</span>
            </div>
            <Slider
              value={[layout.textWidthPct ?? 100]}
              onValueChange={([v]) => updateLayout({ textWidthPct: v })}
              min={30} max={100} step={5}
              className="w-full"
            />
          </div>

          {/* Vertical position */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Vertical Position</label>
            <div className="grid grid-cols-3 gap-1">
              {(["top", "center", "bottom"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => updateLayout({ verticalAlign: v })}
                  className={`flex flex-col items-center gap-1 py-1.5 rounded-md text-xs transition-colors border ${
                    vAlign === v ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {v === "top" && <AlignStartVertical className="w-4 h-4" />}
                  {v === "center" && <AlignCenterVertical className="w-4 h-4" />}
                  {v === "bottom" && <AlignEndVertical className="w-4 h-4" />}
                  <span className="capitalize">{v}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal position */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Horizontal Position</label>
            <div className="grid grid-cols-3 gap-1">
              {(["left", "center", "right"] as const).map(h => (
                <button
                  key={h}
                  onClick={() => updateLayout({ horizontalAlign: h })}
                  className={`flex flex-col items-center gap-1 py-1.5 rounded-md text-xs transition-colors border ${
                    hAlign === h ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {h === "left" && <AlignLeft className="w-4 h-4" />}
                  {h === "center" && <AlignCenter className="w-4 h-4" />}
                  {h === "right" && <AlignRight className="w-4 h-4" />}
                  <span className="capitalize">{h}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Padding nudge */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">H Padding</label>
                <span className="text-xs font-mono">{layout.paddingX ?? 8}%</span>
              </div>
              <Slider
                value={[layout.paddingX ?? 8]}
                onValueChange={([v]) => updateLayout({ paddingX: v })}
                min={0} max={30} step={1}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">V Padding</label>
                <span className="text-xs font-mono">{layout.paddingY ?? 8}%</span>
              </div>
              <Slider
                value={[layout.paddingY ?? 8]}
                onValueChange={([v]) => updateLayout({ paddingY: v })}
                min={0} max={30} step={1}
              />
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => updateLayout({ textScale: 1, verticalAlign: "center", horizontalAlign: "center", paddingX: 8, paddingY: 8, textWidthPct: 100 })}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
          >
            Reset to defaults
          </button>
        </div>}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      ` }} />
    </div>
  );
}
