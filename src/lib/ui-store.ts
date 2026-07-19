"use client";

import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
}

/** Cross-component UI state (sidebar, mobile drawer, command palette). */
export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  commandOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
