/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, text } from '@/design-system';
import { listsTop } from '../layout';
import type { LevelHeights } from './card-levels';
import { contentMaxOf, type FrameCardProps, LEAST_CONTENT } from './frame-card-parts';

// The answer sheet's steps as heights (moved out of `open-card.tsx` for its length, P04 ticket 61): low shows the header
// and about two lines of the content; middle has the card's top edge at half the screen; high stands just under the time
// card.

// Low shows this many lines of the content's words, at the phone's font size, over the fade.
const LOW_LINES = 2;
// The soft edge where the content passes under the footer.
export const FADE = space[3];

export interface Caps extends LevelHeights {
  // The scrolling part's laid-out height: the highest step's.
  room: number;
}

// The most the scrolling part shows at each step, under the card's header (`above`); null until the stage is laid out.
// No step reads how much the answer says: a card shorter than a step stops at its own height (`heightsOf`).
export function useCaps(props: FrameCardProps, above: number, padTop: number): Caps | null {
  const { stageHeight, barRoom, raising, timeBarHeight = 0, fit = false } = props;
  const { top } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  if (stageHeight === null) {
    return null;
  }
  if (raising === undefined) {
    const half = Math.max(LEAST_CONTENT, (contentMaxOf(stageHeight, barRoom) ?? LEAST_CONTENT) - above);
    return { low: half, mid: half, high: half, room: half };
  }
  // High stops just under the time card as it stands by default, tucked away or not (h1, h2, k4). Middle's top edge
  // stands at half the screen: the stage runs from under the status bar, `top` high, to the screen's bottom. Where the
  // time card reaches lower than that, middle is high.
  const pillRoom = listsTop(top) + (timeBarHeight > 0 ? timeBarHeight + space[2] : 0);
  const under = stageHeight - pillRoom - barRoom - above;
  const mid = Math.max(LEAST_CONTENT, Math.min(under, (stageHeight + top) / 2 - barRoom - above));
  const high = Math.max(mid, under);
  const low = fit ? mid : Math.min(mid, padTop + LOW_LINES * text.bodyLg.lineHeight * fontScale + FADE);
  return { low, mid, high, room: high };
}

// The heights the card runs to: as much as its content with the fade's room under it, up to each step's cap. A content
// that lays out nothing below its top padding takes no room: the card is its header alone.
export function heightsOf(caps: Caps, natural: number | null, padTop: number): LevelHeights {
  const fit = (cap: number): number => {
    if (natural === null) {
      return cap;
    }
    return natural <= padTop + 0.5 ? 0 : Math.min(cap, natural + FADE);
  };
  const high = fit(caps.high);
  const mid = Math.min(fit(caps.mid), high);
  return { low: Math.min(fit(caps.low), mid), mid, high };
}
