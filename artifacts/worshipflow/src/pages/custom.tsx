import { useLocalStorage } from "@/hooks/use-local-storage";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Type, Cast, AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, AlignVerticalJustifyCenter,
  MoveVertical, Sparkles, Wand2, ImagePlus, Loader2, Check, X,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SliderWithButtons } from "@/components/slider-with-buttons";
import { FONTS } from "@/lib/constants";
import { THEME_PRESETS, LIVE_WALLPAPERS } from "@/lib/themes";
import { LiveWallpaperLayer } from "@/components/live-wallpaper";

const GRADIENT_PRESETS = THEME_PRESETS.filter((t) => t.background.type === "gradient");
const DEFAULT_GRADIENT = GRADIENT_PRESETS[0]?.background.value ?? "linear-gradient(135deg,#1e1b4b,#000)";

export default function CustomTextPage() {
  // ── Typography (all persisted) ──────────────────────────────────────────
  const [content, setContent]           = useLocalStorage("wf-custom-content", "Welcome to Worship");
  const [fontFamily, setFontFamily]     = useLocalStorage("wf-custom-font", "Inter");
  const [fontSize, setFontSize]         = useLocalStorage<number[]>("wf-custom-font-size", [64]);
  const [alignment, setAlignment]       = useLocalStorage<"left" | "center" | "right">("wf-custom-align", "center");
  const [bold, setBold]                 = useLocalStorage("wf-custom-bold", false);
  const [italic, setItalic]             = useLocalStorage("wf-custom-italic", false);
  const [textColor, setTextColor]       = useLocalStorage("wf-custom-text-color", "#ffffff");
  const [animation, setAnimation]       = useLocalStorage<"none" | "fade_in" | "glow" | "float">("wf-custom-anim", "fade_in");

  // ── Background (all persisted) ──────────────────────────────────────────
  const [bgType, setBgType]             = useLocalStorage<"color" | "gradient" | "wallpaper">("wf-custom-bg-type", "color");
  const [bgColor, setBgColor]           = useLocalStorage("wf-custom-bg-color", "#000000");
  const [bgGradient, setBgGradient]     = useLocalStorage("wf-custom-bg-gradient", DEFAULT_GRADIENT);
  const [bgWallpaper, setBgWallpaper]   = useLocalStorage("wf-custom-bg-wallpaper", "aurora");
  const [bgOverlay, setBgOverlay]       = useLocalStorage<number[]>("wf-custom-bg-overlay", [30]);

  // ── AI state (not persisted) ────────────────────────────────────────────
  const [aiCorrecting, setAiCorrecting] = useState(false);
  const [aiCorrected, setAiCorrected]   = useState(false);
  const [imgPrompt, setImgPrompt]       = useState("");
  const [imgGenerating, setImgGenerating] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [imgError, setImgError]         = useState<string | null>(null);
  const correctionAbort = useRef<AbortController | null>(null);

  // ── Position / Layout (all persisted) ──────────────────────────────────
  const [vAlign, setVAlign]             = useLocalStorage<"top" | "center" | "bottom">("wf-custom-valign", "center");
  const [hAlign, setHAlign]             = useLocalStorage<"left" | "center" | "right">("wf-custom-halign", "center");
  const [padX, setPadX]                 = useLocalStorage<number>("wf-custom-padx", 8);
  const [padY, setPadY]                 = useLocalStorage<number>("wf-custom-pady", 8);

  const background =
    bgType === "color"
      ? { type: "color" as const, value: bgColor }
      : bgType === "gradient"
      ? { type: "gradient" as const, value: bgGradient }
      : { type: "live_wallpaper" as const, value: bgWallpaper, overlay: bgOverlay[0] };

  const queryClient = useQueryClient();
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  const handleSendToScreen = () => {
    updateScreen({
      data: {
        contentType: "custom_text",
        title: "Custom Text",
        content,
        isBlack: false,
        isClear: false,
        textStyle: {
          fontFamily,
          fontSize: fontSize[0],
          textColor,
          alignment,
          animation,
          bold,
          italic,
        },
        background,
        layout: {
          verticalAlign: vAlign,
          horizontalAlign: hAlign,
          paddingX: padX,
          paddingY: padY,
        },
      },
    });
  };

  // Inline preview styles
  const previewBgStyle: React.CSSProperties =
    bgType === "color"
      ? { backgroundColor: bgColor }
      : bgType === "gradient"
      ? { background: bgGradient }
      : {};

  const handleAiCorrect = async () => {
    if (!content.trim() || aiCorrecting) return;
    correctionAbort.current?.abort();
    const ctrl = new AbortController();
    correctionAbort.current = ctrl;
    setAiCorrecting(true);
    setAiCorrected(false);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/ai/enhance-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error("AI error");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let out = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.content) { out += d.content; setContent(out); }
            } catch { /* ignore */ }
          }
        }
      }
      setAiCorrected(true);
      setTimeout(() => setAiCorrected(false), 3000);
    } catch { /* ignore abort */ } finally {
      setAiCorrecting(false);
    }
  };

  const handleAiImage = async () => {
    if (!imgPrompt.trim() || imgGenerating) return;
    setImgGenerating(true);
    setImgError(null);
    setGeneratedImg(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/ai/custom-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imgPrompt }),
      });
      const data = await res.json() as { b64_json?: string; error?: string };
      if (data.error) throw new Error(data.error);
      if (data.b64_json) {
        setGeneratedImg(`data:image/png;base64,${data.b64_json}`);
      }
    } catch (e) {
      setImgError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setImgGenerating(false);
    }
  };

  const nudge = (dir: "up" | "down" | "left" | "right") => {
    const step = 4;
    if (dir === "up")    setPadY(v => Math.max(0, v - step));
    if (dir === "down")  setPadY(v => Math.min(45, v + step));
    if (dir === "left")  setPadX(v => Math.max(0, v - step));
    if (dir === "right") setPadX(v => Math.min(45, v + step));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <Type className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Text</h1>
          <p className="text-muted-foreground text-sm mt-0.5">All settings are saved automatically</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Left: preview + textarea ─────────────────────────────────────── */}
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col">
            {/* Live preview strip */}
            <div
              className="relative w-full h-24 rounded-lg overflow-hidden border border-border shrink-0"
              style={previewBgStyle}
            >
              {bgType === "wallpaper" && (
                <LiveWallpaperLayer wallpaperId={bgWallpaper} overlay={bgOverlay[0]} />
              )}
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <span
                  className="text-center leading-snug line-clamp-2 drop-shadow"
                  style={{
                    fontFamily,
                    color: textColor,
                    fontWeight: bold ? "bold" : "normal",
                    fontStyle: italic ? "italic" : "normal",
                    fontSize: `${Math.min(Math.round(fontSize[0] / 3.2), 22)}px`,
                    textAlign: alignment,
                  }}
                >
                  {content || "Preview"}
                </span>
              </div>
            </div>

            <div className="relative flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your custom text here..."
                className="flex-1 min-h-[200px] text-lg resize-none w-full"
                style={{
                  fontFamily,
                  fontWeight: bold ? "bold" : "normal",
                  fontStyle: italic ? "italic" : "normal",
                  textAlign: alignment,
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSendToScreen} className="flex-1 gap-2">
                <Cast className="w-4 h-4" /> Send to Screen
              </Button>
              <Button
                variant="outline"
                onClick={handleAiCorrect}
                disabled={aiCorrecting || !content.trim()}
                className="gap-1.5 shrink-0"
                title="AI Text Correction — fixes spelling, grammar and capitalisation"
              >
                {aiCorrecting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : aiCorrected
                  ? <Check className="w-4 h-4 text-green-500" />
                  : <Wand2 className="w-4 h-4" />}
                {aiCorrecting ? "Fixing…" : aiCorrected ? "Fixed!" : "Fix Text"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Right: Typography + Position + Background ─────────────────────── */}
        <div className="space-y-4">
          {/* AI Image Generator */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Image Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Describe a worship background image and AI will generate it for you.</p>
              <div className="flex gap-2">
                <Input
                  value={imgPrompt}
                  onChange={e => setImgPrompt(e.target.value)}
                  placeholder="e.g. purple sunset with a cross on a hill…"
                  className="flex-1 text-sm h-9"
                  onKeyDown={e => { if (e.key === "Enter") handleAiImage(); }}
                />
                <Button
                  size="sm"
                  onClick={handleAiImage}
                  disabled={imgGenerating || !imgPrompt.trim()}
                  className="gap-1.5 shrink-0 h-9"
                >
                  {imgGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  {imgGenerating ? "Generating…" : "Generate"}
                </Button>
              </div>
              {imgError && (
                <p className="text-xs text-destructive flex items-center gap-1"><X className="w-3 h-3" />{imgError}</p>
              )}
              {generatedImg && (
                <div className="space-y-2">
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                    <img src={generatedImg} alt="AI generated background" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={generatedImg}
                      download="worship-background.png"
                      className="flex-1 flex items-center justify-center gap-1.5 h-8 text-xs rounded-md border border-border hover:bg-muted/40 transition-colors"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => setGeneratedImg(null)}
                      className="h-8 px-3 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Typography */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Typography</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Font Family</label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Font Size</label>
                  <span className="text-sm text-muted-foreground">{fontSize[0]}px</span>
                </div>
                <SliderWithButtons value={fontSize} onValueChange={setFontSize} min={24} max={144} step={2} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Style & Alignment</label>
                <div className="flex gap-2 flex-wrap">
                  <Toggle pressed={bold} onPressedChange={setBold} aria-label="Bold">
                    <Bold className="w-4 h-4" />
                  </Toggle>
                  <Toggle pressed={italic} onPressedChange={setItalic} aria-label="Italic">
                    <Italic className="w-4 h-4" />
                  </Toggle>
                  <div className="h-10 w-px bg-border mx-1" />
                  <Toggle pressed={alignment === "left"} onPressedChange={() => setAlignment("left")}>
                    <AlignLeft className="w-4 h-4" />
                  </Toggle>
                  <Toggle pressed={alignment === "center"} onPressedChange={() => setAlignment("center")}>
                    <AlignCenter className="w-4 h-4" />
                  </Toggle>
                  <Toggle pressed={alignment === "right"} onPressedChange={() => setAlignment("right")}>
                    <AlignRight className="w-4 h-4" />
                  </Toggle>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Animation</label>
                <Select value={animation} onValueChange={(v) => setAnimation(v as typeof animation)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fade_in">Fade In</SelectItem>
                    <SelectItem value="glow">Glow</SelectItem>
                    <SelectItem value="float">Float</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Text Color</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-10 h-8 p-0.5 cursor-pointer"
                  />
                  <Input
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1 h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Position */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MoveVertical className="w-4 h-4 text-primary" />
                Position
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vertical alignment */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vertical</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["top", "center", "bottom"] as const).map(v => (
                    <button key={v}
                      onClick={() => setVAlign(v)}
                      className={`py-1.5 rounded text-xs capitalize border transition-colors ${vAlign === v ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horizontal alignment */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Horizontal</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["left", "center", "right"] as const).map(h => (
                    <button key={h}
                      onClick={() => setHAlign(h)}
                      className={`py-1.5 rounded text-xs capitalize border transition-colors ${hAlign === h ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nudge arrows */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nudge Position</label>
                <div className="grid grid-cols-3 gap-1 w-28 mx-auto">
                  <div />
                  <button onClick={() => nudge("up")} className="flex items-center justify-center h-9 rounded border border-border hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <div />
                  <button onClick={() => nudge("left")} className="flex items-center justify-center h-9 rounded border border-border hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setPadX(8); setPadY(8); }} className="flex items-center justify-center h-9 rounded border border-border hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground text-[9px] font-bold">
                    CTR
                  </button>
                  <button onClick={() => nudge("right")} className="flex items-center justify-center h-9 rounded border border-border hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <div />
                  <button onClick={() => nudge("down")} className="flex items-center justify-center h-9 rounded border border-border hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <div />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Pad {padX}% · {padY}%
                </p>
              </div>

              {/* Fine-grained sliders */}
              <div className="space-y-2 pt-1 border-t border-border/50">
                <div className="flex justify-between text-xs">
                  <label className="font-medium flex items-center gap-1"><AlignLeft className="w-3 h-3" /> Side Padding</label>
                  <span className="text-muted-foreground">{padX}%</span>
                </div>
                <SliderWithButtons min={0} max={45} step={1} value={[padX]} onValueChange={([v]) => setPadX(v)} />
                <div className="flex justify-between text-xs">
                  <label className="font-medium flex items-center gap-1"><AlignVerticalJustifyCenter className="w-3 h-3" /> Top/Bottom Padding</label>
                  <span className="text-muted-foreground">{padY}%</span>
                </div>
                <SliderWithButtons min={0} max={45} step={1} value={[padY]} onValueChange={([v]) => setPadY(v)} />
              </div>
            </CardContent>
          </Card>

          {/* Background */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Background</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Type selector */}
              <div className="grid grid-cols-3 gap-1.5">
                {(["color", "gradient", "wallpaper"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBgType(t)}
                    className={`py-1.5 rounded text-xs capitalize transition-colors border ${
                      bgType === t
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Color picker */}
              {bgType === "color" && (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-8 w-10 rounded border border-input bg-transparent p-0.5 cursor-pointer"
                    />
                    <Input
                      className="h-8 text-xs font-mono"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {["#000000", "#0f172a", "#1e1b4b", "#0c1445", "#052e16", "#1c0a00", "#18181b", "#1f2937"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setBgColor(c)}
                        className={`w-7 h-7 rounded border-2 transition-all hover:scale-110 ${
                          bgColor === c ? "border-primary scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Gradient presets */}
              {bgType === "gradient" && (
                <div className="grid grid-cols-3 gap-1.5">
                  {GRADIENT_PRESETS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setBgGradient(t.background.value)}
                      title={t.name}
                      className={`h-10 rounded border-2 transition-all hover:scale-[1.05] ${
                        bgGradient === t.background.value ? "border-primary" : "border-transparent"
                      }`}
                      style={{ background: t.background.value }}
                    />
                  ))}
                </div>
              )}

              {/* Live wallpaper picker */}
              {bgType === "wallpaper" && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    {LIVE_WALLPAPERS.map((wp) => (
                      <button
                        key={wp.id}
                        onClick={() => setBgWallpaper(wp.id)}
                        className={`w-full flex items-center gap-2 p-1.5 rounded border text-left transition-colors ${
                          bgWallpaper === wp.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="relative w-12 h-7 rounded overflow-hidden shrink-0 bg-black">
                          <LiveWallpaperLayer wallpaperId={wp.id} />
                        </div>
                        <span className="text-xs font-medium">{wp.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs">
                      <label className="font-medium">Dark Overlay</label>
                      <span className="text-muted-foreground">{bgOverlay[0]}%</span>
                    </div>
                    <SliderWithButtons
                      min={0}
                      max={80}
                      step={5}
                      value={bgOverlay}
                      onValueChange={setBgOverlay}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
