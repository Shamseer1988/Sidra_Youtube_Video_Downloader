"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Clapperboard,
  Music,
  DownloadCloud,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Prime Video-style bottom tab bar, mobile only.
const tabs = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/videos", label: "Videos", icon: Clapperboard },
  { href: "/music", label: "Music", icon: Music },
  { href: "/downloads", label: "Downloads", icon: DownloadCloud },
  { href: "/my", label: "My Stuff", icon: LayoutGrid },
];

export function BottomNav({ isAdmin: _isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-slate-700/20 safe-bottom">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 pt-2.5 pb-2 flex-1 transition-colors",
                active ? "text-white" : "text-slate-500 active:text-slate-300",
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "text-accent-blue")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={cn("text-[10px] leading-none", active && "font-semibold")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
