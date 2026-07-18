"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart, Clock, ListVideo, Settings, Users, LogOut, ChevronRight, ShieldCheck,
} from "lucide-react";
import { useUser } from "@/components/providers/user-provider";
import { apiSend } from "@/lib/client-api";

// "My Stuff" — hub page (main target of the mobile bottom nav).
export default function MyStuffPage() {
  const user = useUser();
  const router = useRouter();

  async function logout() {
    await apiSend("POST", "/api/auth/logout").catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  const links = [
    { href: "/favorites", label: "Favorites", icon: Heart, tone: "text-red-400" },
    { href: "/watch-later", label: "Watch Later", icon: Clock, tone: "text-accent-amber" },
    { href: "/playlists", label: "Playlists", icon: ListVideo, tone: "text-accent-blue" },
    { href: "/settings", label: "Settings", icon: Settings, tone: "text-slate-400" },
    ...(user.role === "admin"
      ? [{ href: "/users", label: "User Management", icon: Users, tone: "text-accent-purple" }]
      : []),
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Profile card */}
      <div className="glass-card p-6 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
          style={{ background: user.avatarColor }}
        >
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-100 truncate">{user.username}</h1>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
          <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-accent-blue capitalize">
            <ShieldCheck className="h-3 w-3" /> {user.role}
          </span>
        </div>
      </div>

      {/* Links */}
      <div className="glass-card overflow-hidden divide-y divide-slate-700/20">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-4 px-5 py-4 hover:bg-navy-700/40 active:bg-navy-700/60 transition-colors"
            >
              <Icon className={`h-5 w-5 ${l.tone}`} />
              <span className="flex-1 text-sm font-medium text-slate-200">{l.label}</span>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </Link>
          );
        })}
      </div>

      <button
        onClick={logout}
        className="w-full glass-card flex items-center justify-center gap-2 px-5 py-4 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
}
