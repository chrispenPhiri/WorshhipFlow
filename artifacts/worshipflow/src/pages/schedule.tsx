import { useState } from "react";
import { 
  useListSchedules,
  useCreateSchedule,
  useUpdateSchedule,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar, Plus, Play, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { format } from "date-fns";

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { data: schedules = [], isLoading } = useListSchedules({
    query: { queryKey: getListSchedulesQueryKey() }
  });

  const { mutate: deleteSchedule } = useDeleteSchedule({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() })
    }
  });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() })
    }
  });

  const handleRun = (item: any) => {
    updateScreen({
      data: {
        contentType: item.type === "song" ? "song" : item.type === "verse" ? "verse" : "custom_text",
        title: item.title,
        content: item.content || "",
        isBlack: false,
        isClear: false,
        textStyle: {
          fontFamily: "Inter",
          fontSize: 48,
          textColor: "#ffffff",
          alignment: "center",
          animation: "fade_in"
        },
        background: { type: "color", value: "#000000" }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary">
            <Calendar className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Service Schedules</h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Schedule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Schedule</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center text-muted-foreground">
              Form implementation skipped for brevity.
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {schedules.map((schedule: any) => (
            <Card key={schedule.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{schedule.title}</CardTitle>
                  <CardDescription>
                    {format(new Date(schedule.date), "PPP")} • {schedule.serviceType.replace('_', ' ')}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => deleteSchedule({ id: schedule.id })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {schedule.items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border group hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-move" />
                        <div className="flex flex-col">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col opacity-0 group-hover:opacity-100">
                           <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronUp className="w-3 h-3" /></Button>
                           <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronDown className="w-3 h-3" /></Button>
                        </div>
                        <Button size="sm" onClick={() => handleRun(item)}>
                          <Play className="w-4 h-4 mr-2" /> Run
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
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              No schedules found. Create one to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}