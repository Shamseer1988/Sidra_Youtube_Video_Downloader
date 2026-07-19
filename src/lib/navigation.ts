import {
  BarChart3,
  Clapperboard,
  Clock,
  DownloadCloud,
  Heart,
  HardDrive,
  LayoutDashboard,
  ListVideo,
  Music,
  Radio,
  Settings,
  Sparkles,
  Tv,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/** Single source of truth for app navigation (sidebar + command palette). */
export const navSections: NavSection[] = [
  {
    label: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/movies", label: "Movies", icon: Clapperboard },
      { href: "/tv-shows", label: "TV Shows", icon: Tv },
      { href: "/music", label: "Music", icon: Music },
      { href: "/downloads", label: "Downloads", icon: DownloadCloud },
      { href: "/live-streams", label: "Live Streams", icon: Radio },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/favorites", label: "Favorites", icon: Heart },
      { href: "/watch-later", label: "Watch Later", icon: Clock },
      { href: "/playlists", label: "Playlists", icon: ListVideo },
      { href: "/recently-added", label: "Recently Added", icon: Sparkles },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/nas", label: "NAS Storage", icon: HardDrive },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/users", label: "Users", icon: Users, adminOnly: true },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
}
