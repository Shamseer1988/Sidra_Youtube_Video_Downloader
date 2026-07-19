"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navSections, isNavActive, type NavItem } from "@/lib/navigation";
import { useUIStore } from "@/lib/ui-store";
import { storageTotals, appVersion } from "@/lib/mock-data";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/"
      className="flex h-16 shrink-0 items-center gap-3 border-b border-stroke px-4"
      aria-label="SidraMedia — home"
    >
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30">
        <Play className="h-4 w-4 fill-white text-white" />
        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="whitespace-nowrap text-lg font-bold tracking-tight text-foreground"
          >
            Sidra<span className="gradient-text">Media</span>
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

function SidebarLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isNavActive(pathname, item);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors duration-200",
        active
          ? "text-foreground"
          : "text-muted hover:bg-surface-2 hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-secondary" />
      )}
      <Icon
        className={cn(
          "relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110",
          active ? "text-primary" : "text-muted-2 group-hover:text-foreground"
        )}
      />
      {!collapsed && (
        <span className="relative z-10 truncate text-sm font-medium">{item.label}</span>
      )}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function StorageRing({ collapsed }: { collapsed: boolean }) {
  const { usedPercent, usedTb, capacityTb, nasName } = storageTotals;
  const r = 20;
  const c = 2 * Math.PI * r;

  const ring = (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" className="stroke-surface-3" />
        <motion.circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          stroke="url(#storage-ring-gradient)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * usedPercent) / 100 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="storage-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
        {usedPercent}%
      </span>
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center py-2">{ring}</div>
        </TooltipTrigger>
        <TooltipContent side="right">
          {usedTb} TB / {capacityTb} TB used
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="glass-card flex items-center gap-3 p-3">
      {ring}
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted">Storage Usage</p>
        <p className="text-sm font-semibold text-foreground">
          {usedTb} TB <span className="font-normal text-muted-2">/ {capacityTb} TB</span>
        </p>
        <p className="truncate text-[10px] text-muted-2">NAS: {nasName}</p>
      </div>
    </div>
  );
}

function SystemStatus({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="flex justify-center py-2" aria-label="All systems online">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
      </div>
    );
  }

  return (
    <div className="glass-card flex items-center gap-3 p-3">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
      </span>
      <div>
        <p className="text-[11px] font-medium text-muted">System Status</p>
        <p className="text-xs font-semibold text-success">All Systems Online</p>
      </div>
    </div>
  );
}

function SidebarBody({
  collapsed,
  isAdmin,
  onNavigate,
}: {
  collapsed: boolean;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Primary">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("space-y-2 border-t border-stroke px-3 py-3", collapsed && "px-2")}>
        <StorageRing collapsed={collapsed} />
        <SystemStatus collapsed={collapsed} />
        {!collapsed && (
          <p className="px-1 pt-1 text-[10px] text-muted-2">
            SidraMedia <span className="text-muted">{appVersion}</span>
          </p>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar (desktop) + mobile drawer                                  */
/* ------------------------------------------------------------------ */

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useUIStore();

  return (
    <>
      {/* Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 76 : 248 }}
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
        className="glass sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-stroke lg:flex"
      >
        <Logo collapsed={sidebarCollapsed} />
        <SidebarBody collapsed={sidebarCollapsed} isAdmin={isAdmin} />
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center gap-2 border-t border-stroke py-2.5 text-muted-2 transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              aria-hidden
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="glass fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-stroke lg:hidden"
              aria-label="Navigation menu"
            >
              <div className="relative">
                <Logo collapsed={false} />
                <button
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close menu"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-2 hover:bg-surface-2 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarBody
                collapsed={false}
                isAdmin={isAdmin}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
