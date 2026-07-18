"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, LogOut, ChevronDown } from "lucide-react";
import { apiSend } from "@/lib/client-api";
import type { CurrentUser } from "@/lib/types";

const titles: Record<string, string> = {
  "/": "Home",
  "/videos": "Videos",
  "/music": "Music",
  "/downloads": "Downloads",
  "/favorites": "Favorites",
  "/watch-later": "Watch Later",
  "/playlists": "Playlists",
  "/users": "User Management",
  "/settings": "Settings",
  "/my": "My Stuff",
  "/watch": "Now Playing",
};

export function Header({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title =
    titles[pathname] ||
    Object.entries(titles).find(([k]) => k !== "/" && pathname.startsWith(k))?.[1] ||
    "Sidra Media";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await apiSend("POST", "/api/auth/logout").catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/videos?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="h-16 glass border-b border-slate-700/20 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>

      <div className="flex items-center gap-3">
        <form onSubmit={submitSearch} className="hidden sm:block relative w-52 lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your library…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-navy-900/60 border border-slate-600/30 text-sm text-slate-200 placeholder-slate-500 focus:border-accent-blue/50 focus:outline-none"
          />
        </form>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-navy-700/50 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: user.avatarColor }}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm text-slate-300">{user.username}</span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 glass-card overflow-hidden shadow-xl">
              <div className="px-4 py-3 border-b border-slate-700/30">
                <p className="text-sm font-medium text-slate-200">{user.username}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                <p className="text-[10px] text-accent-blue mt-1 capitalize">{user.role}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
