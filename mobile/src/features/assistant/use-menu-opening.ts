/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';

interface MenuOpening {
  openMenu: (planId: string) => void;
  closeMenu: () => void;
}

// Opens the menu of a Plan, which it shows, and closes it again, over the answer on screen's state (moved out of
// `use-shown-answer.ts` for its length).
export function useMenuOpening<S extends { menu: boolean }>(
  setStored: (update: (last: S) => S) => void,
  show: (planId: string) => void,
): MenuOpening {
  const openMenu = useCallback(
    (planId: string): void => {
      show(planId);
      setStored((last) => (last.menu ? last : { ...last, menu: true }));
    },
    [setStored, show],
  );
  const closeMenu = useCallback((): void => {
    setStored((last) => (last.menu ? { ...last, menu: false } : last));
  }, [setStored]);
  return { openMenu, closeMenu };
}
