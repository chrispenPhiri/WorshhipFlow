import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronsLeft, ChevronsRight, LayoutGrid, LogOut, Pencil, Tv, User as UserIcon, BookOpen, Radio, Users } from "lucide-react";
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
import { toast } from "sonner";
import { ProfileDialog } from "./profile-dialog";
import { AiQuickPanel } from "./ai-quick-panel";
import { YoutubePlayerPanel } from "./youtube-player-panel";
import { LiveSessionPanel } from "./live-session-panel";
import { SessionViewerMode } from "./session-viewer-mode";
import { useLiveSession } from "@/hooks/use-live-session";

/** Bottom tab bar — the 4 pages accessible directly from mobile nav */
const BOTTOM_NAV_HREFS = ["/", "/songs", "/custom", "/media"] as const;
const BOTTOM_NAV_SHORT_LABELS: Record<string, string> = {
  "/":       "Bible",
  "/songs":  "Songs",
  "/custom": "Custom",
  "/media":  "Media",
};

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
  const [sessionOpen, setSessionOpen] = useState(false);
  const session = useLiveSession();
  const inSession = (session.state.status === "connected" || session.state.status === "reconnecting") && !!session.state.code;

  // ── Chat message notifications ─────────────────────────────────────────
  const seenMsgCountRef = useRef(session.chatMessages.length);
  const [chatUnread, setChatUnread] = useState(0);

  // Play a soft beep when a new message arrives
  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } catch { /* AudioContext may be blocked — ignore */ }
  };

  useEffect(() => {
    const prev = seenMsgCountRef.current;
    const curr = session.chatMessages.length;
    if (curr > prev && inSession) {
      const newMsgs = session.chatMessages.slice(prev);
      if (!sessionOpen) {
        // Show a toast for each new message when the panel is closed
        for (const msg of newMsgs) {
          toast(msg.displayName, {
            description: msg.text.length > 80 ? msg.text.slice(0, 80) + "…" : msg.text,
            duration: 5000,
            action: { label: "Open", onClick: () => setSessionOpen(true) },
          });
        }
        playBeep();
        setChatUnread(u => u + newMsgs.length);
      }
    }
    seenMsgCountRef.current = curr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.chatMessages.length]);

  // Reset unread count when the panel is opened
  useEffect(() => {
    if (sessionOpen) {
      setChatUnread(0);
      seenMsgCountRef.current = session.chatMessages.length;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionOpen]);

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

  // ── Viewer mode: when in a session as a viewer, show clean presentation screen ──
  if (inSession && session.state.myRole === "viewer") {
    return (
      <SessionViewerMode
        sessionState={session.state}
        sessionOpen={sessionOpen}
        onSessionOpenChange={setSessionOpen}
        createSession={session.createSession}
        joinSession={session.joinSession}
        leaveSession={session.leaveSession}
        changeRole={session.changeRole}
        clearError={session.clearError}
      />
    );
  }

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

  /** Which tab is active in the bottom bar? "More" is active when on a page not in the bar */
  const isInBottomNav = (BOTTOM_NAV_HREFS as readonly string[]).includes(location);
  const bottomNavItems = navItems.filter(item => (BOTTOM_NAV_HREFS as readonly string[]).includes(item.href));

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
          className="flex items-center justify-between gap-2 px-4 border-b border-border bg-sidebar flex-shrink-0"
          data-testid="mobile-top-bar"
          style={{
            paddingTop: "max(0.625rem, env(safe-area-inset-top))",
            paddingBottom: "0.625rem",
            minHeight: "calc(2.75rem + env(safe-area-inset-top, 0px))",
          }}
        >
          <h1 className="text-sm font-bold text-primary flex items-center gap-2 truncate min-w-0 flex-1">
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
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSessionOpen(true)}
              className="relative flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/60 transition-colors"
              aria-label="Live session"
              data-testid="button-mobile-session"
            >
              <Users className="w-4 h-4" />
              {inSession && !chatUnread && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-sidebar" />
              )}
              {chatUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full border border-sidebar flex items-center justify-center">
                  {chatUnread > 9 ? "9+" : chatUnread}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="px-2.5 h-8 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1.5"
              aria-label="Open live preview"
              data-testid="button-mobile-preview"
            >
              <Tv className="w-4 h-4" /> Preview
            </button>
          </div>
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

          {/* ── Live Session button ───────────────────────────── */}
          <div className={`${sidebarCollapsed ? "px-2 flex justify-center" : "px-3"} pb-2`}>
            {sidebarCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSessionOpen(true)}
                    className="relative flex items-center justify-center w-10 h-10 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/60 transition-colors"
                    aria-label="Live session"
                    data-testid="button-session-collapsed"
                  >
                    <Users className="w-4 h-4" />
                    {inSession && !chatUnread && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border border-sidebar" />
                    )}
                    {chatUnread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full border border-sidebar flex items-center justify-center">
                        {chatUnread > 9 ? "9+" : chatUnread}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Live Session{inSession ? ` · ${session.state.code}` : ""}</TooltipContent>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={() => setSessionOpen(true)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  inSession
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
                }`}
                data-testid="button-session"
              >
                <div className="relative shrink-0">
                  <Users className="w-4 h-4" />
                  {inSession && !chatUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                  {chatUnread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full border border-sidebar flex items-center justify-center">
                      {chatUnread > 9 ? "9+" : chatUnread}
                    </span>
                  )}
                </div>
                <span className="truncate">
                  {inSession ? `Session · ${session.state.code}` : "Live Session"}
                </span>
                {inSession && !chatUnread && (
                  <span className="text-xs text-emerald-500 shrink-0">
                    {session.state.members.length} online
                  </span>
                )}
                {chatUnread > 0 && (
                  <span className="text-xs text-red-400 shrink-0 font-semibold">
                    {chatUnread} new
                  </span>
                )}
              </button>
            )}
          </div>

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
        <div
          className="p-4 sm:p-6 lg:p-8 h-full min-h-full"
          style={!isDesktop ? { paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" } : undefined}
        >
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

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      {!isDesktop && (
        <nav
          className="flex items-stretch border-t border-border bg-sidebar shrink-0 z-20"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          data-testid="mobile-bottom-nav"
        >
          {bottomNavItems.map((item) => {
            const isActive = location === item.href;
            const shortLabel = BOTTOM_NAV_SHORT_LABELS[item.href] ?? item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 select-none transition-opacity"
                style={{ minHeight: "3.25rem" }}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className="flex items-center justify-center w-8 h-7 rounded-xl transition-all duration-150"
                  style={isActive
                    ? { background: `${item.color}28`, color: item.color }
                    : { color: "var(--muted-foreground)" }
                  }
                >
                  {emojiMode
                    ? <span style={{ fontSize: 16, lineHeight: 1, userSelect: "none" }}>{item.emoji}</span>
                    : <item.Icon style={{ width: 18, height: 18 }} />
                  }
                </span>
                <span
                  className="text-[10px] font-medium leading-none"
                  style={isActive ? { color: item.color } : { color: "var(--muted-foreground)" }}
                >
                  {shortLabel}
                </span>
              </Link>
            );
          })}

          {/* ── More — opens the full nav sheet ── */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 select-none"
            style={{ minHeight: "3.25rem" }}
            aria-label="Open navigation menu"
            data-testid="button-mobile-more"
          >
            <span
              className={`flex items-center justify-center w-8 h-7 rounded-xl transition-all duration-150 ${
                !isInBottomNav ? "bg-primary/15 text-primary" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid style={{ width: 18, height: 18 }} />
            </span>
            <span className={`text-[10px] font-medium leading-none ${!isInBottomNav ? "text-primary" : "text-muted-foreground"}`}>
              More
            </span>
          </button>
        </nav>
      )}

      {/* ── Profile dialog ────────────────────────────────────────────── */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      {/* ── Live session panel ────────────────────────────────────────── */}
      <LiveSessionPanel
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        sessionState={session.state}
        createSession={session.createSession}
        joinSession={session.joinSession}
        leaveSession={session.leaveSession}
        changeRole={session.changeRole}
        clearError={session.clearError}
        chatMessages={session.chatMessages}
        sendChatMessage={session.sendChatMessage}
        sendSignal={session.sendSignal}
        setSignalHandler={session.setSignalHandler}
      />

      {/* ── YouTube player panel (floating) ──────────────────────────── */}
      <YoutubePlayerPanel />

      {/* ── AI quick panel (floating) ─────────────────────────────────── */}
      <AiQuickPanel />
    </div>
  );
}
