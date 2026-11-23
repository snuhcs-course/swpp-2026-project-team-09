/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactNode } from 'react';
import { space, text } from '@/design-system';
import { AI_INPUT } from '../layout';
import type { Raising } from './raise-handle';

// What the frame's card, docked and open, shares (moved out of `frame-card.tsx` for its length).

// Above the first of the card's parts.
export const CONTENT_TOP = space[5];

export interface FrameCardProps {
  // From the stage's bottom: the room the card keeps under its content.
  barRoom: number;
  // The stage's height, null until it is laid out: the card takes at most about half of it.
  stageHeight: number | null;
  onHeight: (height: number) => void;
  testID: string;
  // Keeps the content's height, while a reply is on its way.
  hold?: boolean;
  // The handle that raises the card up to the pill and lowers it again. Left out, the card has one height.
  raising?: Raising;
  // ✕ at the right end of the header's row, which closes the answer (P04 ticket 52). Left out, none.
  onClose?: () => void;
  // "＋ 새 대화" just left of ✕. Left out, none.
  onAskNew?: () => void;
  // The small label under the grip: what a drag up brings ("11곳 목록"). Left out or null, none.
  gripLabel?: string | null;
  // The history chip at the left of the header's row. Left out or null, none.
  chip?: ReactNode;
  // Told the most the scrolling part may take at the card's height now, so that a list in it can end above the input
  // and scroll inside itself.
  onContentCap?: (cap: number | null) => void;
  // The time bar's height, which the raised card stops under. Left out, none.
  timeBarHeight?: number;
  // Nothing to read: one rounded row around the input, inset from the sides, with the handle (board 10).
  docked?: boolean;
  // The AI input's bottom from the stage's bottom, which the docked card's edge stands just under.
  inputBottom?: number;
  // The docked form's content; left out, the children (P04 ticket 54).
  dock?: ReactNode;
  // Null leaves the card empty.
  children: ReactNode;
}

// The most the card's content takes, about half the stage, null until the stage is laid out. It never takes less
// than the headline's line and one row of follow-ups, which is all it shows while the keyboard is up and leaves little
// of the stage.
const FOLLOW_UP_ROW = 32;
export const LEAST_CONTENT = CONTENT_TOP + text.title.lineHeight + space[3] + FOLLOW_UP_ROW;

export function contentMaxOf(stageHeight: number | null, barRoom: number): number | null {
  return stageHeight === null ? null : Math.max(LEAST_CONTENT, stageHeight / 2 - barRoom);
}

export const LOWERED: Raising = {
  raised: false,
  setRaised: () => {
    // A card without the handle stays lowered.
  },
};

// The bottom sheet's content inset from the screen's sides, in every state, and the time bar's: everything in it starts
// and ends on it, and ✕, the stop button, and the input end on it (P04 ticket 52).
export const OPEN_EDGE = AI_INPUT.side;
