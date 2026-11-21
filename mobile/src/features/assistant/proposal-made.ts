/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import type { ChatBubble } from './use-chat';

// Marks the bubble whose Proposal was made into that Quest, so that the Proposal goes back with the Quest's id (P04
// ticket 19).
export function useProposalMade(
  said: { readonly current: readonly ChatBubble[] },
  show: (next: readonly ChatBubble[]) => void,
): (bubbleId: number, questId: string) => void {
  return useCallback(
    (bubbleId: number, questId: string): void => {
      show(said.current.map((bubble) => (bubble.id === bubbleId ? { ...bubble, madeQuestId: questId } : bubble)));
    },
    [said, show],
  );
}
