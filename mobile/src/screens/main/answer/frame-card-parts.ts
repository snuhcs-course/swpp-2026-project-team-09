/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactNode } from 'react';
import { space, text } from '@/design-system';
import { AI_INPUT } from '../layout';
import type { Raising } from './raise-handle';

// What the frame's card shares (moved out of `frame-card.tsx` for its length).

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
  // Brings the content to its top each time it turns true.
  atTop?: boolean;
  // A layer over the content, such as a restaurant's menu over the list of candidates, by an id, and the answer it is
  // of: it opens at its top, and closing it brings the content back where it was (P04 ticket 78). Left out, none.
  layer?: string | null;
  layerOf?: object | null;
  // The card's step, low, middle, or high (P04 ticket 61). Left out, the card has one height.
  raising?: Raising;
  // ✕ at the right end of the header's row, which closes the answer (P04 ticket 52). Left out, none.
  onClose?: () => void;
  // "＋ 새 대화" just left of ✕. Left out, none.
  onAskNew?: () => void;
  // The history chip at the left of the header's row. Left out or null, none.
  chip?: ReactNode;
  // While the bar of several requests stands at the top, its height with the bar of the Plan shown under it: measured,
  // its words wrapping. High stands under it where it reaches lower than the folded time card's place (PR 553's
  // review). Left out, none.
  stepsTop?: number;
  // Low shows the content whole up to the middle step, as while the keyboard is up.
  fit?: boolean;
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
  level: 'low',
  setLevel: () => {
    // A card without steps stays as it is.
  },
};

// The bottom sheet's content inset from the screen's sides, in every state, and the time bar's: everything in it starts
// and ends on it, and ✕, the stop button, and the input end on it (P04 ticket 52).
export const OPEN_EDGE = AI_INPUT.side;
