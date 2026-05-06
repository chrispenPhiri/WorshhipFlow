import { ReactNode } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export function CollapsibleTabsBar({
  collapsed,
  onToggle,
  activeLabel,
  children,
  className = "",
}: {
  collapsed: boolean;
  onToggle: () => void;
  activeLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-1.5 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onToggle}
            aria-pressed={collapsed}
            aria-label={collapsed ? "Show tabs" : "Hide tabs"}
            className="h-7 w-7 shrink-0 mt-0.5 text-muted-foreground hover:text-foreground"
            data-testid="button-toggle-tabs"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {collapsed ? "Show tabs" : "Hide tabs"}
        </TooltipContent>
      </Tooltip>
      <div className={`flex-1 min-w-0 ${collapsed ? "hidden" : ""}`}>
        {children}
      </div>
      {collapsed && activeLabel && (
        <span className="text-xs text-muted-foreground italic mt-1.5 truncate">
          {activeLabel}
        </span>
      )}
    </div>
  );
}
