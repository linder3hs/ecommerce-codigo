"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Media query como fuente externa: `useSyncExternalStore` da `false` en el
 * servidor y el valor real en el primer commit del cliente, sin el parpadeo ni
 * el aviso de hidratación de un `useState` + `useEffect`.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);

      list.addEventListener("change", onChange);

      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [
    query,
  ]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
