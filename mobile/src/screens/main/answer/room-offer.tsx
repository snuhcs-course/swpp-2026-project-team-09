/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import type { ReplyOffer } from '@/api/assistant-types';
import type { QuestOffer } from '@/api/party-change-types';
import { Button } from '@/design-system';
import { turnsOf } from '@/features/assistant/turn';
import type { ChatBubble } from '@/features/assistant/use-chat';

function isRoom(offer: ReplyOffer): offer is QuestOffer {
  return offer.kind === 'quest';
}

// A change of a made 파티 the Assistant cannot make (P04 ticket 25): the latest reply's 파티 수정하기, which opens the
// 파티's room. None while the next reply is on its way.
export function roomOfferOn(bubbles: readonly ChatBubble[]): QuestOffer | null {
  for (const bubble of turnsOf(bubbles).at(-1)?.after ?? []) {
    const offer = bubble.offers?.find((one) => isRoom(one));
    if (offer !== undefined) {
      return offer;
    }
  }
  return null;
}

export function RoomOfferButton({ offer, disabled }: { offer: QuestOffer; disabled: boolean }): ReactElement {
  return (
    <Button
      disabled={disabled}
      full
      size="bar"
      onPress={() => {
        router.push(`/room/${offer.questId}`);
      }}
    >
      {offer.label}
    </Button>
  );
}
