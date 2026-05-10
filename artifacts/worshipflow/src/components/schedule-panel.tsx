/**
 * Compact schedule panel — renders in the right sidebar's "Schedule" tab.
 * Shows all saved schedules with Run buttons for each item.
 * Read-only run surface; full editing still lives on /schedule.
 */
import { useState } from "react";
import { Link } from "wouter";
import {
  useListSchedules, useUpdateScreenState, useGetScreenState,
  getListSchedulesQueryKey, getGetScreenStateQueryKey,
  type ScheduleItemType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Play, Plus, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ITEM_TYPE_COLORS: Record<ScheduleItemType, string> = {
  song:         "bg-purple-500/20 text-purple-300 border-purple-500/30",
  verse:        "bg-blue-500/20 text-blue-300 border-blue-500/30",
  custom_text:  "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  prayer:       "bg-amber-500/20 text-amber-300 border-amber-500/30",
  announcement: "bg-green-500/20 text-green-300 border-green-500/30",
  sermon:       "bg-red-500/20 text-red-300 border-red-500/30",
};

const ITEM_LABELS: Record<ScheduleItemType, string> = {
  song: "Song", verse: "Scripture", custom_text: "Text",
  prayer: "Prayer", announcement: "Note", sermon: "Sermon",
};

export function SchedulePanel() {
  const queryClient = useQueryClient();
  const { data: schedules = [], isLoading } = useListSchedules({
    query: { queryKey: getListSchedulesQueryKey() },
  });
  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 5000 },
  });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const toggle = (id: number) =>
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const handleRun = (item: { type: ScheduleItemType; title: string; content?: string }) => {
    const contentType: "song" | "verse" | "custom_text" =
      item.type === "song" ? "song" : item.type === "verse" ? "verse" : "custom_text";
    updateScreen({
      data: {
        isBlack: false, isClear: false,
        contentType,
        title: item.title,
        content: item.content || item.title,
        textStyle: (screenState as { textStyle?: unknown })?.textStyle as never ?? {
          fontFamily: "Inter", fontSize: 52, textColor: "#ffffff",
          accentColor: "#f59e0b", bold: false, italic: false,
          alignment: "center", animation: "fade_in",
        },
        background: (screenState as { background?: unknown })?.background as never ?? { type: "color", value: "#000000" },
      },
    });
    toast.success(`Sent to screen: ${item.title}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted/40 animate-pulse rounded-lg" />)}
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
        <Calendar className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No schedules yet</p>
        <Link href="/schedule">
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="w-3.5 h-3.5" /> Create Schedule
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-1.5 p-2">
        {(schedules as Array<{
          id: number; title: string; date: string; serviceType: string;
          items: Array<{ type: ScheduleItemType; title: string; content?: string }>;
        }>).map((schedule) => {
          const isOpen = expanded.has(schedule.id);
          return (
            <div key={schedule.id} className="rounded-lg border border-border overflow-hidden">
              {/* Schedule header */}
              <button
                type="button"
                onClick={() => toggle(schedule.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
              >
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{schedule.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(schedule.date), "MMM d")} · {schedule.items.length} items
                  </p>
                </div>
              </button>

              {/* Items list */}
              {isOpen && (
                <div className="border-t border-border divide-y divide-border/50">
                  {schedule.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors group">
                      <Badge className={`text-[9px] py-0 px-1 border shrink-0 ${ITEM_TYPE_COLORS[item.type]}`}>
                        {ITEM_LABELS[item.type]}
                      </Badge>
                      <span className="flex-1 text-xs truncate min-w-0">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRun(item)}
                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Play className="w-2.5 h-2.5" /> Run
                      </button>
                    </div>
                  ))}
                  {schedule.items.length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">No items yet</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer link */}
      <div className="border-t border-border p-2">
        <Link href="/schedule">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/40"
          >
            <ExternalLink className="w-3 h-3" /> Manage Schedules
          </button>
        </Link>
      </div>
    </div>
  );
}
