"use client";

import { useEffect, useState } from "react";

/** True after first client render — avoids hydration mismatches for time/theme UI. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
