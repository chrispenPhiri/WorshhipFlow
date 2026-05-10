// Single source of truth for the main-menu nav items + the icon palette
// users can pick from when they want to personalise their sidebar.
//
// Layout reads `useMenuCustomization()` to look up any per-item overrides;
// Settings writes to it via the same hook.  Overrides persist to
// localStorage under "wf-menu-overrides" and are entirely operator-local —
// they never affect the broadcast/projection screen.

import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  Book, Music, Type, Calendar, BookOpen, Settings, Video, Palette, Sparkles,
  HelpCircle, GraduationCap, Gamepad2, Cross, Church, Heart, Star, Flame,
  Sun, Moon, Cloud, Mic, Headphones, Tv, MonitorPlay, Camera, Image as ImageIcon,
  Bell, Award, Bookmark, Clock, MapPin, Globe, Lightbulb, Compass, Feather,
  Crown, ScrollText, Speaker, Users, MessageCircle, Hand, ListMusic, FileText,
  PlayCircle, Drum,
  HandHeart, HeartHandshake, BookHeart, BookmarkCheck, Cake, Gift, Users2,
  Megaphone, Coffee, Building2, Anchor, Sprout, Handshake, Wind, Droplet,
  Wheat, Grape, Trees, Soup, Wine, Flag, Mountain, Eye, Music2, Quote, Album,
  Tent, FolderOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavItemDef {
  href: string;
  label: string;
  defaultIconId: string;
  /** Hex color used for the icon pill in the sidebar (inactive state). */
  color: string;
  /** Default emoji shown in place of the icon when emoji mode is on. */
  emoji: string;
}

/** The fixed list of routes that appear in the sidebar.  Order is fixed —
 *  customisation only changes the icon, not the position or destination. */
export const DEFAULT_NAV_ITEMS: readonly NavItemDef[] = [
  { href: "/",             label: "Bible",             defaultIconId: "Book",          color: "#f59e0b", emoji: "📖" },
  { href: "/songs",        label: "Songs",             defaultIconId: "Music",         color: "#a855f7", emoji: "🎵" },
  { href: "/custom",       label: "Custom Text",       defaultIconId: "Type",          color: "#06b6d4", emoji: "✏️" },
  { href: "/themes",       label: "Themes",            defaultIconId: "Palette",       color: "#ec4899", emoji: "🎨" },
  { href: "/media",        label: "Media & Broadcast", defaultIconId: "Video",         color: "#ef4444", emoji: "🎥" },
  { href: "/schedule",     label: "Schedule",          defaultIconId: "Calendar",      color: "#22c55e", emoji: "📅" },
  { href: "/notes",        label: "Sermon Notes",      defaultIconId: "BookOpen",      color: "#f97316", emoji: "📝" },
  { href: "/inspiration",  label: "Daily Inspiration", defaultIconId: "Sparkles",      color: "#eab308", emoji: "✨" },
  { href: "/teachings",    label: "Teachings",         defaultIconId: "GraduationCap", color: "#3b82f6", emoji: "🎓" },
  { href: "/prayer-wall",  label: "Prayer Wall",       defaultIconId: "HandHeart",     color: "#f43f5e", emoji: "🙏" },
  { href: "/hymn-number",  label: "Hymn Number",       defaultIconId: "Music2",        color: "#8b5cf6", emoji: "🎶" },
  { href: "/countdown",    label: "Countdown",         defaultIconId: "Clock",         color: "#14b8a6", emoji: "⏱️" },
  { href: "/games",        label: "Bible Games",       defaultIconId: "Gamepad2",      color: "#84cc16", emoji: "🎮" },
  { href: "/ai",           label: "AI Features",       defaultIconId: "Sparkles",      color: "#6366f1", emoji: "🤖" },
  { href: "/library",      label: "Media Library",     defaultIconId: "FolderOpen",    color: "#10b981", emoji: "🗂️" },
  { href: "/how-to",       label: "How To",            defaultIconId: "HelpCircle",    color: "#0ea5e9", emoji: "💡" },
  { href: "/settings",     label: "Settings",          defaultIconId: "Settings",      color: "#94a3b8", emoji: "⚙️" },
] as const;

/** Curated palette of icons users can pick from when customising the menu. */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Book, Music, Type, Palette, Video, Calendar, BookOpen, Sparkles,
  GraduationCap, Gamepad2, HelpCircle, Settings,
  Cross, Church, Heart, HandHeart, HeartHandshake, BookHeart, Crown, Hand,
  Flame, Star, ScrollText, Feather, Quote, Anchor, Eye, Wind, Droplet,
  Sprout, Wheat, Grape, Trees, Mountain, Tent, Wine,
  Users, Users2, MessageCircle, Handshake, Megaphone, Gift, Cake, Soup,
  Coffee, Building2, Flag, MapPin, Globe, Compass, Lightbulb,
  Sun, Moon, Cloud, Clock, Bell, Bookmark, BookmarkCheck, Award,
  Mic, Headphones, Speaker, Tv, MonitorPlay, Camera, Image: ImageIcon,
  PlayCircle, Drum, ListMusic, Music2, Album, FileText, FolderOpen,
};

/** Stable list of icon ids in display order for the picker. */
export const ICON_CHOICES: string[] = Object.keys(ICON_REGISTRY);

/** Per-route overrides.  Keyed by `NavItemDef.href`. */
export type MenuOverrides = Record<string, { iconId?: string; emoji?: string }>;

const STORAGE_KEY = "wf-menu-overrides";
export const EMOJI_MODE_KEY = "wf-emoji-mode";

/** React hook — read/write the local menu-icon overrides. */
export function useMenuCustomization() {
  const [overrides, setOverrides] = useLocalStorage<MenuOverrides>(STORAGE_KEY, {});

  const setIcon = (href: string, iconId: string | undefined) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (!iconId) {
        const { iconId: _removed, ...rest } = next[href] ?? {};
        if (Object.keys(rest).length === 0) delete next[href];
        else next[href] = rest;
      } else {
        next[href] = { ...next[href], iconId };
      }
      return next;
    });
  };

  const resetItem = (href: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[href];
      return next;
    });
  };
  const resetAll = () => setOverrides({});

  return { overrides, setIcon, resetItem, resetAll };
}

/** Hook to read/write the emoji-mode preference. */
export function useEmojiMode() {
  return useLocalStorage<boolean>(EMOJI_MODE_KEY, false);
}

/** Look up the icon component for an icon id, falling back to Book if the
 *  id is unknown (e.g. an old preference from a previous version). */
export function getIconComponent(iconId: string): LucideIcon {
  return ICON_REGISTRY[iconId] ?? Book;
}

/** Resolve the effective icon id for a nav item, applying any user override. */
export function effectiveIconId(item: NavItemDef, overrides: MenuOverrides): string {
  return overrides[item.href]?.iconId ?? item.defaultIconId;
}

/** Resolve the effective emoji for a nav item, applying any user override. */
export function effectiveEmoji(item: NavItemDef, overrides: MenuOverrides): string {
  return overrides[item.href]?.emoji ?? item.emoji;
}
