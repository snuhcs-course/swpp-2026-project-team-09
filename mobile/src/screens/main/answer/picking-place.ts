/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef } from 'react';
import type { GripPlace, TimeCardGrip } from './time-card-grip';

// The time card's place around picking people (P04 ticket 64): picking opens it, and leaving picking, by 완료, 취소, or
// back, puts it back where it stood before "＋ 같이", folded if it was folded and open if it was open. Tucked away, it
// comes back shown, so that the band just changed stays in sight (the user's phone, 2026-11-25).
export function placeAfterPicking(before: GripPlace): GripPlace {
  return before === 'tucked' || before === 'behind' ? 'shown' : before;
}

// Started with picking already on, as when the card comes back after the keyboard hid it, the place to go back to is
// the one the card stands at then. While picking, the card touched last wins and the other yields, and a yield is not
// undone by itself (the user's phone, 2026-11-26): the sheet standing high folds the rows, the head with 취소 · 완료
// staying, and they stay folded when it comes back down until the grip brings them back. The fold is held while the
// sheet is high, not only as it gets there: an opening still on its way then (`useFoldUnder` misses it) is folded as
// soon as it arrives. A card that moves, under the finger or settling, is left to finish.
export function usePickingPlace(
  picking: boolean,
  grip: Pick<TimeCardGrip, 'place' | 'moving' | 'settleTo'>,
  sheetHigh: boolean,
): void {
  const before = useRef<GripPlace | null>(null);
  const { place, moving, settleTo } = grip;
  useEffect(() => {
    if (picking && before.current === null) {
      before.current = place;
      settleTo('open');
    } else if (!picking && before.current !== null) {
      settleTo(placeAfterPicking(before.current));
      before.current = null;
    } else if (picking && sheetHigh && place === 'open' && !moving) {
      settleTo('shown');
    }
  });
}
