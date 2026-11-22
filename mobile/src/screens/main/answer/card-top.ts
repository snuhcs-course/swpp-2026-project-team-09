/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import type { ChatSheetControl } from '../chat-sheet';
import { listWordsOf } from './answer-caption';
import type { QuestionsOpen } from './card-questions';
import type { GripWords } from './grip-row';
import type { Raising } from './raise-handle';

// The answer card's top (P04 ticket 52): ✕, the line under the grip, "＋ 새 질문", and the room the list of questions
// may take.

export const LOWER_WORDS = '내리기';

// The list never takes less than about two rows, and keeps the content's padding above and below it.
const LIST_LEAST = 120;
const LIST_PADDING = 24;

interface CardTop {
  onClose: (() => void) | undefined;
  gripWords: GripWords | null;
  onContentCap: (cap: number | null) => void;
  // "＋ 새 질문": the answer closed as ✕ closes it, then the cursor in the main map's input.
  askNew: () => void;
  // The list of questions' most height: what the card's scrolling part takes now, so that it ends above the input.
  listMax: number | undefined;
}

// Docked, the line under the grip raises the card ("올리면 N곳 목록 ⌃"); raised or full, "내리기 ⌄" takes it one step
// down, as a press on the grip does. While the earlier questions are open, the places' line has nothing to say: none
// lowered, "내리기 ⌄" raised.
function gripWordsOf(control: ChatSheetControl, raising: Raising, listOpen: boolean): GripWords | null {
  if (!raising.raised) {
    const words = listOpen ? null : listWordsOf(control);
    return words === null ? null : { ...words, way: 'up' };
  }
  return {
    words: LOWER_WORDS,
    way: 'down',
    onPress: () => {
      if (raising.stepDown !== undefined) {
        raising.stepDown();
      } else if (raising.full === true && raising.setFull !== undefined) {
        raising.setFull(false);
      } else {
        raising.setRaised(false);
      }
    },
  };
}

export function useCardTop(
  control: ChatSheetControl,
  raising: Raising,
  list: QuestionsOpen,
  onClose: () => void,
): CardTop {
  const [cap, setCap] = useState<number | null>(null);
  return {
    onClose: raising.close,
    gripWords: gripWordsOf(control, raising, list.open),
    onContentCap: setCap,
    askNew: () => {
      list.close();
      onClose();
      control.focusInput();
    },
    listMax: cap === null ? undefined : Math.max(LIST_LEAST, cap - LIST_PADDING),
  };
}
