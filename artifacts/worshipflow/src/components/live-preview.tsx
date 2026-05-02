import { useState } from "react";
import { useGetScreenState, useUpdateScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ExternalLink, Monitor, MonitorSpeaker, ChevronDown, Loader2 } from "lucide-react";
import { useBroadcast } from "@/hooks/use-broadcast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LivePreview() {
  const queryClient = useQueryClient();
  const { data: screenState, isLoading, error } = useGetScreenState({
    query: {
      queryKey: getGetScreenStateQueryKey(),
      refetchInterval: 2000
    }
  });

  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() });
      }
    }
  });

  const { screens, permissionState, detectScreens, openBroadcast, isWindowManagementSupported } = useBroadcast();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (isLoading) return <div className="animate-pulse h-48 bg-muted rounded-md" />;
  if (error) return <div className="text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Error loading preview</div>;
  if (!screenState) return null;

  const handleClear = () => updateScreen({ data: { ...screenState, isClear: true } });
  const handleBlackScreen = () => updateScreen({ data: { ...screenState, isBlack: !screenState.isBlack } });

  const getStyle = () => {
    if (!screenState.textStyle) return {};
    return {
      fontFamily: screenState.textStyle.fontFamily,
      fontSize: `${screenState.textStyle.fontSize / 3}px`,
      color: screenState.textStyle.textColor,
      fontWeight: screenState.textStyle.bold ? "bold" : "normal",
      fontStyle: screenState.textStyle.italic ? "italic" : "normal",
      textAlign: screenState.textStyle.alignment as "left" | "center" | "right",
    };
  };

  const handleOpenDropdown = async () => {
    if (isWindowManagementSupported && screens.length === 0) {
      await detectScreens();
    }
    setPickerOpen(true);
  };

  const handleOpenOnScreen = async (screenIndex?: number) => {
    const target = screenIndex !== undefined ? screens[screenIndex] : undefined;
    await openBroadcast(target);
    setPickerOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2">
          <Button
            variant={screenState.isBlack ? "default" : "outline"}
            size="sm"
            onClick={handleBlackScreen}
            className={screenState.isBlack ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
          >
            Black Screen
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>Clear</Button>
        </div>

        {isWindowManagementSupported ? (
          <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-primary border-primary/40 hover:bg-primary/10"
                onClick={handleOpenDropdown}
              >
                {permissionState === "requesting" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MonitorSpeaker className="w-3.5 h-3.5" />
                )}
                Broadcast
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Choose display
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {screens.length === 0 && permissionState !== "requesting" && (
                <DropdownMenuItem onClick={() => handleOpenOnScreen(undefined)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in new tab
                </DropdownMenuItem>
              )}

              {screens.map((s, i) => (
                <DropdownMenuItem key={i} onClick={() => handleOpenOnScreen(i)}>
                  <Monitor className="w-4 h-4 mr-2 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.width}×{s.height}{s.isPrimary ? " · Primary" : ""}</div>
                  </div>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenOnScreen(undefined)}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in new tab
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openBroadcast()}
            className="gap-1.5 text-primary border-primary/40 hover:bg-primary/10"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Broadcast
          </Button>
        )}
      </div>

      {/* Screen Preview Container (16:9) */}
      <div className="relative w-full aspect-video bg-black rounded overflow-hidden border border-border shadow-lg flex flex-col">
        {screenState.isBlack ? (
          <div className="absolute inset-0 bg-black z-50" />
        ) : null}

        <div className="flex-1 relative flex items-center justify-center p-4">
          {!screenState.isClear && screenState.content && (
            <div style={getStyle()} className="w-full text-center whitespace-pre-wrap">
              {screenState.content}
            </div>
          )}
        </div>

        {screenState.tickerEnabled && (
          <div className="h-6 bg-zinc-900 border-t border-zinc-800 text-white text-xs flex items-center px-2 overflow-hidden">
            <div className="whitespace-nowrap animate-[marquee_10s_linear_infinite]">
              {screenState.tickerText}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        <p>Current: <span className="font-medium text-foreground">{screenState.title || "None"}</span></p>
        <p>Type: {screenState.contentType}</p>
        {isWindowManagementSupported && screens.length > 1 && (
          <p className="text-primary/70">{screens.length} displays detected</p>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}} />
    </div>
  );
}
