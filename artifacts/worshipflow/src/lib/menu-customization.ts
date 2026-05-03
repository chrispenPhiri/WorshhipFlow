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
  // Expanded "lifelike" church-and-worship palette
  HandHeart, HeartHandshake, BookHeart, BookmarkCheck, Cake, Gift, Users2,
  Megaphone, Coffee, Building2, Anchor, Sprout, Handshake, Wind, Droplet,
  Wheat, Grape, Trees, Soup, Wine, Flag, Mountain, Eye, Music2, Quote, Album,
  Tent,
  type LucideIcon,
} from "lucide-react";

export interface NavItemDef {
  href: string;
  label: string;
  defaultIconId: string;
}

/** The fixed list of routes that appear in the sidebar.  Order is fixed —
 *  customisation only changes the icon, not the position or destination. */
export const DEFAULT_NAV_ITEMS: readonly NavItemDef[] = [
  { href: "/",             label: "Bible",             defaultIconId: "Book" },
  { href: "/songs",        label: "Songs",             defaultIconId: "Music" },
  { href: "/custom",       label: "Custom Text",       defaultIconId: "Type" },
  { href: "/themes",       label: "Themes",            defaultIconId: "Palette" },
  { href: "/media",        label: "Media & Broadcast", defaultIconId: "Video" },
  { href: "/schedule",     label: "Schedule",          defaultIconId: "Calendar" },
  { href: "/notes",        label: "Sermon Notes",      defaultIconId: "BookOpen" },
  { href: "/inspiration",  label: "Daily Inspiration", defaultIconId: "Sparkles" },
  { href: "/teachings",    label: "Teachings",         defaultIconId: "GraduationCap" },
  { href: "/prayer-wall",  label: "Prayer Wall",       defaultIconId: "HandHeart" },
  { href: "/hymn-number",  label: "Hymn Number",       defaultIconId: "Music2" },
  { href: "/countdown",    label: "Countdown",         defaultIconId: "Clock" },
  { href: "/games",        label: "Bible Games",       defaultIconId: "Gamepad2" },
  { href: "/how-to",       label: "How To",            defaultIconId: "HelpCircle" },
  { href: "/settings",     label: "Settings",          defaultIconId: "Settings" },
] as const;

/** Curated palette of icons users can pick from when customising the menu.
 *  Keeping this hand-picked (rather than exposing all of lucide) keeps the
 *  UI tight and keeps every choice on-theme for a worship/church context. */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  // The defaults — listed first so they appear at the top of the picker.
  Book, Music, Type, Palette, Video, Calendar, BookOpen, Sparkles,
  GraduationCap, Gamepad2, HelpCircle, Settings,
  // Faith / worship
  Cross, Church, Heart, HandHeart, HeartHandshake, BookHeart, Crown, Hand,
  Flame, Star, ScrollText, Feather, Quote, Anchor, Eye, Wind, Droplet,
  Sprout, Wheat, Grape, Trees, Mountain, Tent, Wine,
  // Community / outreach
  Users, Users2, MessageCircle, Handshake, Megaphone, Gift, Cake, Soup,
  Coffee, Building2, Flag, MapPin, Globe, Compass, Lightbulb,
  // Time / day-to-day
  Sun, Moon, Cloud, Clock, Bell, Bookmark, BookmarkCheck, Award,
  // AV / production
  Mic, Headphones, Speaker, Tv, MonitorPlay, Camera, Image: ImageIcon,
  PlayCircle, Drum, ListMusic, Music2, Album, FileText,
};

/** Stable list of icon ids in display order for the picker. */
export const ICON_CHOICES: string[] = Object.keys(ICON_REGISTRY);

/** Per-route overrides.  Keyed by `NavItemDef.href`. */
export type MenuOverrides = Record<string, { iconId?: string }>;

const STORAGE_KEY = "wf-menu-overrides";

/** React hook — read/write the local menu-icon overrides. */
export function useMenuCustomization() {
  const [overrides, setOverrides] = useLocalStorage<MenuOverrides>(STORAGE_KEY, {});

  const setIcon = (href: string, iconId: string | undefined) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (!iconId) {
        delete next[href];
      } else {
        next[href] = { ...next[href], iconId };
      }
      return next;
    });
  };

  const resetItem = (href: string) => setIcon(href, undefined);
  const resetAll = () => setOverrides({});

  return { overrides, setIcon, resetItem, resetAll };
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
