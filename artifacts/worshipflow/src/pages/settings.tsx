import { useState, useEffect } from "react";
import { 
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Palette, Type, RotateCcw, Check, LayoutGrid, BookOpen, Smile, Sparkles, ExternalLink, ImageIcon, Music2, MessageSquare, KeyRound, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { useBibleOnlyMode } from "@/lib/bible-only-mode";
import { BIBLE_TRANSLATIONS, FONTS } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

import { useControlAppearance } from "@/hooks/use-control-appearance";
import {
  COLOR_PRESETS, APP_FONTS, DEFAULT_COLOR_ID, DEFAULT_FONT_ID,
} from "@/lib/control-appearance";
import {
  DEFAULT_NAV_ITEMS, ICON_CHOICES, effectiveIconId,
  getIconComponent, useMenuCustomization, useEmojiMode, effectiveEmoji,
} from "@/lib/menu-customization";
import { InstallAppCard } from "@/components/install-app-card";
import { getDailyImageCount } from "@/lib/ai-usage";

const OPENAI_KEY_STORAGE = "wf-openai-key";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() }
  });

  const { mutate: updateSettings, isPending } = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved", description: "Your app settings have been updated." });
      }
    }
  });

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings({ data: formData });
  };

  if (isLoading) {
    return <div className="p-8 animate-pulse space-y-4 max-w-2xl"><div className="h-8 bg-muted w-1/3 rounded"/><div className="h-64 bg-muted rounded"/></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure global app behavior and defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Church Name</label>
            <Input 
              value={formData.churchName || ""} 
              onChange={(e) => setFormData({...formData, churchName: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Bible Version</label>
              <Select 
                value={formData.defaultBibleVersion || "KJV"} 
                onValueChange={(v) => setFormData({...formData, defaultBibleVersion: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BIBLE_TRANSLATIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Font</label>
              <Select 
                value={formData.defaultFont || "Inter"} 
                onValueChange={(v) => setFormData({...formData, defaultFont: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Ticker Bar</label>
                <p className="text-xs text-muted-foreground">Show scrolling text at the bottom of the screen</p>
              </div>
              <Switch 
                checked={formData.tickerEnabled || false} 
                onCheckedChange={(c) => setFormData({...formData, tickerEnabled: c})} 
              />
            </div>
            
            {formData.tickerEnabled && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Ticker Text</label>
                <Input 
                  value={formData.tickerText || ""} 
                  onChange={(e) => setFormData({...formData, tickerText: e.target.value})} 
                  placeholder="Welcome to our service!"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <InstallAppCard />

      <AiSettingsCard />

      <ControlAppearanceCard />

      <BibleOnlyModeCard />

      <MainMenuCustomizationCard />
    </div>
  );
}

/**
 * AI feature toggles and daily image limit.
 * Persisted to IndexedDB settings (same as General Settings).
 */
function AiSettingsCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const { mutate: updateSettings, isPending } = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "AI settings saved" });
      },
    },
  });

  const [form, setForm] = useState({
    aiEnabled: true,
    aiChatEnabled: true,
    aiSongEnabled: true,
    aiImageEnabled: true,
    aiDailyImageLimit: 20,
  });

  /* ── OpenAI API Key (localStorage) ── */
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(OPENAI_KEY_STORAGE) ?? "");
  const [keyInput, setKeyInput] = useState(() => localStorage.getItem(OPENAI_KEY_STORAGE) ?? "");
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState("");
  const keyConfigured = apiKey.startsWith("sk-");

  function saveKey() {
    const trimmed = keyInput.trim();
    localStorage.setItem(OPENAI_KEY_STORAGE, trimmed);
    setApiKey(trimmed);
    toast({ title: trimmed ? "API key saved" : "API key cleared" });
    setTestStatus("idle");
  }

  function clearKey() {
    localStorage.removeItem(OPENAI_KEY_STORAGE);
    setApiKey("");
    setKeyInput("");
    setTestStatus("idle");
    toast({ title: "API key cleared" });
  }

  async function testKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setTestStatus("testing");
    setTestError("");
    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-OpenAI-Key": trimmed },
        body: JSON.stringify({ messages: [{ role: "user", content: "Say OK" }] }),
      });
      if (!res.ok) {
        const txt = await res.text();
        let msg = txt;
        try { msg = (JSON.parse(txt) as { message?: string }).message ?? txt; } catch { /* */ }
        setTestStatus("error");
        setTestError(msg);
      } else {
        await res.body?.cancel();
        setTestStatus("ok");
        localStorage.setItem(OPENAI_KEY_STORAGE, trimmed);
        setApiKey(trimmed);
      }
    } catch (e) {
      setTestStatus("error");
      setTestError(e instanceof Error ? e.message : "Connection failed");
    }
  }

  useEffect(() => {
    if (settings) {
      setForm({
        aiEnabled: settings.aiEnabled !== false,
        aiChatEnabled: settings.aiChatEnabled !== false,
        aiSongEnabled: settings.aiSongEnabled !== false,
        aiImageEnabled: settings.aiImageEnabled !== false,
        aiDailyImageLimit: typeof settings.aiDailyImageLimit === "number" ? settings.aiDailyImageLimit : 20,
      });
    }
  }, [settings]);

  const todayImages = getDailyImageCount();
  const limitLabel = form.aiDailyImageLimit === 0 ? "unlimited" : `${todayImages} / ${form.aiDailyImageLimit} today`;

  function save() {
    if (!settings) return;
    updateSettings({ data: { ...settings, ...form } });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Features
        </CardTitle>
        <CardDescription>
          Add your own OpenAI API key to unlock AI features. Charges go directly to your OpenAI account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── OpenAI API Key ─────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">OpenAI API Key</p>
            </div>
            {keyConfigured ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <XCircle className="w-3.5 h-3.5" /> Not set — AI disabled
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            AI features require your own OpenAI key. Charges go directly to your OpenAI account — no extra costs here.{" "}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-0.5">
              Get a key <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={keyInput}
                onChange={e => { setKeyInput(e.target.value); setTestStatus("idle"); }}
                className="pr-9 text-sm font-mono"
                data-testid="input-openai-key"
              />
              <button
                type="button"
                onClick={() => setShowKey(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              size="sm" variant="outline"
              onClick={testKey}
              disabled={!keyInput.trim() || testStatus === "testing"}
              data-testid="button-test-key"
            >
              {testStatus === "testing" ? "Testing…" : "Test"}
            </Button>
            <Button
              size="sm"
              onClick={saveKey}
              disabled={!keyInput.trim()}
              data-testid="button-save-key"
            >
              Save
            </Button>
          </div>
          {testStatus === "ok" && (
            <p className="text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connection successful — key works!
            </p>
          )}
          {testStatus === "error" && (
            <p className="text-[11px] text-destructive flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {testError}
            </p>
          )}
          {keyConfigured && (
            <button
              type="button"
              onClick={clearKey}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline"
            >
              Remove key
            </button>
          )}
        </div>

        {/* Master toggle */}
        <div className={`flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-border bg-muted/30 transition-opacity ${!keyConfigured ? "opacity-50 pointer-events-none" : ""}`}>
          <div>
            <p className="text-sm font-medium">Enable AI Features</p>
            <p className="text-[11px] text-muted-foreground">Master switch — turns off all AI tools at once</p>
          </div>
          <Switch
            checked={form.aiEnabled}
            onCheckedChange={v => setForm(f => ({ ...f, aiEnabled: v }))}
            data-testid="switch-ai-enabled"
          />
        </div>

        {/* Per-feature toggles */}
        <div className={`space-y-3 transition-opacity ${form.aiEnabled ? "" : "opacity-40 pointer-events-none"}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Individual features</p>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Chat &amp; Quick Prompts</p>
                <p className="text-[11px] text-muted-foreground">Prayers, sermons, devotionals, free-text chat</p>
              </div>
            </div>
            <Switch
              checked={form.aiChatEnabled}
              onCheckedChange={v => setForm(f => ({ ...f, aiChatEnabled: v }))}
              data-testid="switch-ai-chat"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Song Lyrics Generator</p>
                <p className="text-[11px] text-muted-foreground">Generate original worship song lyrics</p>
              </div>
            </div>
            <Switch
              checked={form.aiSongEnabled}
              onCheckedChange={v => setForm(f => ({ ...f, aiSongEnabled: v }))}
              data-testid="switch-ai-song"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Image Generation</p>
                <p className="text-[11px] text-muted-foreground">AI-created worship backgrounds &amp; scenes</p>
              </div>
            </div>
            <Switch
              checked={form.aiImageEnabled}
              onCheckedChange={v => setForm(f => ({ ...f, aiImageEnabled: v }))}
              data-testid="switch-ai-image"
            />
          </div>

          {/* Daily image limit */}
          {form.aiImageEnabled && (
            <div className="pl-6 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Daily image limit</label>
                <span className="text-xs text-muted-foreground tabular-nums">{limitLabel}</span>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={500}
                  value={form.aiDailyImageLimit}
                  onChange={e => setForm(f => ({ ...f, aiDailyImageLimit: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-28 h-8 text-sm"
                  data-testid="input-ai-image-limit"
                />
                <p className="text-[11px] text-muted-foreground">Set to 0 for unlimited. Each image ≈ $0.04–$0.08.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pricing info */}
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pricing</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Charges go directly to your OpenAI account — text responses cost fractions of a cent each; images (DALL·E 3) cost $0.04–$0.08 each.
            Manage usage at{" "}
            <a
              href="https://platform.openai.com/usage"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-0.5"
            >
              platform.openai.com/usage
              <ExternalLink className="w-3 h-3" />
            </a>
            .
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={save} disabled={isPending} size="sm">
            {isPending ? "Saving…" : "Save AI Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Toggle for "Bible-only mode" — collapses the sidebar to just Bible +
 * Settings and redirects any other route back to the Bible. Useful when
 * the operator wants a focused, distraction-free reading view (kiosk-
 * style) while still keeping a way back to flip the toggle off.
 */
function BibleOnlyModeCard() {
  const { enabled, setEnabled } = useBibleOnlyMode();
  const { toast } = useToast();

  const onToggle = (next: boolean) => {
    setEnabled(next);
    toast({
      title: next ? "Bible-only mode on" : "Bible-only mode off",
      description: next
        ? "Sidebar now shows just Bible and Settings."
        : "All menu items are visible again.",
    });
  };

  return (
    <Card data-testid="card-bible-only-mode">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> Bible-only mode
        </CardTitle>
        <CardDescription>
          Hide every menu item except Bible and Settings — perfect for a
          focused reading device or a kiosk on the lectern.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-medium">Enable Bible-only mode</div>
            <div className="text-muted-foreground text-xs">
              You can switch this back off from this page at any time.
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            data-testid="switch-bible-only-mode"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Lets the operator swap any sidebar item's icon for one of a curated set.
 * Storage is local-only (per device) — same pattern as ControlAppearanceCard.
 * Order/destinations of nav items are intentionally fixed to keep muscle
 * memory; only the icon is configurable.
 */
function MainMenuCustomizationCard() {
  const { overrides, setIcon, resetItem, resetAll } = useMenuCustomization();
  const [emojiMode, setEmojiMode] = useEmojiMode();
  const { toast } = useToast();

  const hasAnyOverride = Object.keys(overrides).some(k => overrides[k]?.iconId);

  const onReset = () => {
    resetAll();
    toast({ title: "Menu icons reset", description: "All sidebar icons returned to their defaults." });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary" />
              Main Menu Icons
            </CardTitle>
            <CardDescription className="mt-1">
              Personalise the icons in your sidebar. Click any icon to pick a new one.
              Saved on this device only.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={!hasAnyOverride}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-reset-menu-icons"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Emoji Mode Toggle */}
        <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Use Emoji Icons</p>
              <p className="text-[11px] text-muted-foreground">Replace sidebar icons with emoji characters</p>
            </div>
          </div>
          <Switch
            checked={!!emojiMode}
            onCheckedChange={setEmojiMode}
            data-testid="switch-emoji-mode"
          />
        </div>

        {/* Preview row when emoji mode is on */}
        {emojiMode && (
          <div className="flex flex-wrap gap-1 px-1">
            {DEFAULT_NAV_ITEMS.slice(0, 8).map(item => (
              <span key={item.href} className="text-base" title={item.label}>
                {effectiveEmoji(item, overrides)}
              </span>
            ))}
            <span className="text-xs text-muted-foreground self-center ml-1">…</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="grid-menu-items">
          {DEFAULT_NAV_ITEMS.map(item => {
            const currentIconId = effectiveIconId(item, overrides);
            const CurrentIcon = getIconComponent(currentIconId);
            const isCustom = !!overrides[item.href]?.iconId;
            return (
              <div
                key={item.href}
                className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-2 py-1.5"
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={`shrink-0 h-9 w-9 rounded-md border flex items-center justify-center transition-colors ${
                        isCustom
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:bg-muted/60"
                      }`}
                      aria-label={`Change icon for ${item.label}`}
                      title={`Change icon for ${item.label}`}
                      data-testid={`button-pick-icon-${item.href === "/" ? "home" : item.href.slice(1)}`}
                    >
                      <CurrentIcon className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Pick an icon for <span className="text-foreground font-semibold">{item.label}</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 max-h-64 overflow-y-auto pr-1">
                      {ICON_CHOICES.map(iconId => {
                        const Icon = getIconComponent(iconId);
                        const active = iconId === currentIconId;
                        return (
                          <button
                            key={iconId}
                            type="button"
                            onClick={() => setIcon(item.href, iconId)}
                            className={`h-8 w-8 rounded-md border flex items-center justify-center transition-colors ${
                              active
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            }`}
                            aria-label={iconId}
                            aria-pressed={active}
                            title={iconId}
                            data-testid={`icon-choice-${iconId}`}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => resetItem(item.href)}
                        className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
                        data-testid={`button-reset-icon-${item.href === "/" ? "home" : item.href.slice(1)}`}
                      >
                        Reset to default
                      </button>
                    )}
                  </PopoverContent>
                </Popover>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {isCustom ? `Custom · ${currentIconId}` : `Default · ${currentIconId}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Operator-facing customisation: theme color + app font for the CONTROL SCREEN only.
 * Persisted to localStorage per device. Does not affect what the congregation sees.
 */
function ControlAppearanceCard() {
  const { appearance, setAppearance } = useControlAppearance();
  const { toast } = useToast();

  const reset = () => {
    setAppearance({ colorId: DEFAULT_COLOR_ID, fontId: DEFAULT_FONT_ID });
    toast({ title: "Appearance reset", description: "Returned to the default Indigo + Inter look." });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Control Screen Appearance
            </CardTitle>
            <CardDescription className="mt-1">
              Personalise the operator interface. These settings are saved on this device only and do
              not affect the broadcast / presentation screen.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-reset-appearance"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── Theme color picker ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Theme Color</label>
            <span className="text-xs text-muted-foreground">— accent for buttons, sidebar & focus rings</span>
          </div>
          <div className="grid grid-cols-5 gap-2.5" data-testid="grid-theme-colors">
            {COLOR_PRESETS.map(c => {
              const active = appearance.colorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAppearance({ colorId: c.id })}
                  className={`group relative aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                    active ? "border-foreground shadow-lg" : "border-border hover:border-muted-foreground"
                  }`}
                  style={{ background: c.swatch }}
                  title={c.name}
                  aria-label={`Use ${c.name} theme`}
                  aria-pressed={active}
                  data-testid={`swatch-${c.id}`}
                >
                  {active && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" strokeWidth={3} />
                    </span>
                  )}
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── App font picker ───────────────────────────────────────────── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">App Font</label>
            <span className="text-xs text-muted-foreground">— used across the operator interface</span>
          </div>
          <Select
            value={appearance.fontId}
            onValueChange={(v) => setAppearance({ fontId: v })}
          >
            <SelectTrigger data-testid="select-app-font">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APP_FONTS.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  <span style={{ fontFamily: f.stack }} className="text-base">{f.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Live preview ──────────────────────────────────────────────── */}
        <div className="space-y-2 pt-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Preview</label>
          <div className="rounded-lg border border-border bg-card p-5 space-y-3" data-testid="preview-appearance">
            <h3 className="text-xl font-bold">The quick brown fox jumps over the lazy dog</h3>
            <p className="text-sm text-muted-foreground">
              This is how body text and labels will appear throughout the control screen.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm">Primary Button</Button>
              <Button size="sm" variant="secondary">Secondary</Button>
              <Button size="sm" variant="outline">Outline</Button>
              <span className="ml-auto text-xs text-primary font-medium">Accent text</span>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}