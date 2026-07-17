"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, LogOut, User, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/downloads": "Downloads",
  "/downloads/new": "New Download",
  "/videos": "Video Library",
  "/audios": "Audio Library",
  "/media": "Media Browser",
  "/logs": "Logs",
  "/settings": "Settings",
  "/settings/users": "User Management",
};

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const title =
    pageTitles[pathname] ||
    Object.entries(pageTitles).find(([key]) => key !== "/" && pathname.startsWith(key))?.[1] ||
    "Sidra";

  return (
    <header className="h-16 glass border-b border-slate-700/20 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Page Title */}
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:block w-64">
          <Input
            placeholder="Search..."
            icon={<Search className="h-4 w-4" />}
            className="h-9 text-sm bg-navy-900/50"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-700/50 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-blue" />
        </button>

        {/* User Menu */}
        <DropdownMenu
          trigger={
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-navy-700/50 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-emerald flex items-center justify-center text-xs font-bold text-white">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="hidden md:block text-sm text-slate-300">
                {user?.username || "User"}
              </span>
            </div>
          }
        >
          <div className="px-4 py-3 border-b border-slate-700/30">
            <p className="text-sm font-medium text-slate-200">{user?.username}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <DropdownMenuItem icon={<User className="h-4 w-4" />}>Profile</DropdownMenuItem>
          <DropdownMenuItem icon={<Settings className="h-4 w-4" />}>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={<LogOut className="h-4 w-4" />} danger onClick={() => logout()}>
            Logout
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </header>
  );
}
