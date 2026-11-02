/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';
import type { OwnBubble } from '@/features/assistant/use-chat';
import { seatWords, spaceWords } from '@/library/cards/bookings';
import { seatBookCardOf, seatsCardOf } from '@/library/cards/made';
import type { Slot } from '@/library/cards/payloads';

// The app's own bubbles that a library card gives: the seats card of 좌석 현황 보기, and the book card of a tapped
// seat or of 자리 예약하기.

export function seatsBubble(space: LibrarySpace, notes: string[]): OwnBubble {
  return {
    text: `${spaceWords(space)} 좌석 현황이에요.`,
    cards: [{ kind: 'library', library: seatsCardOf(space, notes) }],
  };
}

export function seatBookBubble(space: LibrarySpace, label: string | null, slot: Slot, notes: string[]): OwnBubble {
  const where = label === null ? spaceWords(space) : `${spaceWords(space)} ${seatWords(label)}`;
  return {
    text: `${where}으로 예약할까요?`,
    cards: [{ kind: 'library', library: seatBookCardOf(space, label, slot, notes) }],
  };
}
