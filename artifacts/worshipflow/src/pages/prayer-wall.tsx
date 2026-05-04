import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HandHeart, Plus, Trash2, Send, Check, RotateCcw, Search, Image } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateScreenState, useGetScreenState, getGetScreenStateQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type Status = "active" | "answered";

interface PrayerRequest {
  id: string;
  name: string;
  category: string;
  body: string;
  status: Status;
  createdAt: number;
}

const CATEGORIES = ["Healing", "Family", "Salvation", "Provision", "Guidance", "Praise", "Other"] as const;

const CATEGORY_GRADIENTS: Record<string, string> = {
  Healing:    "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%)",
  Family:     "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0c1f57 100%)",
  Salvation:  "linear-gradient(135deg, #7c2d12 0%, #b45309 50%, #451a03 100%)",
  Provision:  "linear-gradient(135deg, #14532d 0%, #15803d 50%, #052e16 100%)",
  Guidance:   "linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #0f0a2e 100%)",
  Praise:     "linear-gradient(135deg, #78350f 0%, #d97706 50%, #451a03 100%)",
  Other:      "linear-gradient(135deg, #3b0764 0%, #7c3aed 50%, #1e0533 100%)",
};

const PRAYER_WALL_GRADIENT = "linear-gradient(135deg, #4c0519 0%, #881337 50%, #1c0a10 100%)";

export default function PrayerWallPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [items, setItems] = useLocalStorage<PrayerRequest[]>("wf-prayer-wall", []);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Healing");
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [query, setQuery] = useState("");

  const { data: screenState } = useGetScreenState({ query: { queryKey: getGetScreenStateQueryKey() } });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }) }
  });

  function buildScreenData(title: string, header: string, bodyText: string, gradient: string) {
    return {
      isBlack: screenState?.isBlack ?? false,
      isClear: false,
      contentType: "custom_text" as const,
      title,
      content: `${header}\n\n${bodyText}`,
      textStyle: {
        fontFamily: "Georgia",
        fontSize: 48,
        textColor: "#ffffff",
        alignment: "center" as const,
        animation: "fade_in" as const,
        bold: false,
        italic: false,
      },
      background: {
        type: "gradient" as const,
        value: gradient,
        overlay: 0,
      },
      tickerEnabled: screenState?.tickerEnabled ?? false,
      comparisonMode: false,
    };
  }

  function add() {
    const trimmed = body.trim();
    if (!trimmed) return;
    const next: PrayerRequest = {
      id: `pr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      category,
      body: trimmed,
      status: "active",
      createdAt: Date.now(),
    };
    setItems((prev) => [next, ...prev]);
    setName("");
    setBody("");
    toast({ title: "Prayer request added" });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  function toggleAnswered(id: string) {
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === "answered" ? "active" : "answered" } : p)),
    );
  }

  function projectOne(p: PrayerRequest, useGraphic = false) {
    const header = p.name ? `${p.category} — ${p.name}` : p.category;
    if (useGraphic) {
      const gradient = CATEGORY_GRADIENTS[p.category] ?? PRAYER_WALL_GRADIENT;
      const data = buildScreenData("Prayer Request", header, p.body, gradient);
      updateScreen({ data });
      toast({ title: "Sent to screen", description: `${header} (graphic)` });
    } else {
      const data = buildScreenData("Prayer Request", header, p.body,
        screenState?.background?.type === "gradient" || screenState?.background?.type === "color"
          ? (screenState.background.value ?? "#000000")
          : "#000000"
      );
      updateScreen({ data: { ...data, background: screenState?.background ?? { type: "color", value: "#000000" } } });
      toast({ title: "Projected", description: header });
    }
  }

  function projectAllActive(useGraphic = false) {
    const active = items.filter((p) => p.status === "active");
    if (active.length === 0) {
      toast({ title: "Nothing to project", description: "No active prayer requests yet." });
      return;
    }
    const lines = active
      .map((p) => `• ${p.body}${p.name ? `  — ${p.name}` : ""}`)
      .join("\n");

    const data = buildScreenData(
      "Prayer Wall",
      "Lifting up our church",
      lines,
      useGraphic ? PRAYER_WALL_GRADIENT : "#000000"
    );
    updateScreen({
      data: useGraphic
        ? data
        : { ...data, background: screenState?.background ?? { type: "color", value: "#000000" } }
    });
    toast({ title: "Prayer wall sent", description: `${active.length} active request${active.length !== 1 ? "s" : ""}` });
  }

  const filtered = items.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (query && !`${p.name} ${p.category} ${p.body}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: items.length,
    active: items.filter((p) => p.status === "active").length,
    answered: items.filter((p) => p.status === "answered").length,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HandHeart className="w-6 h-6 text-primary" /> Prayer Wall
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture and project the church's prayer requests. Saved on this device.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-prayer-active">{counts.active} active</Badge>
          <Badge variant="outline" data-testid="badge-prayer-answered">{counts.answered} answered</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add a request
          </CardTitle>
          <CardDescription>Name is optional — leave blank for anonymous.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-prayer-name"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-prayer-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} data-testid={`option-prayer-category-${c.toLowerCase()}`}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Write the prayer request..."
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            data-testid="textarea-prayer-body"
          />
          <div className="flex justify-end">
            <Button onClick={add} disabled={!body.trim()} className="gap-2" data-testid="button-prayer-add">
              <Plus className="w-4 h-4" /> Add request
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
            data-testid="input-prayer-search"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "active", "answered"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              data-testid={`button-prayer-filter-${f}`}
            >
              {f === "all" ? `All (${counts.total})` : f === "active" ? `Active (${counts.active})` : `Answered (${counts.answered})`}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="secondary" onClick={() => projectAllActive(false)} className="gap-1.5" data-testid="button-prayer-project-all">
          <Send className="w-3.5 h-3.5" /> Project all
        </Button>
        <Button size="sm" variant="default" onClick={() => projectAllActive(true)} className="gap-1.5" data-testid="button-prayer-project-all-graphic">
          <Image className="w-3.5 h-3.5" /> Full graphic
        </Button>
      </div>

      <div className="space-y-2" data-testid="prayer-list">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No requests to show.</CardContent></Card>
        ) : (
          filtered.map((p) => (
            <Card key={p.id} data-testid={`prayer-item-${p.id}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={p.status === "answered" ? "outline" : "secondary"}>{p.category}</Badge>
                    {p.status === "answered" && (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-600">Answered</Badge>
                    )}
                    {p.name && <span className="text-xs text-muted-foreground">— {p.name}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm whitespace-pre-wrap ${p.status === "answered" ? "line-through text-muted-foreground" : ""}`}>
                    {p.body}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => projectOne(p, false)} className="gap-1.5 h-7 text-xs" data-testid={`button-prayer-project-${p.id}`}>
                    <Send className="w-3 h-3" /> Project
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => projectOne(p, true)} className="gap-1.5 h-7 text-xs" data-testid={`button-prayer-graphic-${p.id}`}>
                    <Image className="w-3 h-3" /> Graphic
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleAnswered(p.id)} className="gap-1.5 h-7 text-xs" data-testid={`button-prayer-toggle-${p.id}`}>
                    {p.status === "answered" ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                    {p.status === "answered" ? "Reopen" : "Answered"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive" data-testid={`button-prayer-delete-${p.id}`}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
