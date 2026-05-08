import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Music2, Send, Trash2, History } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useGameBroadcast } from "@/lib/game-broadcast";
import { useToast } from "@/hooks/use-toast";

interface HymnEntry {
  id: string;
  number: string;
  title: string;
  hymnal: string;
  shownAt: number;
}

export default function HymnNumberPage() {
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [hymnal, setHymnal] = useLocalStorage<string>("wf-hymn-hymnal", "Hymnal");
  const [history, setHistory] = useLocalStorage<HymnEntry[]>("wf-hymn-history", []);
  const { presentOnScreen } = useGameBroadcast();
  const { toast } = useToast();

  function show() {
    const n = number.trim();
    if (!n) {
      toast({ title: "Enter a hymn number" });
      return;
    }
    const lines: string[] = [];
    if (hymnal.trim()) lines.push(hymnal.trim());
    lines.push(`№ ${n}`);
    if (title.trim()) lines.push(title.trim());
    presentOnScreen(hymnal.trim() || "Hymn", `Hymn ${n}`, lines.join("\n"));
    const entry: HymnEntry = {
      id: `hy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      number: n,
      title: title.trim(),
      hymnal: hymnal.trim(),
      shownAt: Date.now(),
    };
    setHistory((prev) => [entry, ...prev].slice(0, 25));
  }

  function reshow(entry: HymnEntry) {
    setNumber(entry.number);
    setTitle(entry.title);
    if (entry.hymnal) setHymnal(entry.hymnal);
    const lines: string[] = [];
    if (entry.hymnal) lines.push(entry.hymnal);
    lines.push(`№ ${entry.number}`);
    if (entry.title) lines.push(entry.title);
    presentOnScreen(entry.hymnal || "Hymn", `Hymn ${entry.number}`, lines.join("\n"));
  }

  function clearHistory() {
    setHistory([]);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Music2 className="w-6 h-6 text-primary" /> Hymn Number
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Project a large hymn number to the congregation — perfect for traditional services using a printed hymnal.
        </p>
      </div>

      <CollapsibleCard
        id="hymn-show"
        icon={Music2}
        title="Show a hymn"
        description="Number is required; title is optional."
        contentClassName="space-y-4"
      >
          <div>
            <label className="text-xs text-muted-foreground">Hymnal name</label>
            <Input
              value={hymnal}
              onChange={(e) => setHymnal(e.target.value)}
              placeholder="e.g. Sacred Songs & Solos"
              data-testid="input-hymn-hymnal"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-xs text-muted-foreground">Number</label>
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="234"
                inputMode="numeric"
                data-testid="input-hymn-number"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Title (optional)</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Amazing Grace"
                data-testid="input-hymn-title"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={show} className="gap-2" data-testid="button-hymn-show">
              <Send className="w-4 h-4" /> Show on screen
            </Button>
          </div>
      </CollapsibleCard>

      <Card className="text-center">
        <CardContent className="py-8">
          <div className="text-xs text-muted-foreground">{hymnal || "Hymn"}</div>
          <div className="text-6xl sm:text-7xl font-bold tracking-tight my-2" data-testid="text-hymn-preview">
            {number ? `№ ${number}` : "—"}
          </div>
          {title && <div className="text-lg text-muted-foreground">{title}</div>}
        </CardContent>
      </Card>

      <CollapsibleCard
        id="hymn-recent"
        icon={History}
        title={<>Recent <Badge variant="outline" className="ml-1" data-testid="badge-hymn-history-count">{history.length}</Badge></>}
        contentClassName=""
        actions={history.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={clearHistory} className="gap-1.5" data-testid="button-hymn-clear-history">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </Button>
        ) : undefined}
      >
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hymns shown yet.</p>
          ) : (
            <div className="space-y-1">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => reshow(h)}
                  className="w-full text-left p-2 rounded-md hover:bg-muted flex items-center gap-3"
                  data-testid={`button-hymn-history-${h.id}`}
                >
                  <span className="font-bold tabular-nums w-12 text-right">{h.number}</span>
                  <span className="flex-1 truncate">{h.title || <span className="text-muted-foreground italic">Untitled</span>}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(h.shownAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </button>
              ))}
            </div>
          )}
      </CollapsibleCard>
    </div>
  );
}
