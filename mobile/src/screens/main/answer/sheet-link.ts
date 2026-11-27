/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createContext, use, useMemo } from 'react';
import { type SharedValue, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { heightOf, type Level, type LevelHeights } from './card-levels';
import type { Raising } from './raise-handle';
import { type TopStops, useTopStops } from './top-stops';

// The answer sheet as the time card over it sees it (P04 ticket 61): only one of the two is expanded at a time, and the
// card touched last wins. A pull that opens the time card while the sheet is high brings the sheet down with the
// finger, at none of the pull high and all of it middle, so that its top edge stays under the growing card; let go
// open, the sheet rests at middle, where it stays when the time card folds, and let go short of it, back at high.
// The other way, the sheet moved up from middle while the time card is open folds the time card with it, open at
// middle and folded at high, through the run after a let-go too; arrived at high, the time card rests folded, and
// back at middle, open. One card leads at a time, on the UI thread, and the other only follows: a gesture on the
// follower is let pass until the leader's move ends. So the time card's grip is never under the sheet.

export interface SheetLink {
  high: boolean;
  onOpen: () => void;
  // How far the time card is pulled open, 0 to 1, as its grip writes it on the UI thread, and whether the sheet
  // follows it: not (0), with the finger (1), or let go short of open, back to high (2). Only a pull that starts with
  // the sheet high moves it.
  pull?: SharedValue<number>;
  following?: SharedValue<number>;
  // Where the sheet stands between middle (0) and high (1), as it writes it on the UI thread, and whether its own move
  // leads (1): from when a drag takes it until the run after the let-go arrives.
  rise?: SharedValue<number>;
  sheetLeads?: SharedValue<number>;
  // How far the top is folded (P01 ticket 22): the steps card and the time card, then the steps card, then a tab.
  top?: TopStops;
}

function nothing(): void {
  // No sheet under the time card.
}

export const SheetLinkContext = createContext<SheetLink>({ high: false, onOpen: nothing });

export function useSheetLink({ level, setLevel }: Pick<Raising, 'level' | 'setLevel'>): SheetLink {
  const pull = useSharedValue(0);
  const following = useSharedValue(0);
  const rise = useSharedValue(0);
  const sheetLeads = useSharedValue(0);
  const top = useTopStops();
  return useMemo(
    () => ({
      high: level === 'high',
      onOpen: (): void => {
        if (level === 'high') {
          setLevel('mid');
        }
      },
      pull,
      following,
      rise,
      sheetLeads,
      top,
    }),
    [level, setLevel, pull, following, rise, sheetLeads, top],
  );
}

// The sheet's side of the link, on the UI thread: where it stands between middle and high, for the time card, and its
// place while it follows a pull of the time card, from its offset at high to its offset at middle; only a sheet that
// stands high follows.
export function useFollowPull(
  offset: SharedValue<number>,
  level: Level,
  { heights, room }: { heights: LevelHeights | null; room: number | null },
): void {
  const { pull, following, rise } = use(SheetLinkContext);
  const at = (step: Level): number | null =>
    heights === null || room === null ? null : room - heightOf(step, heights);
  const highAt = at('high');
  const midAt = at('mid');
  const high = level === 'high' ? highAt : null;
  const mid = level === 'high' ? midAt : null;
  useAnimatedReaction(
    () => offset.value,
    (place) => {
      if (rise !== undefined && highAt !== null && midAt !== null && midAt > highAt) {
        rise.value = Math.min(1, Math.max(0, (midAt - place) / (midAt - highAt)));
      }
    },
    [highAt, midAt],
  );
  useAnimatedReaction(
    () => ((following?.value ?? 0) > 0 && pull !== undefined ? pull.value : null),
    (share) => {
      if (share === null || high === null || mid === null || following === undefined) {
        return;
      }
      offset.value = high + share * (mid - high);
      if (share <= 0 && following.value === 2) {
        following.value = 0;
      }
    },
    [high, mid],
  );
}
