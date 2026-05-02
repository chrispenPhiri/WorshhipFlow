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
import { Settings as SettingsIcon, Palette, Type, RotateCcw, Check } from "lucide-react";
import { BIBLE_TRANSLATIONS, FONTS } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useControlAppearance } from "@/hooks/use-control-appearance";
import {
  COLOR_PRESETS, APP_FONTS, DEFAULT_COLOR_ID, DEFAULT_FONT_ID,
} from "@/lib/control-appearance";
import { InstallAppCard } from "@/components/install-app-card";

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

      <ControlAppearanceCard />
    </div>
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