import { useState } from "react";
import {
  useListSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  useUpdateSchedule,
  useUpdateScreenState,
  useGetScreenState,
  getListSchedulesQueryKey,
  getGetScreenStateQueryKey,
  ScheduleItemType,
  CreateScheduleBodyServiceType
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Play, Trash2, GripVertical, ChevronUp, ChevronDown, X, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const SERVICE_TYPES: { value: CreateScheduleBodyServiceType; label: string }[] = [
  { value: "sunday_morning", label: "Sunday Morning" },
  { value: "sunday_evening", label: "Sunday Evening" },
  { value: "wednesday", label: "Wednesday" },
  { value: "special", label: "Special Service" },
  { value: "other", label: "Other" },
];

const ITEM_TYPES: { value: ScheduleItemType; label: string }[] = [
  { value: "song", label: "Song" },
  { value: "verse", label: "Scripture" },
  { value: "custom_text", label: "Custom Text" },
  { value: "prayer", label: "Prayer" },
  { value: "announcement", label: "Announcement" },
  { value: "sermon", label: "Sermon" },
];

interface DraftItem {
  type: ScheduleItemType;
  title: string;
  content: string;
  notes: string;
}

const ITEM_TYPE_COLORS: Record<ScheduleItemType, string> = {
  song: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  verse: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  custom_text: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  prayer: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  announcement: "bg-green-500/20 text-green-300 border-green-500/30",
  sermon: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Dialog state ──────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [schedTitle, setSchedTitle]   = useState("");
  const [schedDate, setSchedDate]     = useState(new Date().toISOString().split("T")[0]);
  const [schedServiceType, setSchedServiceType] = useState<CreateScheduleBodyServiceType>("sunday_morning");
  const [schedNotes, setSchedNotes]   = useState("");
  const [items, setItems]             = useState<DraftItem[]>([]);
  const [newItemType, setNewItemType] = useState<ScheduleItemType>("song");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemContent, setNewItemContent] = useState("");

  // ── Screen state for handleRun ─────────────────────────────────────────
  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 5000 },
  });

  const resetForm = () => {
    setEditingId(null);
    setSchedTitle("");
    setSchedDate(new Date().toISOString().split("T")[0]);
    setSchedServiceType("sunday_morning");
    setSchedNotes("");
    setItems([]);
    setNewItemType("song");
    setNewItemTitle("");
    setNewItemContent("");
  };

  const openCreate = () => { resetForm(); setOpen(true); };

  const openEdit = (schedule: any) => {
    setEditingId(schedule.id);
    setSchedTitle(schedule.title ?? "");
    setSchedDate(schedule.date ?? new Date().toISOString().split("T")[0]);
    setSchedServiceType(schedule.serviceType ?? "sunday_morning");
    setSchedNotes(schedule.notes ?? "");
    setItems((schedule.items ?? []).map((it: any) => ({
      type: it.type,
      title: it.title ?? "",
      content: it.content ?? "",
      notes: it.notes ?? "",
    })));
    setNewItemType("song");
    setNewItemTitle("");
    setNewItemContent("");
    setOpen(true);
  };

  const addItem = () => {
    if (!newItemTitle.trim()) return;
    setItems(prev => [...prev, { type: newItemType, title: newItemTitle.trim(), content: newItemContent.trim(), notes: "" }]);
    setNewItemTitle("");
    setNewItemContent("");
  };

  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const moveItem = (i: number, dir: -1 | 1) => {
    setItems(prev => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  // ── API hooks ─────────────────────────────────────────────────────────
  const { data: schedules = [], isLoading } = useListSchedules({
    query: { queryKey: getListSchedulesQueryKey() }
  });

  const { mutate: createSchedule, isPending: creating } = useCreateSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
        toast({ title: "Schedule created", description: `"${schedTitle}" is ready.` });
        setOpen(false);
        resetForm();
      },
      onError: () => toast({ title: "Failed to create schedule", variant: "destructive" }),
    },
  });

  const { mutate: updateSchedule, isPending: updating } = useUpdateSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
        toast({ title: "Schedule updated" });
        setOpen(false);
        resetForm();
      },
      onError: () => toast({ title: "Failed to update schedule", variant: "destructive" }),
    },
  });

  const { mutate: deleteSchedule } = useDeleteSchedule({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() }),
    },
  });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
      onError: () => toast({ title: "Failed to send to screen", variant: "destructive" }),
    },
  });

  const handleSave = () => {
    if (!schedTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!schedDate) {
      toast({ title: "Date is required", variant: "destructive" });
      return;
    }
    const payload = {
      title: schedTitle.trim(),
      date: schedDate,
      serviceType: schedServiceType,
      notes: schedNotes || undefined,
      items: items.map(item => ({
        type: item.type,
        title: item.title,
        content: item.content || undefined,
        notes: item.notes || undefined,
      })),
    } as any;

    if (editingId !== null) {
      updateSchedule({ id: editingId, data: payload });
    } else {
      createSchedule({ data: payload });
    }
  };

  /** Safe full state passthrough — preserves all overlay fields so partial updates don't wipe them */
  const safeFullState = () => ({
    isBlack: false,
    isClear: false,
    textStyle: screenState?.textStyle ?? {
      fontFamily: "Inter", fontSize: 52, textColor: "#ffffff",
      accentColor: "#f59e0b", bold: false, italic: false,
      alignment: "center" as const, animation: "fade_in" as const,
    },
    background: screenState?.background ?? { type: "color" as const, value: "#000000" },
    layout: screenState?.layout ?? undefined,
    tickerEnabled: screenState?.tickerEnabled ?? false,
    tickerText: screenState?.tickerText ?? undefined,
    lowerThirdEnabled: screenState?.lowerThirdEnabled ?? false,
    lowerThirdName: screenState?.lowerThirdName ?? undefined,
    lowerThirdTitle: screenState?.lowerThirdTitle ?? undefined,
    lowerThirdPosition: (screenState?.lowerThirdPosition ?? "bottom-left") as "bottom-left" | "bottom-center" | "bottom-right",
    lowerThirdStyle: (screenState?.lowerThirdStyle ?? "modern") as "modern" | "classic" | "gradient" | "minimal",
    lowerThirdNameColor: screenState?.lowerThirdNameColor ?? "#ffffff",
    lowerThirdTitleColor: screenState?.lowerThirdTitleColor ?? "rgba(255,255,255,0.65)",
    lowerThirdBgColor: screenState?.lowerThirdBgColor ?? "rgba(0,0,0,0.72)",
    lowerThirdAccentColor: screenState?.lowerThirdAccentColor ?? "rgba(255,255,255,0.75)",
    lowerThirdNameSize: screenState?.lowerThirdNameSize ?? 22,
    lowerThirdTitleSize: screenState?.lowerThirdTitleSize ?? 13,
    clockOverlayEnabled: screenState?.clockOverlayEnabled ?? false,
    clockPosition: (screenState?.clockPosition ?? "top-right") as "top-left" | "top-right" | "bottom-left" | "bottom-right",
    clockStyle: (screenState?.clockStyle ?? "digital") as "digital" | "clean",
    clockShowDate: screenState?.clockShowDate ?? false,
    clockDateFormat: (screenState?.clockDateFormat ?? "long") as "short" | "long" | "numeric",
    clockFontSize: screenState?.clockFontSize ?? 16,
    clockColor: screenState?.clockColor ?? "rgba(255,255,255,0.92)",
    logoOverlayEnabled: screenState?.logoOverlayEnabled ?? false,
    logoUrl: screenState?.logoUrl ?? undefined,
    logoPosition: (screenState?.logoPosition ?? "top-right") as "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center",
    logoSize: screenState?.logoSize ?? 20,
    logoOpacity: screenState?.logoOpacity ?? 100,
    textOverlayEnabled: screenState?.textOverlayEnabled ?? false,
    textOverlayContent: screenState?.textOverlayContent ?? undefined,
    textOverlayPosition: (screenState?.textOverlayPosition ?? "top-left") as "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right",
    textOverlayFontSize: screenState?.textOverlayFontSize ?? 36,
    textOverlayColor: screenState?.textOverlayColor ?? "#ffffff",
    textOverlayBg: screenState?.textOverlayBg ?? "rgba(0,0,0,0.55)",
    textOverlayBold: screenState?.textOverlayBold ?? false,
    textOverlayItalic: screenState?.textOverlayItalic ?? false,
    textOverlayAlign: (screenState?.textOverlayAlign ?? "left") as "left" | "center" | "right",
    textOverlayFontFamily: screenState?.textOverlayFontFamily ?? "inherit",
    textOverlayShadow: screenState?.textOverlayShadow ?? false,
  });

  const handleRun = (item: any) => {
    const contentType: "song" | "verse" | "custom_text" =
      item.type === "song" ? "song" : item.type === "verse" ? "verse" : "custom_text";

    // Use item content if present, otherwise fall back to the title so something shows on screen
    const displayContent = item.content || item.title || "";

    updateScreen({
      data: {
        ...safeFullState(),
        contentType,
        title: item.title,
        content: displayContent,
      },
    });
    toast({ title: "Sent to screen", description: item.title });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Service Schedules</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Plan your service order and run items to the screen</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Schedule
        </Button>
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Schedule" : "Create Schedule"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title *</label>
                <Input value={schedTitle} onChange={e => setSchedTitle(e.target.value)} placeholder="Sunday Morning Service" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date *</label>
                <Input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
              </div>
            </div>

            {/* Service type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Service Type</label>
              <Select value={schedServiceType} onValueChange={v => setSchedServiceType(v as CreateScheduleBodyServiceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Order</label>

              {items.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-border p-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30 group">
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      <Badge className={`text-[10px] py-0 px-1.5 border shrink-0 ${ITEM_TYPE_COLORS[item.type]}`}>
                        {ITEM_TYPES.find(t => t.value === item.type)?.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">{item.title}</span>
                        {item.content && <span className="text-[10px] text-muted-foreground truncate block">{item.content.slice(0, 60)}{item.content.length > 60 ? "…" : ""}</span>}
                      </div>
                      <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add item row */}
              <div className="space-y-1.5 rounded-lg border border-border p-3 bg-muted/10">
                <div className="flex gap-2">
                  <Select value={newItemType} onValueChange={v => setNewItemType(v as ScheduleItemType)}>
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newItemTitle}
                    onChange={e => setNewItemTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                    placeholder="Title…"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addItem} disabled={!newItemTitle.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  value={newItemContent}
                  onChange={e => setNewItemContent(e.target.value)}
                  placeholder="Content to display on screen (optional)"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Leave content blank to display the title on screen when Run is clicked</p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes <span className="text-muted-foreground">(optional)</span></label>
              <Textarea value={schedNotes} onChange={e => setSchedNotes(e.target.value)} placeholder="Any additional notes for this service…" className="min-h-16 resize-none" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={creating || updating}>
                {creating || updating ? "Saving…" : editingId !== null ? "Save Changes" : "Create Schedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Schedule list ── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {schedules.map((schedule: any) => (
            <Card key={schedule.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{schedule.title}</CardTitle>
                  <CardDescription>
                    {format(new Date(schedule.date), "PPP")} · {SERVICE_TYPES.find(t => t.value === schedule.serviceType)?.label ?? schedule.serviceType}
                  </CardDescription>
                  {schedule.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{schedule.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(schedule)}
                    title="Edit schedule"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => deleteSchedule({ id: schedule.id })}
                    title="Delete schedule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {schedule.items.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border group hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-move shrink-0" />
                        <Badge className={`text-[10px] py-0 px-1.5 border shrink-0 ${ITEM_TYPE_COLORS[item.type as ScheduleItemType] ?? ""}`}>
                          {ITEM_TYPES.find(t => t.value === item.type)?.label ?? item.type}
                        </Badge>
                        <div className="min-w-0">
                          <span className="font-medium text-sm block truncate">{item.title}</span>
                          {item.content && (
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {item.content.slice(0, 80)}{item.content.length > 80 ? "…" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronUp className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronDown className="w-3 h-3" /></Button>
                        </div>
                        <Button size="sm" onClick={() => handleRun(item)} className="gap-1.5">
                          <Play className="w-3.5 h-3.5" /> Run
                        </Button>
                      </div>
                    </div>
                  ))}
                  {schedule.items.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No items in this schedule yet.{" "}
                      <button className="underline hover:text-foreground transition-colors" onClick={() => openEdit(schedule)}>
                        Add items
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {schedules.length === 0 && (
            <div className="py-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl space-y-3">
              <Calendar className="w-10 h-10 mx-auto opacity-30" />
              <p>No schedules yet. Create one to plan your service order.</p>
              <Button variant="outline" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> New Schedule
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
