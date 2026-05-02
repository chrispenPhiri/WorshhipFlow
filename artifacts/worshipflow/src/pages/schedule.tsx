import { useState } from "react";
import {
  useListSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  useUpdateScreenState,
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
import { Calendar, Plus, Play, Trash2, GripVertical, ChevronUp, ChevronDown, X } from "lucide-react";
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
  const [schedTitle, setSchedTitle]   = useState("");
  const [schedDate, setSchedDate]     = useState(new Date().toISOString().split("T")[0]);
  const [schedServiceType, setSchedServiceType] = useState<CreateScheduleBodyServiceType>("sunday_morning");
  const [schedNotes, setSchedNotes]   = useState("");
  const [items, setItems]             = useState<DraftItem[]>([]);
  const [newItemType, setNewItemType] = useState<ScheduleItemType>("song");
  const [newItemTitle, setNewItemTitle] = useState("");

  const resetForm = () => {
    setSchedTitle("");
    setSchedDate(new Date().toISOString().split("T")[0]);
    setSchedServiceType("sunday_morning");
    setSchedNotes("");
    setItems([]);
    setNewItemType("song");
    setNewItemTitle("");
  };

  const addItem = () => {
    if (!newItemTitle.trim()) return;
    setItems(prev => [...prev, { type: newItemType, title: newItemTitle.trim(), notes: "" }]);
    setNewItemTitle("");
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

  const { mutate: deleteSchedule } = useDeleteSchedule({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() }),
    },
  });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  const handleCreate = () => {
    if (!schedTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!schedDate) {
      toast({ title: "Date is required", variant: "destructive" });
      return;
    }
    createSchedule({
      data: {
        title: schedTitle.trim(),
        date: schedDate,
        serviceType: schedServiceType,
        notes: schedNotes || undefined,
        items: items.map((item, i) => ({ type: item.type, title: item.title, notes: item.notes || undefined })),
      } as any,
    });
  };

  const handleRun = (item: any) => {
    updateScreen({
      data: {
        contentType: item.type === "song" ? "song" : item.type === "verse" ? "verse" : "custom_text",
        title: item.title,
        content: item.content || "",
        isBlack: false,
        isClear: false,
        textStyle: { fontFamily: "Inter", fontSize: 48, textColor: "#ffffff", alignment: "center", animation: "fade_in" },
        background: { type: "color", value: "#000000" },
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
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Schedule
        </Button>
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Schedule</DialogTitle>
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

              {/* Existing items */}
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
                      <span className="flex-1 text-sm truncate">{item.title}</span>
                      <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add item row */}
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
                  placeholder="Item title…"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addItem} disabled={!newItemTitle.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Press Enter or click + to add each item</p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes <span className="text-muted-foreground">(optional)</span></label>
              <Textarea value={schedNotes} onChange={e => setSchedNotes(e.target.value)} placeholder="Any additional notes for this service…" className="min-h-16 resize-none" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create Schedule"}
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
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"
                  onClick={() => deleteSchedule({ id: schedule.id })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {schedule.items.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border group hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-move" />
                        <Badge className={`text-[10px] py-0 px-1.5 border shrink-0 ${ITEM_TYPE_COLORS[item.type as ScheduleItemType] ?? ""}`}>
                          {ITEM_TYPES.find(t => t.value === item.type)?.label ?? item.type}
                        </Badge>
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
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
                      No items in this schedule yet.
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
              <Button variant="outline" onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> New Schedule
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
