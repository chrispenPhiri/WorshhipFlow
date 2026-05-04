import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronsLeft, ChevronsRight, LogOut, Menu, Tv, User as UserIcon, BookOpen } from "lucide-react";
import { LivePreview } from "./live-preview";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  DEFAULT_NAV_ITEMS, effectiveIconId, effectiveEmoji, getIconComponent,
  useMenuCustomization, useEmojiMode,
} from "@/lib/menu-customization";
import { useAuth } from "@/lib/auth/context";
import { useBibleOnlyMode, isPathAllowedInBibleOnly } from "@/lib/bible-only-mode";

/**
 * Three viewport modes drive the layout shape:
 *   mobile  (< 768)   — top bar + drawer-style sidebar + drawer-style preview.
 *   tablet  (768-1023) — top bar + drawer-style sidebar + drawer-style preview
 *                        (same as mobile; tablet width can't comfortably fit
 *                        a 256+384px set of side-panels alongside the main).
 *   desktop (>= 1024) — fixed left sidebar (collapsible) + right preview.
 *
 * We render the LivePreview in exactly ONE place at any moment so its
 * BroadcastChannel listener and screen-state polling don't double up.
 */
function useViewportMode(): "mobile" | "tablet" | "desktop" {
  const compute = (): "mobile" | "tablet" | "desktop" => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  };
  const [mode, setMode] = useState(compute);
  useEffect(() => {
    const onResize = () => setMode(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mode;
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={logout}
            className="h-10 w-10 mx-auto text-sidebar-foreground/80 hover:text-sidebar-foreground"
            aria-label={`Sign out (${user.displayName})`}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Signed in as {user.displayName} — click to sign out
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent/40"
      data-testid="user-menu"
    >
      <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center shrink-0">
        <UserIcon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate" data-testid="text-current-username">
          {user.displayName}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">@{user.username}</div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={logout}
            className="h-7 w-7 text-sidebar-foreground/70 hover:text-destructive shrink-0"
            aria-label="Sign out"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Sign out</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("wf-sidebar-collapsed", false);
  const { overrides } = useMenuCustomization();
  const { enabled: bibleOnly } = useBibleOnlyMode();
  const mode = useViewportMode();

  // When Bible-only mode is on, redirect any non-allowed page back to the
  // Bible. The Settings page stays accessible so the operator can turn the
  // mode off again without resorting to localStorage edits.
  useEffect(() => {
    if (bibleOnly && !isPathAllowedInBibleOnly(location)) {
      setLocation("/");
    }
  }, [bibleOnly, location, setLocation]);

  const [emojiMode] = useEmojiMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isDesktop = mode === "desktop";

  // If the viewport grows past the lg breakpoint while a mobile sheet is
  // open, close it — otherwise it would silently re-appear next time the
  // user shrinks back down.
  useEffect(() => {
    if (isDesktop) {
      setMenuOpen(false);
      setPreviewOpen(false);
    }
  }, [isDesktop]);

  // Desktop respects the user's collapse pref; on tablet/mobile we only show
  // the sidebar inside a sheet so collapsed state is irrelevant there.
  const sidebarCollapsed = collapsed;

  const visibleNavItems = bibleOnly
    ? DEFAULT_NAV_ITEMS.filter((item) => isPathAllowedInBibleOnly(item.href))
    : DEFAULT_NAV_ITEMS;

  const navItems = visibleNavItems.map((item) => ({
    ...item,
    Icon: getIconComponent(effectiveIconId(item, overrides)),
    color: item.color,
    emoji: effectiveEmoji(item, overrides),
  }));

  /** Render the nav links.  When `showLabels` is false (collapsed desktop
   *  sidebar) we wrap each link in a Tooltip so the label stays discoverable. */
  const renderNav = (showLabels: boolean, onNavigate?: () => void) => (
    <nav className={`flex-1 ${showLabels ? "px-3" : "px-2"} space-y-0.5 overflow-y-auto pb-4`}>
      {navItems.map((item) => {
        const isActive = location === item.href;

        const linkClasses = `flex items-center rounded-lg transition-all duration-150 ${
          showLabels ? "gap-3 px-2 py-1.5" : "justify-center h-11 w-11 mx-auto"
        } ${
          isActive
            ? "bg-primary/15 text-primary font-semibold"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60"
        }`;

        /* Colored icon pill — visible only when not active */
        const iconPill = (
          <span
            className="flex items-center justify-center rounded-lg shrink-0 transition-all duration-150"
            style={{
              width: 32, height: 32,
              backgroundColor: isActive ? `${item.color}33` : `${item.color}22`,
              color: item.color,
            }}
          >
            {emojiMode
              ? <span style={{ fontSize: 16, lineHeight: 1, userSelect: "none" }}>{item.emoji}</span>
              : <item.Icon style={{ width: 17, height: 17 }} />
            }
          </span>
        );

        const link = (
          <Link
            href={item.href}
            className={linkClasses}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            data-testid={`nav-${item.href === "/" ? "home" : item.href.slice(1)}`}
          >
            {iconPill}
            {showLabels && (
              <span className="truncate text-sm">{item.label}</span>
            )}
          </Link>
        );

        return showLabels ? (
          <div key={item.href}>{link}</div>
        ) : (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground dark flex-col lg:flex-row">
      {/* ── Mobile / tablet top bar ───────────────────────────────────── */}
      {!isDesktop && (
        <header
          className="flex items-center justify-between gap-3 px-3 h-14 border-b border-border bg-sidebar flex-shrink-0"
          data-testid="mobile-top-bar"
        >
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Open menu"
            data-testid="button-mobile-menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-primary flex items-center gap-2 truncate min-w-0">
            <span className="bg-primary text-primary-foreground p-1 rounded text-xs shrink-0">PW</span>
            <span className="truncate">Phiri WorshipFlow</span>
          </h1>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="px-2.5 h-8 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1.5 shrink-0"
            aria-label="Open live preview"
            data-testid="button-mobile-preview"
          >
            <Tv className="w-4 h-4" /> Preview
          </button>
        </header>
      )}

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      {isDesktop && (
        <aside
          className={`border-r border-border bg-sidebar flex-shrink-0 flex flex-col transition-[width] duration-200 ease-out ${
            sidebarCollapsed ? "w-16" : "w-64"
          }`}
          data-collapsed={sidebarCollapsed}
          data-testid="main-sidebar"
        >
          {/* Brand */}
          <div className={`flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-6"} py-5`}>
            {sidebarCollapsed ? (
              <span
                className="bg-primary text-primary-foreground p-1.5 rounded font-bold text-sm leading-none"
                aria-label="Phiri WorshipFlow"
                title="Phiri WorshipFlow"
              >
                PW
              </span>
            ) : (
              <h1 className="text-xl font-bold text-primary flex items-center gap-2 min-w-0">
                <span className="bg-primary text-primary-foreground p-1 rounded shrink-0">PW</span>
                <span className="truncate">Phiri WorshipFlow</span>
              </h1>
            )}
          </div>

          {/* Collapse toggle */}
          <div className={`px-2 ${sidebarCollapsed ? "flex justify-center" : "flex justify-end pr-3"} pb-2`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setCollapsed((c) => !c)}
                  className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-pressed={sidebarCollapsed}
                  data-testid="button-toggle-sidebar"
                >
                  {sidebarCollapsed
                    ? <ChevronsRight className="h-4 w-4" />
                    : <ChevronsLeft className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {sidebarCollapsed ? "Expand menu" : "Collapse menu"}
              </TooltipContent>
            </Tooltip>
          </div>

          {renderNav(!sidebarCollapsed)}

          <div className={`border-t border-border ${sidebarCollapsed ? "px-2" : "px-3"} py-3`}>
            <UserMenu collapsed={sidebarCollapsed} />
          </div>
        </aside>
      )}

      {/* ── Mobile sidebar sheet ──────────────────────────────────────── */}
      {!isDesktop && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-sidebar border-border flex flex-col"
            data-testid="sheet-mobile-menu"
          >
            <SheetHeader className="p-4 border-b border-border text-left">
              <SheetTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <span className="bg-primary text-primary-foreground p-1 rounded text-xs">PW</span>
                Phiri WorshipFlow
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto py-2">
              {renderNav(true, () => setMenuOpen(false))}
            </div>
            <div className="border-t border-border p-3">
              <UserMenu collapsed={false} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {bibleOnly && (
          <div
            className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs bg-primary/10 text-primary border-b border-primary/20"
            data-testid="banner-bible-only"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Bible-only mode is on. Open Settings to turn it off.
          </div>
        )}
        <div className="p-4 sm:p-6 lg:p-8 h-full min-h-full">
          {children}
        </div>
      </main>

      {/* ── Desktop live preview panel ────────────────────────────────── */}
      {isDesktop && (
        <aside className="w-96 border-l border-border bg-sidebar flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg">Live Preview</h2>
          </div>
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
            <LivePreview />
          </div>
        </aside>
      )}

      {/* ── Mobile live preview sheet ─────────────────────────────────── */}
      {!isDesktop && (
        <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-md p-0 bg-sidebar border-border flex flex-col"
            data-testid="sheet-mobile-preview"
          >
            <SheetHeader className="p-4 border-b border-border text-left">
              <SheetTitle>Live Preview</SheetTitle>
            </SheetHeader>
            <div className="flex-1 p-4 overflow-y-auto">
              <LivePreview />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
