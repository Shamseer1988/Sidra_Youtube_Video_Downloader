"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  DownloadCloud,
  HelpCircle,
  Info,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiSend } from "@/lib/client-api";
import { useUIStore } from "@/lib/ui-store";
import { useMounted } from "@/hooks/use-mounted";
import { activeDownloads, notifications, type AppNotification } from "@/lib/mock-data";
import type { CurrentUser } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ------------------------------------------------------------------ */

const notificationIcon: Record<AppNotification["kind"], React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  info: <Info className="h-4 w-4 text-accent" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  error: <XCircle className="h-4 w-4 text-danger" />,
};

function IconButton({
  label,
  onClick,
  children,
  badge,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          className="relative rounded-xl border border-transparent p-2.5 text-muted transition-all hover:border-stroke hover:bg-surface-2 hover:text-foreground"
        >
          {children}
          {badge !== undefined && badge > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-1 text-[9px] font-bold text-white shadow-lg shadow-primary/40">
              {badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = !mounted || resolvedTheme === "dark";

  return (
    <IconButton
      label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </IconButton>
  );
}

function NotificationsMenu() {
  const [items, setItems] = useState(notifications);
  const unread = items.filter((n) => n.unread).length;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
              className="relative rounded-xl border border-transparent p-2.5 text-muted transition-all hover:border-stroke hover:bg-surface-2 hover:text-foreground data-[state=open]:border-stroke data-[state=open]:bg-surface-2 data-[state=open]:text-foreground"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-1 text-[9px] font-bold text-white shadow-lg shadow-primary/40">
                  {unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-stroke px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <button
            onClick={() => setItems((all) => all.map((n) => ({ ...n, unread: false })))}
            className="text-xs text-primary transition-opacity hover:opacity-80"
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-1.5">
          {items.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-3",
                n.unread && "bg-primary/5"
              )}
            >
              <span className="mt-0.5 shrink-0">{notificationIcon[n.kind]}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
                <p className="mt-1 text-[10px] text-muted-2">{n.time}</p>
              </div>
              {n.unread && <span className="ml-auto mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();

  async function logout() {
    await apiSend("POST", "/api/auth/logout").catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="flex items-center gap-2.5 rounded-xl border border-transparent py-1.5 pl-1.5 pr-2.5 transition-all hover:border-stroke hover:bg-surface-2 data-[state=open]:border-stroke data-[state=open]:bg-surface-2"
        >
          <Avatar className="h-8 w-8 ring-2 ring-primary/30">
            <AvatarFallback style={{ background: user.avatarColor }}>
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="text-[13px] font-semibold leading-tight text-foreground">
              {user.username}
            </p>
            <p className="text-[10px] capitalize leading-tight text-muted-2">{user.role}</p>
          </div>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-2 sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="text-sm font-medium text-foreground">{user.username}</p>
          <p className="truncate text-xs font-normal text-muted-2">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/settings")}>
          <UserIcon className="h-4 w-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/settings")}>
          <Settings className="h-4 w-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/analytics")}>
          <HelpCircle className="h-4 w-4" /> What&apos;s new
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={logout}>
          <LogOut className="h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ */

export function Topbar({ user }: { user: CurrentUser }) {
  const { setCommandOpen, setMobileNavOpen } = useUIStore();

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
      <div className="glass flex h-14 items-center gap-2 rounded-2xl px-2.5 shadow-lg shadow-black/20 sm:gap-3 sm:px-3">
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
          className="rounded-xl p-2.5 text-muted hover:bg-surface-2 hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search / command palette trigger */}
        <button
          onClick={() => setCommandOpen(true)}
          className="group flex h-10 flex-1 items-center gap-3 rounded-xl border border-stroke bg-surface-2/60 px-3.5 text-left transition-all hover:border-stroke-strong hover:bg-surface-2 sm:max-w-md"
          aria-label="Search (Ctrl+K)"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-2 transition-colors group-hover:text-muted" />
          <span className="flex-1 truncate text-sm text-muted-2">
            Search movies, shows, music, playlists…
          </span>
          <kbd className="hidden shrink-0 items-center gap-1 rounded-md border border-stroke bg-surface-3 px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-2 sm:flex">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <Link href="/downloads" aria-label={`Downloads (${activeDownloads.length} active)`}>
            <span className="relative block rounded-xl border border-transparent p-2.5 text-muted transition-all hover:border-stroke hover:bg-surface-2 hover:text-foreground">
              <DownloadCloud className="h-[18px] w-[18px]" />
              {activeDownloads.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-1 text-[9px] font-bold text-white shadow-lg shadow-primary/40">
                  {activeDownloads.length}
                </span>
              )}
            </span>
          </Link>

          <NotificationsMenu />
          <ThemeToggle />

          <div className="mx-1 hidden h-6 w-px bg-stroke sm:block" />
          <ProfileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
