import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";
import { Radio, Copy, CheckCircle2, Eye, EyeOff, ChevronDown, Plus, X, ExternalLink } from "lucide-react";

/**
 * Stream Destinations card — central hub for the stream credentials the
 * operator copies into OBS / Streamlabs / vMix when going live to YouTube,
 * Facebook, Twitch, or any custom RTMP target.
 *
 * Browsers cannot push RTMP directly, so the workflow is:
 *   1. Save the destination's RTMP URL + Stream Key here (kept locally).
 *   2. Click "Copy URL" / "Copy Key" to paste into OBS.
 *   3. In OBS add the broadcast window (or Display Capture) as a source.
 *
 * All credentials are stored in the operator's own browser via localStorage —
 * nothing is ever sent to the WorshipFlow server.
 */

type Platform = "youtube" | "facebook" | "twitch" | "custom";

interface Destination {
  id: string;
  platform: Platform;
  label: string;
  rtmpUrl: string;
  streamKey: string;
  enabled: boolean;
}

const PLATFORM_DEFAULTS: Record<Platform, { label: string; rtmpUrl: string; helpUrl: string; helpLabel: string; color: string }> = {
  youtube:  { label: "YouTube Live",   rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",       helpUrl: "https://studio.youtube.com/channel/UC/livestreaming",      helpLabel: "YouTube Studio",     color: "bg-red-600" },
  facebook: { label: "Facebook Live",  rtmpUrl: "rtmps://live-api-s.facebook.com:443/rtmp", helpUrl: "https://www.facebook.com/live/producer",                  helpLabel: "Facebook Live Producer", color: "bg-blue-600" },
  twitch:   { label: "Twitch",         rtmpUrl: "rtmp://live.twitch.tv/app",             helpUrl: "https://dashboard.twitch.tv/settings/stream",              helpLabel: "Twitch Dashboard",   color: "bg-purple-600" },
  custom:   { label: "Custom RTMP",    rtmpUrl: "",                                       helpUrl: "",                                                          helpLabel: "",                  color: "bg-slate-600" },
};

const NEW_ID = () => `dst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function StreamDestinationsCard() {
  const [open, setOpen] = useLocalStorage("wf-streamdest-open", false);
  const [destinations, setDestinations] = useLocalStorage<Destination[]>("wf-stream-destinations", []);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const add = (p: Platform) => {
    const def = PLATFORM_DEFAULTS[p];
    setDestinations([
      ...destinations,
      { id: NEW_ID(), platform: p, label: def.label, rtmpUrl: def.rtmpUrl, streamKey: "", enabled: true },
    ]);
    setOpen(true);
  };

  const update = (id: string, patch: Partial<Destination>) =>
    setDestinations(destinations.map(d => d.id === id ? { ...d, ...patch } : d));

  const remove = (id: string) =>
    setDestinations(destinations.filter(d => d.id !== id));

  const copy = async (label: string, value: string, key: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(c => c === key ? null : c), 1400);
      toast({ title: `${label} copied`, description: "Paste it into OBS → Settings → Stream." });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "destructive" });
    }
  };

  const reveal = (id: string) => setRevealed(r => ({ ...r, [id]: !r[id] }));
  const enabledCount = destinations.filter(d => d.enabled).length;

  return (
    <Card data-testid="card-stream-destinations">
      <CardHeader className="pb-0 pt-3 px-4">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
          data-testid="button-toggle-streamdest">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" /> Stream Destinations
            {destinations.length > 0 && (
              <Badge variant="outline" className="text-[10px] py-0 h-4">
                {enabledCount}/{destinations.length} enabled
              </Badge>
            )}
          </CardTitle>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <CardDescription className="mt-1 text-[11px]">
            Save your YouTube / Facebook / Twitch keys here, then copy them into OBS to go live. Keys never leave this browser.
          </CardDescription>
        )}
      </CardHeader>

      {open && (
      <CardContent className="space-y-3 pt-3">
        {/* Quick add row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(Object.keys(PLATFORM_DEFAULTS) as Platform[]).map(p => (
            <Button key={p} type="button" size="sm" variant="outline"
              onClick={() => add(p)}
              className="gap-1.5 h-8 text-[11px] capitalize"
              data-testid={`button-add-dst-${p}`}>
              <Plus className="w-3 h-3" /> {PLATFORM_DEFAULTS[p].label}
            </Button>
          ))}
        </div>

        {destinations.length === 0 ? (
          <div className="text-center py-3 text-xs text-muted-foreground italic">
            No destinations saved yet — click a platform above to add one.
          </div>
        ) : (
          <div className="space-y-2.5">
            {destinations.map(d => {
              const def = PLATFORM_DEFAULTS[d.platform];
              return (
                <div key={d.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
                  data-testid={`dst-${d.id}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${def.color} ${d.enabled ? "" : "opacity-30"}`} />
                    <Input value={d.label} onChange={e => update(d.id, { label: e.target.value })}
                      className="h-7 text-xs flex-1 font-medium" data-testid={`input-dst-label-${d.id}`} />
                    <button type="button" onClick={() => update(d.id, { enabled: !d.enabled })}
                      className={`text-[10px] px-2 py-0.5 rounded border ${d.enabled ? "bg-green-600/20 border-green-600 text-green-300" : "border-border text-muted-foreground"}`}
                      data-testid={`button-dst-enable-${d.id}`}>
                      {d.enabled ? "ON" : "OFF"}
                    </button>
                    <button type="button" onClick={() => remove(d.id)}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove" data-testid={`button-dst-remove-${d.id}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="rtmp://..."
                        value={d.rtmpUrl}
                        onChange={e => update(d.id, { rtmpUrl: e.target.value })}
                        className="h-7 text-[11px] font-mono flex-1"
                        data-testid={`input-dst-url-${d.id}`}
                      />
                      <Button size="sm" variant="ghost" onClick={() => copy("Stream URL", d.rtmpUrl, `${d.id}-url`)}
                        disabled={!d.rtmpUrl} className="h-7 w-7 p-0 shrink-0"
                        title="Copy URL"
                        data-testid={`button-copy-url-${d.id}`}>
                        {copied === `${d.id}-url` ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="Stream key (paste from platform)"
                        type={revealed[d.id] ? "text" : "password"}
                        value={d.streamKey}
                        onChange={e => update(d.id, { streamKey: e.target.value })}
                        className="h-7 text-[11px] font-mono flex-1"
                        data-testid={`input-dst-key-${d.id}`}
                      />
                      <Button size="sm" variant="ghost" onClick={() => reveal(d.id)}
                        className="h-7 w-7 p-0 shrink-0"
                        title={revealed[d.id] ? "Hide key" : "Show key"}
                        data-testid={`button-dst-reveal-${d.id}`}>
                        {revealed[d.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copy("Stream key", d.streamKey, `${d.id}-key`)}
                        disabled={!d.streamKey} className="h-7 w-7 p-0 shrink-0"
                        title="Copy key"
                        data-testid={`button-copy-key-${d.id}`}>
                        {copied === `${d.id}-key` ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {def.helpUrl && (
                    <a href={def.helpUrl} target="_blank" rel="noreferrer"
                      className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                      data-testid={`link-dst-help-${d.id}`}>
                      Get a fresh key from {def.helpLabel} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* OBS setup hint */}
        <div className="text-[10.5px] text-muted-foreground bg-primary/5 border border-primary/15 rounded-md p-2.5 leading-relaxed">
          <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-primary" /> How to go live with OBS
          </p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Open the broadcast window from <strong>Display Selection</strong> below.</li>
            <li>In OBS add a <em>Window Capture</em> source pointing at the broadcast window.</li>
            <li>Open OBS <em>Settings → Stream</em>, paste the URL and Key from above.</li>
            <li>Click <em>Start Streaming</em> in OBS.</li>
          </ol>
        </div>
      </CardContent>
      )}
    </Card>
  );
}
