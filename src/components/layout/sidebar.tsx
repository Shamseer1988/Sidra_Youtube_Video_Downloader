"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DownloadCloud,
  Clapperboard,
  Music,
  Heart,
  Clock,
  ListVideo,
  Users,
  Settings,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/videos", label: "Videos", icon: Clapperboard },
  { href: "/music", label: "Music", icon: Music },
  { href: "/downloads", label: "Downloads", icon: DownloadCloud },
];

const libraryNav = [
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/watch-later", label: "Watch Later", icon: Clock },
  { href: "/playlists", label: "Playlists", icon: ListVideo },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const NavLink = ({ href, label, icon: Icon, exact }: any) => {
    const active = isActive(href, exact);
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group",
          active
            ? "bg-gradient-to-r from-accent-blue/20 to-accent-purple/10 text-white"
            : "text-slate-400 hover:text-slate-100 hover:bg-navy-700/40",
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-gradient-to-b from-accent-blue to-accent-purple" />
        )}
        <Icon
          className={cn(
            "h-5 w-5 flex-shrink-0",
            active ? "text-accent-blue" : "text-slate-500 group-hover:text-slate-300",
          )}
        />
        {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 hidden md:flex flex-col glass border-r border-slate-700/20 z-40 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[240px]",
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-700/20">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue via-accent-purple to-accent-red flex-shrink-0 shadow-lg shadow-accent-blue/20">
          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-extrabold whitespace-nowrap text-white">
              Sidra<span className="gradient-text">Media</span>
            </h1>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
        <div className="pt-4 pb-1 px-3">
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">
              Library
            </p>
          )}
        </div>
        {libraryNav.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">
                  Admin
                </p>
              )}
            </div>
            <NavLink href="/users" label="Users" icon={Users} />
          </>
        )}
      </nav>

      <div className="px-3 py-2 border-t border-slate-700/20">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-navy-700/40 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
