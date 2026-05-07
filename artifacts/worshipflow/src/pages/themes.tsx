import { useState } from "react";
import { useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SliderWithButtons } from "@/components/slider-with-buttons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollapsibleTabsBar } from "@/components/ui/collapsible-tabs";
import { useCollapsibleTabs } from "@/lib/use-collapsible-tabs";

const THEMES_TAB_LABELS: Record<string, string> = {
  themes: "Themes", wallpapers: "Live Wallpapers", typography: "Fonts & Colours",
};
import { Badge } from "@/components/ui/badge";
import { Cast, Palette, Sparkles, Type, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { THEME_PRESETS, LIVE_WALLPAPERS, COLOR_PALETTES, FONT_COLLECTION, type ThemePreset } from "@/lib/themes";
import { LiveWallpaperLayer } from "@/components/live-wallpaper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic } from "lucide-react";

function ThemePreview({ theme, isActive, onApply }: {
  theme: ThemePreset;
  isActive: boolean;
  onApply: (t: ThemePreset) => void;
}) {
  const isLive = theme.background.type === "live_wallpaper";
  const wallpaperId = isLive ? theme.background.value : null;

  return (
    <Card
      className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${isActive ? "ring-2 ring-primary shadow-primary/20 shadow-lg" : "hover:border-primary/40"}`}
      onClick={() => onApply(theme)}
    >
      <div className="relative h-28 rounded-t-lg overflow-hidden select-none">
        {isLive && wallpaperId ? (
          <LiveWallpaperLayer wallpaperId={wallpaperId} overlay={theme.background.overlay} />
        ) : theme.background.type === "gradient" ? (
          <div className="absolute inset-0" style={{ background: theme.background.value }} />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: theme.background.value || "#000" }} />
        )}
        <div className="absolute inset-0 flex items-center justify-center px-3">
          <span
            style={{
              fontFamily: theme.textStyle.fontFamily,
              color: theme.textStyle.textColor,
              fontWeight: theme.textStyle.bold ? "bold" : "normal",
              textShadow: "0 1px 6px rgba(0,0,0,0.8)",
            }}
            className="text-sm text-center leading-tight drop-shadow-lg"
          >
            Aa — {theme.name}
          </span>
        </div>
        {isActive && (
          <div className="absolute top-2 right-2">
            <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20 drop-shadow" />
          </div>
        )}
        {isLive && (
          <Badge className="absolute bottom-2 left-2 text-[10px] py-0 bg-black/60 border-0">
            <Sparkles className="w-2.5 h-2.5 mr-1" /> Live
          </Badge>
        )}
      </div>

      <CardContent className="p-3">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{theme.name}</p>
            <p className="text-xs text-muted-foreground truncate">{theme.description}</p>
          </div>
          <Button
            size="sm"
            variant={isActive ? "default" : "outline"}
            className="shrink-0 h-7 px-2 text-xs gap-1"
            onClick={(e) => { e.stopPropagation(); onApply(theme); }}
          >
            <Cast className="w-3 h-3" />
            Apply
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">{theme.textStyle.fontFamily}</p>
      </CardContent>
    </Card>
  );
}

function WallpaperCard({ wallpaper, isActive, onApply }: {
  wallpaper: { id: string; name: string; description: string };
  isActive: boolean;
  onApply: (id: string) => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:scale-[1.02] ${isActive ? "ring-2 ring-primary" : "hover:border-primary/40"}`}
      onClick={() => onApply(wallpaper.id)}
    >
      <div className="relative h-24 rounded-t-lg overflow-hidden">
        <LiveWallpaperLayer wallpaperId={wallpaper.id} />
        {isActive && (
          <div className="absolute top-2 right-2">
            <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20" />
          </div>
        )}
      </div>
      <CardContent className="p-3 flex justify-between items-center gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm">{wallpaper.name}</p>
          <p className="text-xs text-muted-foreground truncate">{wallpaper.description}</p>
        </div>
        <Button
          size="sm"
          variant={isActive ? "default" : "outline"}
          className="shrink-0 h-7 px-2 text-xs"
          onClick={(e) => { e.stopPropagation(); onApply(wallpaper.id); }}
        >
          Set
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ThemesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const themesTab = useCollapsibleTabs("themes", "themes");

  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 3000 },
  });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to apply", description: "Could not update the screen. Please try again.", variant: "destructive" });
      },
    },
  });

  const [overlayPct, setOverlayPct] = useState([30]);
  const [customFont, setCustomFont] = useState("Inter");
  const [customFontSize, setCustomFontSize] = useState([64]);
  const [customColor, setCustomColor] = useState("#ffffff");
  const [customBold, setCustomBold] = useState(false);
  const [customItalic, setCustomItalic] = useState(false);
  const [customAlign, setCustomAlign] = useState<"left" | "center" | "right">("center");
  const [customAnim, setCustomAnim] = useState<"none" | "fade_in" | "glow" | "float">("fade_in");
  const [bgColor, setBgColor] = useState("#000000");

  const currentBg = screenState?.background;
  const activeThemeId = THEME_PRESETS.find(
    (t) => t.background.type === currentBg?.type && t.background.value === currentBg?.value
  )?.id;
  const activeWallpaper = currentBg?.type === "live_wallpaper" ? currentBg.value : null;

  // Build a safe base from screenState — never spread the raw DB row directly
  // since it may include null values that fail Zod validation
  const safeBase = {
    isBlack: screenState?.isBlack ?? false,
    isClear: screenState?.isClear ?? false,
    contentType: (screenState?.contentType as "none" | "verse" | "song" | "custom_text" | "image" | "video") ?? "none",
    title: screenState?.title ?? undefined,
    content: screenState?.content ?? undefined,
    tickerEnabled: screenState?.tickerEnabled ?? false,
    tickerText: screenState?.tickerText ?? undefined,
  };

  const applyTheme = (theme: ThemePreset) => {
    updateScreen({
      data: {
        ...safeBase,
        background: {
          type: theme.background.type as "color" | "gradient" | "image" | "video" | "camera" | "live_wallpaper",
          value: theme.background.value,
          overlay: theme.background.overlay,
        },
        textStyle: {
          fontFamily: theme.textStyle.fontFamily,
          fontSize: theme.textStyle.fontSize,
          textColor: theme.textStyle.textColor,
          bold: theme.textStyle.bold,
          italic: theme.textStyle.italic,
          alignment: theme.textStyle.alignment,
          animation: theme.textStyle.animation,
        },
      },
    });
    toast({ title: `Theme applied`, description: `"${theme.name}" is now live on screen.` });
  };

  const applyWallpaper = (wallpaperId: string) => {
    updateScreen({
      data: {
        ...safeBase,
        background: {
          type: "live_wallpaper",
          value: wallpaperId,
          overlay: overlayPct[0],
        },
      },
    });
    toast({ title: "Wallpaper set", description: "Live wallpaper is now active on screen." });
  };

  const applyCustomTypography = () => {
    updateScreen({
      data: {
        ...safeBase,
        textStyle: {
          fontFamily: customFont,
          fontSize: customFontSize[0],
          textColor: customColor,
          bold: customBold,
          italic: customItalic,
          alignment: customAlign,
          animation: customAnim,
        },
      },
    });
    toast({ title: "Typography updated", description: "Text style applied to the screen." });
  };

  const applyBgColor = () => {
    updateScreen({
      data: {
        ...safeBase,
        background: {
          type: "color",
          value: bgColor,
        },
      },
    });
    toast({ title: "Background updated", description: "Solid colour background applied." });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <Palette className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Themes & Appearance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Preset themes, live wallpapers, fonts and colour palettes</p>
        </div>
      </div>

      <Tabs value={themesTab.active} onValueChange={themesTab.setActive}>
        <CollapsibleTabsBar
          collapsed={themesTab.collapsed}
          onToggle={() => themesTab.setCollapsed((c) => !c)}
          activeLabel={THEMES_TAB_LABELS[themesTab.active]}
        >
          <TabsList className="w-full">
            <TabsTrigger value="themes" className="flex-1 gap-1.5"><Palette className="w-4 h-4" /> Themes</TabsTrigger>
            <TabsTrigger value="wallpapers" className="flex-1 gap-1.5"><Sparkles className="w-4 h-4" /> Live Wallpapers</TabsTrigger>
            <TabsTrigger value="typography" className="flex-1 gap-1.5"><Type className="w-4 h-4" /> Fonts & Colours</TabsTrigger>
          </TabsList>
        </CollapsibleTabsBar>

        {/* ── THEMES ── */}
        <TabsContent value="themes" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {THEME_PRESETS.map((theme) => (
              <ThemePreview
                key={theme.id}
                theme={theme}
                isActive={activeThemeId === theme.id}
                onApply={applyTheme}
              />
            ))}
          </div>
        </TabsContent>

        {/* ── LIVE WALLPAPERS ── */}
        <TabsContent value="wallpapers" className="mt-6 space-y-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap w-32">Dark Overlay: {overlayPct[0]}%</label>
            <SliderWithButtons value={overlayPct} onValueChange={setOverlayPct} min={0} max={80} step={5} className="flex-1 max-w-xs" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {LIVE_WALLPAPERS.map((wp) => (
              <WallpaperCard
                key={wp.id}
                wallpaper={wp}
                isActive={activeWallpaper === wp.id}
                onApply={applyWallpaper}
              />
            ))}
          </div>
        </TabsContent>

        {/* ── TYPOGRAPHY & COLORS ── */}
        <TabsContent value="typography" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">

            {/* Font controls */}
            <CollapsibleCard
              id="themes-typography"
              icon={Type}
              title="Typography"
              contentClassName="space-y-5"
            >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Font Family</label>
                  <Select value={customFont} onValueChange={setCustomFont}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_COLLECTION.map((f) => (
                        <SelectItem key={f.name} value={f.name}>
                          <span style={{ fontFamily: f.name }}>{f.label}</span>
                          <span className="text-muted-foreground text-xs ml-2">({f.style})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div
                    className="p-3 bg-black rounded text-center text-lg"
                    style={{ fontFamily: customFont, color: customColor, fontWeight: customBold ? "bold" : "normal", fontStyle: customItalic ? "italic" : "normal" }}
                  >
                    The Lord is my shepherd
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Font Size</label>
                    <span className="text-sm text-muted-foreground">{customFontSize[0]}px</span>
                  </div>
                  <SliderWithButtons value={customFontSize} onValueChange={setCustomFontSize} min={24} max={144} step={2} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Style & Alignment</label>
                  <div className="flex gap-2 flex-wrap">
                    <Toggle pressed={customBold} onPressedChange={setCustomBold} aria-label="Bold"><Bold className="w-4 h-4" /></Toggle>
                    <Toggle pressed={customItalic} onPressedChange={setCustomItalic} aria-label="Italic"><Italic className="w-4 h-4" /></Toggle>
                    <div className="h-10 w-px bg-border mx-1" />
                    <Toggle pressed={customAlign === "left"} onPressedChange={() => setCustomAlign("left")}><AlignLeft className="w-4 h-4" /></Toggle>
                    <Toggle pressed={customAlign === "center"} onPressedChange={() => setCustomAlign("center")}><AlignCenter className="w-4 h-4" /></Toggle>
                    <Toggle pressed={customAlign === "right"} onPressedChange={() => setCustomAlign("right")}><AlignRight className="w-4 h-4" /></Toggle>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Animation</label>
                  <Select value={customAnim} onValueChange={(v) => setCustomAnim(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="fade_in">Fade In</SelectItem>
                      <SelectItem value="glow">Glow</SelectItem>
                      <SelectItem value="float">Float</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={applyCustomTypography} className="w-full gap-2">
                  <Cast className="w-4 h-4" /> Apply Typography
                </Button>
            </CollapsibleCard>

            {/* Colour controls */}
            <div className="space-y-4">
              <CollapsibleCard
                id="themes-text-colour"
                icon={Palette}
                title="Text Colour"
                contentClassName="space-y-4"
              >
                  <div className="flex gap-3 items-center">
                    <Input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="w-14 h-10 p-1 cursor-pointer" />
                    <Input value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="flex-1 font-mono" />
                  </div>

                  {COLOR_PALETTES.map((palette) => (
                    <div key={palette.name} className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">{palette.name}</p>
                      <div className="flex gap-2 flex-wrap">
                        {palette.colors.map((c) => (
                          <button
                            key={c}
                            onClick={() => setCustomColor(c)}
                            className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${customColor === c ? "border-primary scale-110" : "border-transparent"}`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </CollapsibleCard>

              <CollapsibleCard
                id="themes-bg-colour"
                icon={Sparkles}
                title="Background Colour"
                contentClassName="space-y-3"
              >
                  <div className="flex gap-3 items-center">
                    <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-14 h-10 p-1 cursor-pointer" />
                    <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 font-mono" />
                    <Button onClick={applyBgColor} variant="outline" size="sm">Set</Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["#000000", "#0f172a", "#1e1b4b", "#0c1445", "#052e16", "#1c0a00", "#18181b", "#1f2937"].map((c) => (
                      <button
                        key={c}
                        onClick={() => { setBgColor(c); }}
                        className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${bgColor === c ? "border-primary scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
              </CollapsibleCard>
            </div>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
