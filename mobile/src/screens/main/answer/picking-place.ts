/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef } from 'react';
import type { GripPlace, TimeCardGrip } from './time-card-grip';

// The time card's place around picking people (P04 ticket 64): picking opens it, and leaving picking, by 완료, 취소, or
// back, puts it back where it stood before "＋ 같이", folded if it was folded and open if it was open. Tucked away, it
// comes back shown, so that the band just changed stays in sight (the user's phone, 2026-11-25).
export function placeAfterPicking(before: GripPlace): GripPlace {
  return before === 'tucked' ? 'shown' : before;
}

// Started with picking already on, as when the card comes back after the keyboard hid it, the place to go back to is
// the one the card stands at then. While picking, the rows follow the answer's sheet by its step, not by which move
// came last (the user's phone, 2026-11-25): open at rest while the sheet stands high, they fold, the head with 취소 ·
// 완료 staying; each time its step leaves high they open again. The fold is held while the sheet is high, not only as
// it gets there: an opening still on its way then (`useFoldUnder` misses it) is folded as soon as it arrives. A card
// that moves, under the finger or settling, is left to finish.
export function usePickingPlace(
  picking: boolean,
  grip: Pick<TimeCardGrip, 'place' | 'moving' | 'settleTo'>,
  sheetHigh: boolean,
): void {
  const before = useRef<GripPlace | null>(null);
  const wasHigh = useRef(sheetHigh);
  const { place, moving, settleTo } = grip;
  useEffect(() => {
    if (picking && before.current === null) {
      before.current = place;
      settleTo('open');
    } else if (!picking && before.current !== null) {
      settleTo(placeAfterPicking(before.current));
      before.current = null;
    } else if (picking && wasHigh.current && !sheetHigh) {
      settleTo('open');
    } else if (picking && sheetHigh && place === 'open' && !moving) {
      settleTo('shown');
    }
    wasHigh.current = sheetHigh;
  });
}
