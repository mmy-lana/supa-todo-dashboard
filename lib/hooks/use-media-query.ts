'use client';

import { useEffect, useState } from 'react';

/**
 * Phase 4 (reactive state support) — viewport media query hook.
 *
 * SSR-safe `matchMedia` subscription: returns `false` during server/prerender
 * rendering, then tracks live changes once mounted in the browser. Prefer
 * CSS breakpoints for layout; use this only where JavaScript must branch on
 * viewport (e.g. drawer behaviour, FAB visibility).
 */

export function useMediaQuery(query: string): boolean {
  const getMatches = (): boolean =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false;

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);

    // Sync in case the first render happened before the effect ran.
    setMatches(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

/** `true` on viewports narrower than 768px (plan tablet breakpoint). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/** `true` on viewports 1024px and wider (plan desktop breakpoint). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/** `true` when the device reports a coarse primary pointer (touch). */
export function useIsCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}