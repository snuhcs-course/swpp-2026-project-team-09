/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ChatSheetControl } from '../chat-sheet';
import type { QuestionsOpen } from './card-questions';
import type { Raising } from './raise-handle';

// The answer card's top (P04 ticket 52): ✕ and "＋ 새 대화". No label stands under the grip (P04 ticket 61).

interface CardTop {
  onClose: (() => void) | undefined;
  // "＋ 새 대화": the answer closed as ✕ closes it, then the cursor in the main map's input.
  onAskNew: () => void;
}

export function useCardTop(
  control: ChatSheetControl,
  raising: Raising,
  list: QuestionsOpen,
  { onClose }: { onClose: () => void },
): CardTop {
  return {
    onClose: raising.close,
    onAskNew: () => {
      list.close();
      onClose();
      control.focusInput();
    },
  };
}
