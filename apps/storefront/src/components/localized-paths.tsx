'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Per-locale, locale-PREFIX-LESS paths for the current entity page, e.g.
// { en: '/catalogue/bath-towels', tr: '/catalogue/banyo-havlulari' }. Set by the
// page (which knows the localized slugs); read by the header's LocaleSwitcher so
// switching language navigates to the right localized URL instead of reusing the
// current slug (which 404s when slugs differ per locale). Empty on pages with no
// localized slug (the switcher then just keeps the current pathname).
type LocalizedPaths = Record<string, string>;

interface Ctx {
  paths: LocalizedPaths;
  setPaths: (paths: LocalizedPaths | null) => void;
}

const LocalizedPathsContext = createContext<Ctx | null>(null);

export function LocalizedPathsProvider({ children }: { children: ReactNode }) {
  const [paths, setPaths] = useState<LocalizedPaths>({});
  const value = useMemo(
    () => ({ paths, setPaths: (p: LocalizedPaths | null) => setPaths(p ?? {}) }),
    [paths],
  );
  return <LocalizedPathsContext.Provider value={value}>{children}</LocalizedPathsContext.Provider>;
}

// The switcher reads this: the current page's per-locale paths (empty if none).
export function useLocalizedPaths(): LocalizedPaths {
  return useContext(LocalizedPathsContext)?.paths ?? {};
}

// Rendered by an entity page to publish its per-locale paths for the switcher.
// Clears them on unmount so a subsequent non-entity page falls back to the
// default (keep-current-path) behaviour.
export function RegisterLocalizedPaths({ paths }: { paths: LocalizedPaths }) {
  const ctx = useContext(LocalizedPathsContext);
  // Serialize so the effect only re-runs when the actual paths change.
  const key = JSON.stringify(paths);
  useEffect(() => {
    ctx?.setPaths(paths);
    return () => ctx?.setPaths(null);
    // Re-run only when the paths actually change (compared via `key`).
  }, [key]);
  return null;
}
