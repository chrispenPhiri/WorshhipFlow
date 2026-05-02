import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Book, Music, Type, Calendar, BookOpen, Settings, Video, Palette, Sparkles, HelpCircle, GraduationCap, Gamepad2 } from "lucide-react";
import { LivePreview } from "./live-preview";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

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
    <div className="flex h-screen overflow-hidden bg-background text-foreground dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="bg-primary text-primary-foreground p-1 rounded">PW</span>
            Phiri WorshipFlow
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
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
  );
}
