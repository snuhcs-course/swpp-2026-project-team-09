/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { space } from '@/design-system';
import { roomsOf, type ViewArea } from '@/features/assistant/answer-camera';
import type { AnswerDrawing } from '@/features/assistant/answer-marks';
import type { FitPadding, Size } from '@/map';
import { ANSWER_PILL, listsTop } from './layout';

const SIDE = 64;
// Between the area an answer's labels stay in and what covers the map at the top and at the bottom, and the edges.
const CLEAR = space[2];
const EDGE = space[4];

// What covers the map at the top under a status bar `top` high: the answer's pill with its time bar `timeBar` high
// under it (0 for none) or, for a received invitation, which has none, the status bar alone.
function coveredTop(top: number, pill: boolean, timeBar: number): number {
  return pill ? top + listsTop(top) + ANSWER_PILL.height + (timeBar > 0 ? space[2] + timeBar : 0) : top;
}

// What covers the map at the top and the card at the bottom, each with the clear room of the labels' area
// (`labelArea`) and the room the drawing's marks there need.
export function paddingOf(
  top: number,
  cardHeight: number | null,
  drawing: AnswerDrawing,
  pill: boolean,
  timeBar = 0,
): FitPadding {
  const { above, below } = roomsOf(drawing);
  return {
    top: coveredTop(top, pill, timeBar) + CLEAR + above,
    right: SIDE,
    bottom: (cardHeight ?? 0) + CLEAR + below,
    left: SIDE,
  };
}

// The area of a view `size` high and wide that an answer's labels stay in: 8 under the pill or the status bar, 8 over
// the card, and 16 from each side.
export function labelArea(top: number, cardHeight: number | null, size: Size, pill: boolean, timeBar = 0): ViewArea {
  return {
    top: coveredTop(top, pill, timeBar) + CLEAR,
    right: size.width - EDGE,
    bottom: size.height - (cardHeight ?? 0) - CLEAR,
    left: EDGE,
  };
}
