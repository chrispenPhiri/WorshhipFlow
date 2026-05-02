import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Book, Music, Type, Calendar, BookOpen, Settings, Video, Palette,
  Sparkles, HelpCircle, GraduationCap, Gamepad2,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { LivePreview } from "./live-preview";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useLocalStorage } from "@/hooks/use-local-storage";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  // Persist the user's preference so the sidebar stays the way they like it
  // across reloads.  Default = expanded so first-time users see the labels.
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(
    "wf-sidebar-collapsed",
    false,
  );

  const navItems = [
    { href: "/", label: "Bible", icon: Book },
    { href: "/songs", label: "Songs", icon: Music },
    { href: "/custom", label: "Custom Text", icon: Type },
    { href: "/themes", label: "Themes", icon: Palette },
    { href: "/media", label: "Media & Broadcast", icon: Video },
    { href: "/schedule", label: "Schedule", icon: Calendar },
    { href: "/notes", label: "Sermon Notes", icon: BookOpen },
    { href: "/inspiration", label: "Daily Inspiration", icon: Sparkles },
    { href: "/teachings", label: "Teachings", icon: GraduationCap },
    { href: "/games", label: "Bible Games", icon: Gamepad2 },
    { href: "/how-to", label: "How To", icon: HelpCircle },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground dark">
        {/* Sidebar — collapsible.  When collapsed it shows icons only and
            uses tooltips so the labels remain discoverable on hover. */}
        <aside
          className={`border-r border-border bg-sidebar flex-shrink-0 flex flex-col transition-[width] duration-200 ease-out ${
            collapsed ? "w-16" : "w-64"
          }`}
          data-collapsed={collapsed}
          data-testid="main-sidebar"
        >
          {/* Brand row + collapse toggle */}
          <div className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-6"} py-5`}>
            {collapsed ? (
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

          {/* Toggle row — separate so it sits flush below the brand at any width */}
          <div className={`px-2 ${collapsed ? "flex justify-center" : "flex justify-end pr-3"} pb-2`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setCollapsed((c) => !c)}
                  className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-pressed={collapsed}
                  data-testid="button-toggle-sidebar"
                >
                  {collapsed
                    ? <ChevronsRight className="h-4 w-4" />
                    : <ChevronsLeft className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "Expand menu" : "Collapse menu"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Nav links */}
          <nav className={`flex-1 ${collapsed ? "px-2" : "px-4"} space-y-1`}>
            {navItems.map((item) => {
              const isActive = location === item.href;
              const linkClasses = `flex items-center rounded-md transition-colors ${
                collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2"
              } ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`;

              const link = (
                <Link
                  href={item.href}
                  className={linkClasses}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  data-testid={`nav-${item.href === "/" ? "home" : item.href.slice(1)}`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );

              // Only attach a tooltip when collapsed — otherwise the visible
              // label is already sufficient and a tooltip would just be noise.
              return collapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={item.href}>{link}</div>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 h-full min-h-full">
            {children}
          </div>
        </main>

        {/* Live Preview Panel */}
        <aside className="w-96 border-l border-border bg-sidebar flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg">Live Preview</h2>
          </div>
          <div className="flex-1 p-4 flex flex-col gap-4">
            <LivePreview />
          </div>
        </aside>
      </div>
    </TooltipProvider>
  );
}
