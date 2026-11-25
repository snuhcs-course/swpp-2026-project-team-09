/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import type { ChatSheetControl } from '../chat-sheet';
import type { QuestionsOpen } from './card-questions';
import type { Raising } from './raise-handle';

// The answer card's top (P04 ticket 52): ✕, "＋ 새 대화", and the room the list of questions may take. No label stands
// under the grip (P04 ticket 61).

// The list never takes less than about two rows, and keeps the content's padding above and below it.
const LIST_LEAST = 120;
const LIST_PADDING = 24;

interface CardTop {
  onClose: (() => void) | undefined;
  onContentCap: (cap: number | null) => void;
  // "＋ 새 대화": the answer closed as ✕ closes it, then the cursor in the main map's input.
  onAskNew: () => void;
  // The list of questions' most height: what the card's scrolling part takes now, so that it ends above the input.
  listMax: number | undefined;
}

export function useCardTop(
  control: ChatSheetControl,
  raising: Raising,
  list: QuestionsOpen,
  { onClose }: { onClose: () => void },
): CardTop {
  const [cap, setCap] = useState<number | null>(null);
  return {
    onClose: raising.close,
    onContentCap: setCap,
    onAskNew: () => {
      list.close();
      onClose();
      control.focusInput();
    },
    listMax: cap === null ? undefined : Math.max(LIST_LEAST, cap - LIST_PADDING),
  };
}
