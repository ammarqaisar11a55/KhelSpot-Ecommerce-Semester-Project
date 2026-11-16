"use client";

import { use, useEffect, useState } from "react";
import { browser } from "react-dom";

/**
 * Marks a component as browser-only: it reads localStorage and the current
 * time, so its first render can't match prerendered HTML. Its parent must
 * wrap it in <Suspense> with a skeleton fallback.
 */
export function useBrowserOnly(reason = "Reads demo data from localStorage and the current time.") {
  use(browser(reason));
}

/** Current time, refreshed every 30 seconds. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
