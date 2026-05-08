import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, Send, Square, Plus } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useGameBroadcast } from "@/lib/game-broadcast";
import { useToast } from "@/hooks/use-toast";

interface CountdownState {
  label: string;
  targetMs: number;
  active: boolean;
}

const PRESETS: { label: string; minutes: number }[] = [
  { label: "+5 min", minutes: 5 },
  { label: "+10 min", minutes: 10 },
  { label: "+15 min", minutes: 15 },
  { label: "+30 min", minutes: 30 },
  { label: "+1 hr", minutes: 60 },
];

export default function CountdownPage() {
  const [state, setState] = useLocalStorage<CountdownState>("wf-countdown", {
    label: "Service starts in",
    targetMs: 0,
    active: false,
  });
  const [now, setNow] = useState(Date.now());
  const lastBroadcastMinuteRef = useRef<number>(-1);
  const { presentOnScreen } = useGameBroadcast();
  const { toast } = useToast();

  // Tick the local clock every second so the operator sees a live preview.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // While active, push a refreshed countdown to the projection screen
  // every minute (and at the moment the operator hits "Show on screen").
  // When the timer hits zero we always emit a final "00:00" frame before
  // deactivating, so the screen never freezes on the previous minute mark.
  useEffect(() => {
    if (!state.active || state.targetMs <= 0) return;
    const remaining = Math.max(0, state.targetMs - now);

    if (remaining === 0) {
      // Force a final frame regardless of dedup, then stop.
      presentOnScreen(state.label, "Countdown", formatLarge(0));
      lastBroadcastMinuteRef.current = -1;
      setState((s) => ({ ...s, active: false }));
      toast({ title: "Countdown complete" });
      return;
    }

    const minute = Math.floor(remaining / 60_000);
    if (minute !== lastBroadcastMinuteRef.current) {
      lastBroadcastMinuteRef.current = minute;
      presentOnScreen(state.label, "Countdown", formatLarge(remaining));
    }
  }, [state.active, state.targetMs, state.label, now, presentOnScreen, setState, toast]);

  const remaining = state.targetMs > 0 ? Math.max(0, state.targetMs - now) : 0;
  const targetTimeStr = useMemo(
    () => (state.targetMs > 0 ? new Date(state.targetMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""),
    [state.targetMs],
  );

  function setTargetFromTimeInput(value: string) {
    if (!value) return;
    const [hh, mm] = value.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return;
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); // assume tomorrow if already past
    setState((s) => ({ ...s, targetMs: d.getTime() }));
  }

  function addMinutes(m: number) {
    const base = state.targetMs > Date.now() ? state.targetMs : Date.now();
    setState((s) => ({ ...s, targetMs: base + m * 60_000 }));
  }

  function start() {
    if (state.targetMs <= Date.now()) {
      toast({ title: "Pick a future time first" });
      return;
    }
    lastBroadcastMinuteRef.current = -1; // force an immediate push on next tick
    setState((s) => ({ ...s, active: true }));
    setNow(Date.now());
  }

  function stop() {
    setState((s) => ({ ...s, active: false }));
    lastBroadcastMinuteRef.current = -1;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" /> Service Countdown
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Project a live countdown clock onto the broadcast screen — handy before the service or between segments.
        </p>
      </div>

      <CollapsibleCard
        id="countdown-target"
        icon={Clock}
        title="Set the target"
        description="Screen refreshes every minute while the countdown is active."
        contentClassName="space-y-4"
      >
          <div>
            <label className="text-xs text-muted-foreground">Label</label>
            <Input
              value={state.label}
              onChange={(e) => setState((s) => ({ ...s, label: e.target.value }))}
              placeholder="e.g. Service starts in"
              data-testid="input-countdown-label"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Target time</label>
              <Input
                type="time"
                onChange={(e) => setTargetFromTimeInput(e.target.value)}
                data-testid="input-countdown-time"
              />
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="outline"
                  onClick={() => addMinutes(p.minutes)}
                  className="gap-1"
                  data-testid={`button-countdown-add-${p.minutes}`}
                >
                  <Plus className="w-3 h-3" /> {p.label}
                </Button>
              ))}
            </div>
          </div>
          {state.targetMs > 0 && (
            <div className="text-xs text-muted-foreground">
              Target: <span className="font-medium text-foreground">{new Date(state.targetMs).toLocaleString()}</span>
              {targetTimeStr && <span> ({targetTimeStr})</span>}
            </div>
          )}
      </CollapsibleCard>

      <Card className="text-center">
        <CardContent className="py-10 space-y-4">
          <div className="text-sm text-muted-foreground">{state.label || "Countdown"}</div>
          <div className="text-6xl sm:text-7xl font-bold tabular-nums tracking-tight" data-testid="text-countdown-display">
            {formatLarge(remaining)}
          </div>
          <div className="flex items-center justify-center gap-2">
            {state.active ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-600" data-testid="badge-countdown-status">
                Live on screen
              </Badge>
            ) : (
              <Badge variant="outline" data-testid="badge-countdown-status">Idle</Badge>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            {!state.active ? (
              <Button onClick={start} disabled={state.targetMs <= Date.now()} className="gap-2" data-testid="button-countdown-start">
                <Send className="w-4 h-4" /> Show on screen
              </Button>
            ) : (
              <Button onClick={stop} variant="destructive" className="gap-2" data-testid="button-countdown-stop">
                <Square className="w-4 h-4" /> Stop broadcast
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatLarge(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
