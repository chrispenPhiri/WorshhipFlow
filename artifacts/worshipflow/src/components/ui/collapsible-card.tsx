import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "./card";
import { useLocalStorage } from "@/hooks/use-local-storage";

export function CollapsibleCard({
  id,
  icon: Icon,
  title,
  description,
  children,
  actions,
  defaultOpen = true,
  testId,
  contentClassName,
}: {
  id: string;
  icon?: React.ElementType;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  testId?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = useLocalStorage<boolean>(`wf-card:${id}:open`, defaultOpen);

  return (
    <Card data-testid={testId} className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-muted/20 transition-colors"
        aria-expanded={open}
      >
        {Icon && <Icon className="w-5 h-5 text-primary shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-none">{title}</p>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{description}</p>
          )}
        </div>
        {actions && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            {actions}
          </div>
        )}
        <ChevronDown
          className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      {open && (
        <div className={`border-t border-border/40 px-6 pb-6 pt-4 ${contentClassName ?? "space-y-4"}`}>
          {children}
        </div>
      )}
    </Card>
  );
}
