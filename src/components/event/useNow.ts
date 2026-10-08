"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Current time, ticking every `ms`. Returns null during server render / hydration
 * so server and client markup match.
 */
export function useNow(ms: number): number | null {
  const subscribe = useMemo(
    () => (cb: () => void) => {
      const id = setInterval(cb, ms);
      return () => clearInterval(id);
    },
    [ms],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / ms) * ms,
    () => null,
  );
}
