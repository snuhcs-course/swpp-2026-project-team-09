/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { sceneBubblesOf } from '@/features/assistant/scene-bubbles';
import { turnOf } from '@/features/assistant/turn';
import { BubbleParts } from '../chat-bubbles';
import type { CardActions } from '../chat-cards';
import type { ChatSheetControl } from '../chat-sheet';

// The cards of the answer the map still draws under a follow-up answered with words alone (P04 ticket 43): a seat card
// stays in the card, docked as before, so that its seat, its band, and 예약하기 beside the input go on working while
// the card says the new words. Its words are not repeated; nothing while the turn on screen draws its own scene.
export function KeptCards({
  control,
  cardActions,
}: {
  control: ChatSheetControl;
  cardActions: CardActions;
}): ReactElement | null {
  const { bubbles } = control.chat;
  const kept = turnOf(sceneBubblesOf(bubbles));
  if (kept === null || kept.id === turnOf(bubbles)?.id) {
    return null;
  }
  const carded = kept.after.filter(({ cards }) => cards.length > 0);
  return carded.length === 0 ? null : (
    <>
      {carded.map((bubble) => (
        <BubbleParts
          bubble={{ ...bubble, mapButtons: [], proposal: null }}
          cardActions={cardActions}
          key={bubble.id}
          onRetry={null}
          onShowLayer={control.leaving.showLayer}
          words={null}
        />
      ))}
    </>
  );
}
