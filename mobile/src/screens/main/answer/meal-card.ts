/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo } from 'react';
import type { ChatBubble } from '@/features/assistant/use-chat';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { useSpokenChoice } from '@/features/assistant/use-spoken-choice';
import type { ChatSheetControl } from '../chat-sheet';
import { useRaisedForMenu } from './card-raise';

// A restaurant's menu opened from the map ("메뉴 ›" on the chosen place's label): that place chosen, and the card
// raised to its menu (board E4, `useMenuRaising`).
export function openMealMenu(control: Pick<ChatSheetControl, 'answer'>, planId: string): void {
  control.answer.openMenu(planId);
}

// Opening a restaurant's menu raises the card from low to middle, from the chosen place's "메뉴 ›" and from a row of
// the list alike, and leaves a raised card at its step (`useCardState`): at low the menu's back row and head would not
// fit the two lines low shows, and its name was cut through (P04 ticket 78, the user's phone). An answer that comes
// opened at a Restaurant's menu raises it too (`useRaisedForMenu`, P04 ticket 72).
export function useMenuRaising(
  shown: ShownAnswer,
  setRaised: (raised: boolean) => void,
  said: readonly ChatBubble[],
): ShownAnswer {
  useRaisedForMenu(shown, setRaised);
  const raising = useMemo(
    () => ({
      ...shown,
      openMenu: (planId: string): void => {
        shown.openMenu(planId);
        setRaised(true);
      },
    }),
    [shown, setRaised],
  );
  // A plan chosen in words opens as a press on its row of the list does (P05 ticket 56).
  useSpokenChoice(said, raising);
  return raising;
}
