import { useLocalStorage } from "@/hooks/use-local-storage";

export type ScrollbarStyle = "modern" | "thin" | "auto-hide" | "default";
export type SidebarWidth = "compact" | "normal" | "wide";

export const SCROLLBAR_STYLES: { id: ScrollbarStyle; label: string; description: string }[] = [
  { id: "modern",    label: "Modern",     description: "Slim themed bar that matches the sidebar" },
  { id: "thin",      label: "Thin",       description: "Minimal 4px bar — barely there" },
  { id: "auto-hide", label: "Auto-hide",  description: "Hidden until you hover the sidebar" },
  { id: "default",   label: "Default",    description: "Browser native scrollbar" },
];

export const SIDEBAR_WIDTHS: { id: SidebarWidth; label: string; expanded: number; collapsed: number }[] = [
  { id: "compact", label: "Compact", expanded: 208, collapsed: 56 },
  { id: "normal",  label: "Normal",  expanded: 256, collapsed: 64 },
  { id: "wide",    label: "Wide",    expanded: 304, collapsed: 72 },
];

export function useSidebarScrollbar() {
  return useLocalStorage<ScrollbarStyle>("wf-sidebar-scrollbar", "modern");
}

export function useSidebarWidth() {
  return useLocalStorage<SidebarWidth>("wf-sidebar-width", "normal");
}

export function getScrollbarClass(style: ScrollbarStyle): string {
  switch (style) {
    case "modern":    return "wf-scroll-modern";
    case "thin":      return "wf-scroll-thin";
    case "auto-hide": return "wf-scroll-autohide";
    case "default":   return "";
  }
}

export function getWidthPx(widthId: SidebarWidth, collapsed: boolean): number {
  const w = SIDEBAR_WIDTHS.find(s => s.id === widthId) ?? SIDEBAR_WIDTHS[1];
  return collapsed ? w.collapsed : w.expanded;
}
