import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { CHANNEL_NAME, type BroadcastCommand } from "@/hooks/use-broadcast";
import { Mic, MicOff, Sparkles, AlertCircle, ChevronDown } from "lucide-react";

/**
 * Live Captions card — uses the browser's Web Speech API to listen to the
 * operator's microphone and continuously post the recognised text to the
 * broadcast window via BroadcastChannel.  No server round-trip; everything
 * happens locally in the browser (Chrome / Edge / Brave only — Safari and
 * Firefox lack `webkitSpeechRecognition`).
 *
 * Caption text appears at the bottom of the audience screen above the ticker.
 */

type SR = any; // SpeechRecognition isn't in lib.dom.d.ts everywhere
const getRecognition = (): SR | null => {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
};

const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-AU", label: "English (Australia)" },
  { code: "en-ZA", label: "English (South Africa)" },
  { code: "en-NG", label: "English (Nigeria)" },
  { code: "fr-FR", label: "French" },
  { code: "es-ES", label: "Spanish" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "sw-KE", label: "Swahili" },
  { code: "zu-ZA", label: "Zulu" },
  { code: "af-ZA", label: "Afrikaans" },
];

export function LiveCaptionsCard() {
  const [open, setOpen] = useLocalStorage("wf-captions-open", false);
  const [lang, setLang] = useLocalStorage("wf-captions-lang", "en-US");
  const [autoClear, setAutoClear] = useLocalStorage("wf-captions-auto-clear", true);
  const [autoClearMs, setAutoClearMs] = useLocalStorage<number>("wf-captions-clear-after", 4000);
  const [showInterim, setShowInterim] = useLocalStorage("wf-captions-interim", true);

  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState("");

  const recRef = useRef<SR | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const wantListeningRef = useRef(false);
  // Schedules a fresh start() inside onend — avoids the "InvalidState: already
  // started" error when settings change while the engine is still releasing
  // the mic.  Replaces the brittle fixed-200ms timer.
  const restartPendingRef = useRef(false);
  // Backs off after rapid consecutive failures (e.g. mic permission revoked
  // mid-stream) so we don't spin in onend → start → onerror → onend.
  const errorBurstRef = useRef(0);

  useEffect(() => {
    setSupported(getRecognition() !== null);
  }, []);

  const getCh = () => {
    if (!channelRef.current) channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    return channelRef.current;
  };
  const send = (cmd: BroadcastCommand) => getCh().postMessage(cmd);

  const stop = () => {
    wantListeningRef.current = false;
    restartPendingRef.current = false;
    errorBurstRef.current = 0;
    setListening(false);
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    if (clearTimerRef.current) { clearTimeout(clearTimerRef.current); clearTimerRef.current = null; }
    send({ type: "caption_clear" });
    setPreview("");
  };

  const start = () => {
    setError(null);
    const rec = getRecognition();
    if (!rec) {
      setError("Live captions need Chrome, Edge or Brave (Safari and Firefox don't support browser speech recognition).");
      return;
    }
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = showInterim;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      const text = (final || interim).trim();
      if (!text) return;
      setPreview(text);
      send({ type: "caption_set", text, isFinal: !!final });

      // Auto-clear after silence — restart timer on every push.
      if (autoClear && final) {
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = window.setTimeout(() => {
          send({ type: "caption_clear" });
          setPreview("");
        }, Math.max(1500, autoClearMs));
      }
    };

    rec.onerror = (e: any) => {
      // "no-speech" and "aborted" are routine — don't surface them, and the
      // engine will fire onend right after, where we'll handle the restart.
      const code = e?.error;
      if (code && code !== "no-speech" && code !== "aborted") {
        setError(`Speech engine: ${code}`);
      }
      // Fatal-ish codes — stop trying so we don't loop forever.
      if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
        wantListeningRef.current = false;
      } else {
        errorBurstRef.current += 1;
      }
    };

    // Auto-restart while the operator wants to keep listening — Chrome ends
    // the session after ~60s of silence; we just respawn the recogniser.
    // Also where we honour a config-change restart so we don't race the
    // browser's mic-release cleanup.
    rec.onend = () => {
      const wantPending = restartPendingRef.current;
      restartPendingRef.current = false;
      // Bail out on >3 consecutive non-routine errors to break loops.
      if (errorBurstRef.current >= 3) {
        wantListeningRef.current = false;
        setListening(false);
        setError("Stopped after repeated errors — try again.");
        return;
      }
      if (wantListeningRef.current || wantPending) {
        // Use the latest config by re-entering start() rather than reusing
        // the now-dead `rec` instance.
        if (wantPending) {
          // Tiny breath so the browser releases the mic device.
          setTimeout(() => { if (wantListeningRef.current || wantPending) start(); }, 120);
        } else {
          try { rec.start(); errorBurstRef.current = 0; } catch { setListening(false); }
        }
      } else {
        setListening(false);
      }
    };

    try {
      rec.start();
      recRef.current = rec;
      wantListeningRef.current = true;
      errorBurstRef.current = 0;
      setListening(true);
    } catch (err: any) {
      setError(err?.message ?? "Could not start speech recognition.");
    }
  };

  // Restart with new language / interim setting if currently listening — let
  // the engine's `onend` callback drive the restart so we don't race the mic
  // release.  We just signal "please start fresh once you're done".
  useEffect(() => {
    if (!listening) return;
    restartPendingRef.current = true;
    try { recRef.current?.stop(); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, showInterim]);

  // Clean up on unmount
  useEffect(() => () => {
    wantListeningRef.current = false;
    try { recRef.current?.stop(); } catch {}
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    channelRef.current?.close();
    channelRef.current = null;
  }, []);

  const clearOnly = () => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    send({ type: "caption_clear" });
    setPreview("");
  };

  return (
    <Card data-testid="card-live-captions">
      <CardHeader className="pb-0 pt-3 px-4">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
          data-testid="button-toggle-captions">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Live Captions
            <Badge variant="outline" className="text-[9px] py-0 h-4">AI</Badge>
            {listening && <Badge className="text-[9px] py-0 h-4 bg-red-600 border-0 animate-pulse">LIVE</Badge>}
          </CardTitle>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <CardDescription className="mt-1 text-[11px]">
            Type-as-you-speak captions on the audience screen. Uses your browser's built-in speech engine — works best in Chrome / Edge.
          </CardDescription>
        )}
      </CardHeader>
      {open && (
      <CardContent className="space-y-3 pt-3">
        {supported === false && (
          <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-500/20 rounded-md p-2 text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>This browser doesn't support live speech recognition. Open WorshipFlow in Chrome, Edge or Brave to use captions.</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {!listening ? (
            <Button onClick={start} disabled={supported === false} className="gap-1.5 col-span-1" data-testid="button-captions-start">
              <Mic className="w-4 h-4" /> Start Listening
            </Button>
          ) : (
            <Button variant="destructive" onClick={stop} className="gap-1.5 col-span-1" data-testid="button-captions-stop">
              <MicOff className="w-4 h-4" /> Stop
            </Button>
          )}
          <Button variant="outline" onClick={clearOnly} disabled={!preview} className="gap-1.5 col-span-1" data-testid="button-captions-clear">
            Clear caption
          </Button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] text-muted-foreground">Language</label>
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-captions-lang"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code} className="text-xs">{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Show partial words live</p>
              <p className="text-[10px] text-muted-foreground">Updates the caption as you speak (off = whole-sentence only).</p>
            </div>
            <Switch checked={showInterim} onCheckedChange={setShowInterim} data-testid="switch-captions-interim" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Auto-hide after silence</p>
              <p className="text-[10px] text-muted-foreground">Removes the caption ~{Math.round(autoClearMs / 1000)}s after you stop talking.</p>
            </div>
            <Switch checked={autoClear} onCheckedChange={setAutoClear} data-testid="switch-captions-autoclear" />
          </div>

          {autoClear && (
            <div className="grid grid-cols-4 gap-1">
              {[2000, 4000, 6000, 10000].map(ms => (
                <button key={ms} type="button" onClick={() => setAutoClearMs(ms)}
                  className={`py-1 rounded text-[10px] border transition-colors ${autoClearMs === ms ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted/40"}`}
                  data-testid={`button-captions-clear-${ms}`}>
                  {ms / 1000}s
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live preview */}
        <div className="rounded-md border border-border bg-black/40 p-2.5 min-h-[44px]">
          <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Live preview</p>
          <p className="text-xs font-medium leading-snug" data-testid="text-captions-preview">
            {preview || <span className="text-muted-foreground italic">Nothing yet — press Start Listening and speak.</span>}
          </p>
        </div>

        {error && (
          <div className="text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
            {error}
          </div>
        )}
      </CardContent>
      )}
    </Card>
  );
}
