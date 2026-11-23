/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import type { ChatSheetControl } from '../chat-sheet';
import type { QuestionsOpen } from './card-questions';
import { listedCount, mealCard } from './meal-list';
import type { Raising } from './raise-handle';

// The answer card's top (P04 ticket 52): ✕, the label under the grip, "＋ 새 대화", and the room the list of questions
// may take.

// The list never takes less than about two rows, and keeps the content's padding above and below it.
const LIST_LEAST = 120;
const LIST_PADDING = 24;

interface CardTop {
  onClose: (() => void) | undefined;
  gripLabel: string | null;
  onContentCap: (cap: number | null) => void;
  // "＋ 새 대화": the answer closed as ✕ closes it, then the cursor in the main map's input.
  onAskNew: () => void;
  // The list of questions' most height: what the card's scrolling part takes now, so that it ends above the input.
  listMax: number | undefined;
}

// The small label under the grip: what a drag up brings, while the sheet shows the answer itself, in every step. For a
// meal answer the list of its places ("11곳 목록"); for a booking on the map the room and the seat ("자리·열람실", P01
// ticket 03). None while the sheet shows something else: the keyboard's view, the earlier questions, the list of
// Friends to add ("＋ 같이"), a restaurant's menu, a mark's card, or a reply on its way; none for any other answer.
export function gripLabelOf(control: ChatSheetControl, elsewhere: boolean): string | null {
  const { answer: shown, booking, steps, chat, mark } = control;
  if (elsewhere || chat.waiting || shown.adding || shown.menuFor !== null || mark !== null) {
    return null;
  }
  if (booking !== null && steps === null) {
    return '자리·열람실';
  }
  return shown.answer !== null && mealCard(shown.answer) ? `${String(listedCount(shown.answer))}곳 목록` : null;
}

export function useCardTop(
  control: ChatSheetControl,
  raising: Raising,
  list: QuestionsOpen,
  { onClose, typing }: { onClose: () => void; typing: boolean },
): CardTop {
  const [cap, setCap] = useState<number | null>(null);
  return {
    onClose: raising.close,
    gripLabel: gripLabelOf(control, list.open || typing),
    onContentCap: setCap,
    onAskNew: () => {
      list.close();
      onClose();
      control.focusInput();
    },
    listMax: cap === null ? undefined : Math.max(LIST_LEAST, cap - LIST_PADDING),
  };
}
