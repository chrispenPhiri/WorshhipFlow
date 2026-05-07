import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronsLeft, ChevronsRight, LogOut, Menu, Tv, User as UserIcon, BookOpen, Radio, Pencil } from "lucide-react";
import { LivePreview } from "./live-preview";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useGlobalScrollKeys } from "@/hooks/use-global-scroll-keys";
import {
  useSidebarScrollbar, useSidebarWidth, useContentScrollbar, usePreviewScrollbar,
  getScrollbarClass, getWidthPx,
} from "@/lib/sidebar-customization";
import {
  DEFAULT_NAV_ITEMS, effectiveIconId, effectiveEmoji, getIconComponent,
  useMenuCustomization, useEmojiMode,
} from "@/lib/menu-customization";
import { useAuth } from "@/lib/auth/context";
import { useBibleOnlyMode, isPathAllowedInBibleOnly } from "@/lib/bible-only-mode";
import { useGetScreenState, getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { ProfileDialog } from "./profile-dialog";
import { AiQuickPanel } from "./ai-quick-panel";
import { YoutubePlayerPanel } from "./youtube-player-panel";

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

function UserMenu({ collapsed, onOpenProfile }: { collapsed: boolean; onOpenProfile: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const avatar = (user as { avatar?: string }).avatar;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:ring-2 hover:ring-primary/60 transition-all overflow-hidden"
              aria-label={`Edit profile (${user.displayName})`}
              data-testid="button-profile-collapsed"
            >
              {avatar
                ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                : <UserIcon className="w-4 h-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {user.displayName} · Edit profile
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={logout}
              className="h-7 w-7 mx-auto text-sidebar-foreground/60 hover:text-destructive"
              aria-label="Sign out"
              data-testid="button-logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent/40"
      data-testid="user-menu"
    >
      <button
        type="button"
        onClick={onOpenProfile}
        className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 hover:ring-2 hover:ring-primary/60 transition-all overflow-hidden"
        aria-label="Edit profile"
        data-testid="button-profile"
      >
        {avatar
          ? <img src={avatar} alt="" className="w-full h-full object-cover" />
          : <UserIcon className="w-4 h-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-1 hover:text-primary transition-colors w-full text-left group"
        >
          <div className="text-sm font-medium truncate" data-testid="text-current-username">
            {user.displayName}
          </div>
          <Pencil className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
        </button>
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
  const [scrollbarStyle] = useSidebarScrollbar();
  const [widthPref] = useSidebarWidth();
  const [contentScrollbar] = useContentScrollbar();
  const [previewScrollbar] = usePreviewScrollbar();
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
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey(), refetchInterval: 3000 },
  });
  const isLive = !!(screenState as { isLive?: boolean } | undefined)?.isLive;

  const isDesktop = mode === "desktop";

  // Operator-side global scroll: ↑ / ↓ / PageUp / PageDown / Home / End
  // forward to the broadcast window so long Bible / sermon text can be
  // scrolled without focusing a remote button.  Skips inputs & /broadcast.
  useGlobalScrollKeys();

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
    <nav className={`flex-1 ${showLabels ? "px-3" : "px-2"} space-y-0.5 overflow-y-auto pb-4 ${getScrollbarClass(scrollbarStyle)}`}>
      {navItems.map((item) => {
        const isActive = location === item.href;

        const linkClasses = `flex items-center rounded-lg transition-all duration-150 ${
          showLabels ? "gap-3 px-2 py-1.5" : "justify-center h-11 w-11 mx-auto"
        } ${
          isActive
            ? "bg-primary/15 text-primary font-semibold"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60"
        }`;

        /* Colored icon pill */
        const iconPill = (
          <span
            className="flex items-center justify-center rounded-xl shrink-0 transition-all duration-150"
            style={{
              width: 34, height: 34,
              background: isActive
                ? `linear-gradient(135deg, ${item.color}60 0%, ${item.color}40 100%)`
                : `linear-gradient(135deg, ${item.color}42 0%, ${item.color}28 100%)`,
              color: item.color,
              boxShadow: isActive ? `0 0 0 1.5px ${item.color}55` : undefined,
            }}
          >
            {emojiMode
              ? <span style={{ fontSize: 17, lineHeight: 1, userSelect: "none" }}>{item.emoji}</span>
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
            {isLive && (
              <Link href="/media">
                <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse shrink-0 cursor-pointer">
                  <Radio className="w-2.5 h-2.5" /> LIVE
                </span>
              </Link>
            )}
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
          className="border-r border-border bg-sidebar flex-shrink-0 flex flex-col transition-[width] duration-200 ease-out"
          style={{ width: getWidthPx(widthPref, sidebarCollapsed) }}
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

          {/* ── LIVE indicator ───────────────────────────────── */}
          {isLive && (
            <div className={`${sidebarCollapsed ? "px-2 flex justify-center" : "px-3"} pb-2`}>
              <Link href="/media">
                <div className={`flex items-center gap-2 bg-red-600/15 border border-red-600/40 rounded-lg cursor-pointer hover:bg-red-600/25 transition-colors ${sidebarCollapsed ? "h-10 w-10 justify-center" : "px-3 py-2"}`}>
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  {!sidebarCollapsed && (
                    <span className="text-xs font-bold text-red-400 tracking-widest">LIVE</span>
                  )}
                  {!sidebarCollapsed && (
                    <Radio className="w-3.5 h-3.5 text-red-400 ml-auto" />
                  )}
                </div>
              </Link>
            </div>
          )}

          <div className={`border-t border-border ${sidebarCollapsed ? "px-2" : "px-3"} py-3`}>
            <UserMenu collapsed={sidebarCollapsed} onOpenProfile={() => setProfileOpen(true)} />
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
              <UserMenu collapsed={false} onOpenProfile={() => { setProfileOpen(true); setMenuOpen(false); }} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className={`flex-1 overflow-y-auto min-w-0 ${getScrollbarClass(contentScrollbar)}`}>
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
          <div className={`flex-1 p-4 flex flex-col gap-4 overflow-y-auto ${getScrollbarClass(previewScrollbar)}`}>
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

      {/* ── Profile dialog ────────────────────────────────────────────── */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      {/* ── YouTube player panel (floating) ──────────────────────────── */}
      <YoutubePlayerPanel />

      {/* ── AI quick panel (floating) ─────────────────────────────────── */}
      <AiQuickPanel />
    </div>
  );
}
